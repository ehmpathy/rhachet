import { asIsoTimeStamp } from 'iso-time';
import { genTempDir, given, then, when } from 'test-fns';
import { getUuid } from 'uuid-fns';

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { asClaudeProjectSlug } from './asClaudeProjectSlug';
import { genCloneHistoryLink } from './genCloneHistoryLink';

/**
 * .what = write a fake claude transcript for one cwd under a temp config dir
 */
const genTranscript = (input: {
  configDir: string;
  cwd: string;
  exid: string;
}): string => {
  const projectDir = join(
    input.configDir,
    'projects',
    asClaudeProjectSlug({ cwd: input.cwd }),
  );
  mkdirSync(projectDir, { recursive: true });
  const path = join(projectDir, `${input.exid}.jsonl`);
  writeFileSync(
    path,
    JSON.stringify({
      type: 'assistant',
      message: { content: [{ type: 'text', text: 'hi' }] },
    }) + '\n',
    'utf8',
  );
  return path;
};

/**
 * .what = run genCloneHistoryLink with $CLAUDE_CONFIG_DIR pointed at a temp dir
 */
const runWithConfigDir = <T>(configDir: string, fn: () => T): T => {
  const prior = process.env['CLAUDE_CONFIG_DIR'];
  process.env['CLAUDE_CONFIG_DIR'] = configDir;
  try {
    return fn();
  } finally {
    if (prior === undefined) delete process.env['CLAUDE_CONFIG_DIR'];
    else process.env['CLAUDE_CONFIG_DIR'] = prior;
  }
};

const spawnedAt = asIsoTimeStamp(new Date(Date.now() - 1_000).toISOString());

describe('genCloneHistoryLink.integration', () => {
  given('[case1] exactly ONE in-window transcript for this cwd', () => {
    when('[t0] the history link runs', () => {
      then('it links the transcript + claims the exid, ambiguous empty', () => {
        const root = genTempDir({ slug: 'histOne' });
        const configDir = join(root, 'config');
        const actorsRoot = join(root, 'actors');
        const cloneDir = join(actorsRoot, 'clone');
        const cwd = '/work/one';
        const exid = getUuid();
        genTranscript({ configDir, cwd, exid });

        const result = runWithConfigDir(configDir, () =>
          genCloneHistoryLink({
            cloneDir,
            actorsRoot,
            cwd,
            brain: 'claude',
            spawnedAt,
          }),
        );

        expect(result.linked).toEqual(exid);
        expect(result.ambiguous).toEqual([]);
        // the history symlink + the atomic exid claim both exist
        expect(existsSync(join(cloneDir, 'history', `${exid}.jsonl`))).toBe(
          true,
        );
        expect(existsSync(join(actorsRoot, '.exids', exid))).toBe(true);
      });
    });
  });

  given('[case2] TWO co-located transcripts race in one cwd', () => {
    when('[t0] the history link runs', () => {
      then(
        'it REFUSES to link and quarantines BOTH candidates (the privacy + convergence guard)',
        () => {
          const root = genTempDir({ slug: 'histTwo' });
          const configDir = join(root, 'config');
          const actorsRoot = join(root, 'actors');
          const cloneDir = join(actorsRoot, 'clone');
          const cwd = '/work/two';
          const exidA = getUuid();
          const exidB = getUuid();
          genTranscript({ configDir, cwd, exid: exidA });
          genTranscript({ configDir, cwd, exid: exidB });

          const result = runWithConfigDir(configDir, () =>
            genCloneHistoryLink({
              cloneDir,
              actorsRoot,
              cwd,
              brain: 'claude',
              spawnedAt,
            }),
          );

          expect(result.linked).toBeNull();
          expect(result.ambiguous.sort()).toEqual([exidA, exidB].sort());
          // no history link, but a durable quarantine marker per candidate (dogfood:
          // these markers are what a later `get` reads to warn — revert the write and
          // the ambiguous WARN goes silent)
          expect(existsSync(join(cloneDir, 'history'))).toBe(false);
          expect(
            existsSync(join(actorsRoot, '.exids', `${exidA}.ambiguous`)),
          ).toBe(true);
          expect(
            existsSync(join(actorsRoot, '.exids', `${exidB}.ambiguous`)),
          ).toBe(true);
        },
      );
    });
  });

  given('[case3] a brain with no transcript adapter', () => {
    when('[t0] the history link runs', () => {
      then('it links no transcript (per-brain: no observe adapter)', () => {
        const root = genTempDir({ slug: 'histNoBrain' });
        const actorsRoot = join(root, 'actors');
        const cloneDir = join(actorsRoot, 'clone');
        const result = genCloneHistoryLink({
          cloneDir,
          actorsRoot,
          cwd: '/work/x',
          brain: 'codex',
          spawnedAt,
        });
        expect(result.linked).toBeNull();
        expect(result.ambiguous).toEqual([]);
      });
    });
  });

  given('[case4] the claim is idempotent (findsert)', () => {
    when('[t0] the same single transcript is linked twice', () => {
      then(
        'the second run is a no-op — the claim excludes the already-linked exid',
        () => {
          const root = genTempDir({ slug: 'histIdem' });
          const configDir = join(root, 'config');
          const actorsRoot = join(root, 'actors');
          const cloneDir = join(actorsRoot, 'clone');
          const cwd = '/work/idem';
          const exid = getUuid();
          genTranscript({ configDir, cwd, exid });

          const first = runWithConfigDir(configDir, () =>
            genCloneHistoryLink({
              cloneDir,
              actorsRoot,
              cwd,
              brain: 'claude',
              spawnedAt,
            }),
          );
          const second = runWithConfigDir(configDir, () =>
            genCloneHistoryLink({
              cloneDir,
              actorsRoot,
              cwd,
              brain: 'claude',
              spawnedAt,
            }),
          );

          expect(first.linked).toEqual(exid);
          expect(second.linked).toBeNull();
          expect(second.ambiguous).toEqual([]);
        },
      );
    });
  });
});
