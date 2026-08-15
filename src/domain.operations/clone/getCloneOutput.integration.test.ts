import { asIsoTimeStamp } from 'iso-time';
import { genTempDir, given, then, useThen, when } from 'test-fns';
import { getUuid } from 'uuid-fns';

import { mkdirSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getCloneOutput } from './getCloneOutput';

const assistantLine = (text: string): string =>
  JSON.stringify({
    type: 'assistant',
    message: { content: [{ type: 'text', text }] },
  });

// a real inbound turn — a dispatched `say` / a human turn (direction:'in')
const userLine = (text: string): string =>
  JSON.stringify({
    type: 'user',
    message: { content: [{ type: 'text', text }] },
  });

// a user record carrying only a tool_result — no turn text, so it drops to null
const toolResultLine = (): string =>
  JSON.stringify({
    type: 'user',
    message: { content: [{ type: 'tool_result', content: 'x' }] },
  });

/**
 * .what = write a transcript file + link it into a clone's history dir
 */
const genEpisode = (input: {
  transcriptsDir: string;
  cloneDir: string;
  exid: string;
  content: string;
  mtimeSec?: number;
}): void => {
  mkdirSync(input.transcriptsDir, { recursive: true });
  const transcriptPath = join(input.transcriptsDir, `${input.exid}.jsonl`);
  writeFileSync(transcriptPath, input.content, 'utf8');
  if (input.mtimeSec !== undefined)
    utimesSync(transcriptPath, input.mtimeSec, input.mtimeSec);

  const historyDir = join(input.cloneDir, 'history');
  mkdirSync(historyDir, { recursive: true });
  symlinkSync(transcriptPath, join(historyDir, `${input.exid}.jsonl`));
};

const spawnedAt = asIsoTimeStamp(new Date(Date.now() - 5_000).toISOString());

describe('getCloneOutput.integration', () => {
  given(
    '[case1] a transcript that interleaves an inbound say, assistant replies, and a tool result',
    () => {
      const scene = useThen('the output is read', () => {
        const root = genTempDir({ slug: 'outDirectioned' });
        const cloneDir = join(root, 'clone');
        const actorsRoot = join(root, 'actors');
        genEpisode({
          transcriptsDir: join(root, 'transcripts'),
          cloneDir,
          exid: getUuid(),
          content:
            [
              userLine('do the thing'), // direction:'in'
              assistantLine('first'), // direction:'out'
              toolResultLine(), // null — a textless tool result
              assistantLine('second'), // direction:'out'
            ].join('\n') + '\n',
        });
        return { cloneDir, actorsRoot };
      });

      when('[t0] tailed with no bound', () => {
        then(
          'the say and both replies survive as directioned messages, tool result dropped',
          () => {
            const out = getCloneOutput({
              cloneDir: scene.cloneDir,
              actorsRoot: scene.actorsRoot,
              transcriptDir: null,
              spawnedAt,
              tail: 'all',
            });
            // directions preserved in transcript order: in → out → out
            expect(out.messages).toEqual([
              { direction: 'in', text: 'do the thing', at: null },
              { direction: 'out', text: 'first', at: null },
              { direction: 'out', text: 'second', at: null },
            ]);
            expect(out.total).toEqual(3);
            expect(out.truncated).toBe(false);
          },
        );
      });

      when('[t1] tailed to the last 1 LOGICAL message', () => {
        then(
          'it returns the last reply, never an empty tool-result line',
          () => {
            const out = getCloneOutput({
              cloneDir: scene.cloneDir,
              actorsRoot: scene.actorsRoot,
              transcriptDir: null,
              spawnedAt,
              tail: 1,
            });
            expect(out.messages).toEqual([
              { direction: 'out', text: 'second', at: null },
            ]);
            expect(out.total).toEqual(3);
            expect(out.truncated).toBe(true);
          },
        );
      });

      when('[t2] tailed to 0 (a bound the cli accepts as legal)', () => {
        then('it returns ZERO messages, not the whole array', () => {
          // `slice(-0)` === `slice(0)` returns the WHOLE array — an unguarded slice
          // would dump the full transcript for `--tail 0`, the opposite of its intent.
          // the guard returns the empty read, and `truncated` honestly reports the clip
          const out = getCloneOutput({
            cloneDir: scene.cloneDir,
            actorsRoot: scene.actorsRoot,
            transcriptDir: null,
            spawnedAt,
            tail: 0,
          });
          expect(out.messages).toEqual([]);
          expect(out.total).toEqual(3);
          expect(out.truncated).toBe(true);
        });
      });
    },
  );

  given('[case2] two episodes with distinct mtimes', () => {
    when('[t0] the output is read', () => {
      then('messages are merged oldest-episode-first', () => {
        const root = genTempDir({ slug: 'outMerge' });
        const cloneDir = join(root, 'clone');
        const transcriptsDir = join(root, 'transcripts');
        genEpisode({
          transcriptsDir,
          cloneDir,
          exid: getUuid(),
          content: assistantLine('older') + '\n',
          mtimeSec: 1_000_000,
        });
        genEpisode({
          transcriptsDir,
          cloneDir,
          exid: getUuid(),
          content: assistantLine('newer') + '\n',
          mtimeSec: 2_000_000,
        });

        const out = getCloneOutput({
          cloneDir,
          actorsRoot: join(root, 'actors'),
          transcriptDir: null,
          spawnedAt,
          tail: 'all',
        });
        expect(out.messages).toEqual([
          { direction: 'out', text: 'older', at: null },
          { direction: 'out', text: 'newer', at: null },
        ]);
      });
    });
  });

  given(
    '[case3] a transcript whose FINAL line is torn (no closing newline)',
    () => {
      when('[t0] the output is read', () => {
        then(
          'the torn line is held back — a completeness lag never reads as corrupt',
          () => {
            const root = genTempDir({ slug: 'outTorn' });
            const cloneDir = join(root, 'clone');
            // a complete assistant line, then a TORN half-written json line, no newline
            const content = assistantLine('done') + '\n' + '{"type":"assist';
            genEpisode({
              transcriptsDir: join(root, 'transcripts'),
              cloneDir,
              exid: getUuid(),
              content,
            });

            const out = getCloneOutput({
              cloneDir,
              actorsRoot: join(root, 'actors'),
              transcriptDir: null,
              spawnedAt,
              tail: 'all',
            });
            expect(out.messages).toEqual([
              { direction: 'out', text: 'done', at: null },
            ]);
          },
        );
      });
    },
  );

  given('[case4] a history symlink whose target has vanished', () => {
    when('[t0] the output is read', () => {
      then(
        'the vanished episode is reported in exidsUnreadable, never hidden',
        () => {
          const root = genTempDir({ slug: 'outVanished' });
          const cloneDir = join(root, 'clone');
          const historyDir = join(cloneDir, 'history');
          mkdirSync(historyDir, { recursive: true });
          const exid = getUuid();
          symlinkSync(
            join(root, 'gone', `${exid}.jsonl`),
            join(historyDir, `${exid}.jsonl`),
          );

          const out = getCloneOutput({
            cloneDir,
            actorsRoot: join(root, 'actors'),
            transcriptDir: null,
            spawnedAt,
            tail: 'all',
          });
          expect(out.messages).toEqual([]);
          expect(out.exidsUnreadable).toEqual([exid]);
        },
      );
    });
  });

  given('[case5] a quarantined-ambiguous exid within THIS spawn window', () => {
    when(
      '[t0] the marker`s transcript is in THIS clone`s transcript dir',
      () => {
        then(
          'the empty history is EXPLAINED via exidsAmbiguous (the same-cwd-race warn)',
          () => {
            const root = genTempDir({ slug: 'outAmbiguous' });
            const cloneDir = join(root, 'clone');
            const actorsRoot = join(root, 'actors');
            const transcriptsDir = join(root, 'transcripts');
            mkdirSync(transcriptsDir, { recursive: true });
            const exid = getUuid();
            const transcriptPath = join(transcriptsDir, `${exid}.jsonl`);
            writeFileSync(transcriptPath, assistantLine('x') + '\n', 'utf8');

            // a quarantine marker → an in-window transcript (what the linker's refuse writes)
            const exidsDir = join(actorsRoot, '.exids');
            mkdirSync(exidsDir, { recursive: true });
            symlinkSync(transcriptPath, join(exidsDir, `${exid}.ambiguous`));

            const out = getCloneOutput({
              cloneDir,
              actorsRoot,
              // this clone's own transcript dir == where the marker's target lives
              transcriptDir: transcriptsDir,
              spawnedAt,
              tail: 'all',
            });
            expect(out.messages).toEqual([]);
            expect(out.exidsAmbiguous).toEqual([exid]);
          },
        );
      },
    );

    when('[t1] the marker`s transcript is in a DIFFERENT (foreign) dir', () => {
      then(
        'the foreign marker is EXCLUDED — no false shared-cwd diagnosis',
        () => {
          // the `.exids/*.ambiguous` index is repo-wide, so a marker from an unrelated
          // actor/brain/cwd can sit in the same index within the spawn window. it must
          // NOT be attributed to this clone — the scope is this clone's transcript dir
          const root = genTempDir({ slug: 'outAmbiguousForeign' });
          const cloneDir = join(root, 'clone');
          const actorsRoot = join(root, 'actors');
          const myTranscriptsDir = join(root, 'transcripts-mine');
          const foreignTranscriptsDir = join(root, 'transcripts-foreign');
          mkdirSync(foreignTranscriptsDir, { recursive: true });
          const exid = getUuid();
          const foreignTranscript = join(
            foreignTranscriptsDir,
            `${exid}.jsonl`,
          );
          writeFileSync(foreignTranscript, assistantLine('x') + '\n', 'utf8');

          const exidsDir = join(actorsRoot, '.exids');
          mkdirSync(exidsDir, { recursive: true });
          symlinkSync(foreignTranscript, join(exidsDir, `${exid}.ambiguous`));

          const out = getCloneOutput({
            cloneDir,
            actorsRoot,
            // this clone's transcript dir differs from where the foreign marker points
            transcriptDir: myTranscriptsDir,
            spawnedAt,
            tail: 'all',
          });
          expect(out.messages).toEqual([]);
          // the foreign marker is out of scope — never reported as ours
          expect(out.exidsAmbiguous).toEqual([]);
        },
      );
    });
  });
});
