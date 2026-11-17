import { genTempDir, given, then, when } from 'test-fns';

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getCloneTranscriptProgress } from './getCloneTranscriptProgress';

/**
 * .what = a clone dir whose `history/` holds one transcript of the given lines
 * .why = the progress read classifies rows off the transcript a clone links; a fixture per case
 *   pins which rows count as a sent request and which as an answer
 */
const genCloneDirWithTranscript = (input: {
  slug: string;
  lines: string[];
}): string => {
  const cloneDir = genTempDir({ slug: input.slug });
  mkdirSync(join(cloneDir, 'history'), { recursive: true });
  writeFileSync(
    join(cloneDir, 'history', 'exid-1.jsonl'),
    input.lines.join('\n'),
  );
  return cloneDir;
};

const ROW_META = JSON.stringify({ type: 'user', isMeta: true });
const ROW_MODE = JSON.stringify({ type: 'permission-mode' });
const ROW_PROMPT = JSON.stringify({ type: 'user', message: { content: 'hi' } });
const ROW_ANSWER = JSON.stringify({
  type: 'assistant',
  message: { id: 'msg_a' },
});

describe('getCloneTranscriptProgress', () => {
  given('[case1] a clone with no history dir', () => {
    when('[t0] its progress is read', () => {
      then('it has neither started nor been answered', () => {
        const cloneDir = genTempDir({ slug: 'progress-nohistory' });
        expect(getCloneTranscriptProgress({ cloneDir })).toEqual({
          started: false,
          answered: false,
        });
      });
    });
  });

  given(
    '[case2] a transcript of only mode and meta rows, as claude writes before a request',
    () => {
      when('[t0] its progress is read', () => {
        then('it has not started: a meta row is no sent request', () => {
          const cloneDir = genCloneDirWithTranscript({
            slug: 'progress-meta',
            lines: [ROW_MODE, ROW_META],
          });
          expect(getCloneTranscriptProgress({ cloneDir })).toEqual({
            started: false,
            answered: false,
          });
        });
      });
    },
  );

  given('[case3] a transcript with a prompt row and no answer', () => {
    when('[t0] its progress is read', () => {
      then('it has started and is not yet answered', () => {
        const cloneDir = genCloneDirWithTranscript({
          slug: 'progress-started',
          lines: [ROW_MODE, ROW_PROMPT],
        });
        expect(getCloneTranscriptProgress({ cloneDir })).toEqual({
          started: true,
          answered: false,
        });
      });
    });
  });

  given('[case4] a transcript with a prompt row and an assistant row', () => {
    when('[t0] its progress is read', () => {
      then('it has started and been answered', () => {
        const cloneDir = genCloneDirWithTranscript({
          slug: 'progress-answered',
          lines: [ROW_PROMPT, ROW_ANSWER],
        });
        expect(getCloneTranscriptProgress({ cloneDir })).toEqual({
          started: true,
          answered: true,
        });
      });
    });
  });

  given('[case5] a transcript whose last line is partial, mid-write', () => {
    when('[t0] its progress is read', () => {
      then('the partial line is skipped, never a fault', () => {
        const cloneDir = genCloneDirWithTranscript({
          slug: 'progress-partial',
          lines: [ROW_PROMPT, '{"type":"assistant",'],
        });
        expect(getCloneTranscriptProgress({ cloneDir })).toEqual({
          started: true,
          answered: false,
        });
      });
    });
  });
});
