import { asIsoTimeStamp } from 'iso-time';
import { genTempDir, given, then, when } from 'test-fns';
import { getUuid } from 'uuid-fns';

import { mkdirSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getAmbiguousExidsWithinSpawnWindow } from './getAmbiguousExidsWithinSpawnWindow';

const spawnedAt = asIsoTimeStamp(new Date(Date.now() - 5_000).toISOString());

/**
 * .what = plant a quarantine marker (`.exids/<exid>.ambiguous`) → an in-window transcript
 */
const genAmbiguousMarker = (input: {
  actorsRoot: string;
  transcriptsDir: string;
  exid: string;
}): void => {
  mkdirSync(input.transcriptsDir, { recursive: true });
  const transcriptPath = join(input.transcriptsDir, `${input.exid}.jsonl`);
  writeFileSync(transcriptPath, 'x\n', 'utf8');

  const exidsDir = join(input.actorsRoot, '.exids');
  mkdirSync(exidsDir, { recursive: true });
  symlinkSync(transcriptPath, join(exidsDir, `${input.exid}.ambiguous`));
};

describe('getAmbiguousExidsWithinSpawnWindow.integration', () => {
  given('[case1] a quarantined marker within THIS spawn window', () => {
    when('[t0] the ambiguous exids are read', () => {
      then('the in-window exid is surfaced', () => {
        const root = genTempDir({ slug: 'ambigInWindow' });
        const actorsRoot = join(root, 'actors');
        const transcriptsDir = join(root, 'transcripts');
        const exid = getUuid();
        genAmbiguousMarker({ actorsRoot, transcriptsDir, exid });

        const out = getAmbiguousExidsWithinSpawnWindow({
          actorsRoot,
          transcriptDir: transcriptsDir,
          spawnedAt,
        });
        expect(out).toEqual([exid]);
      });
    });
  });

  given('[case2] a quarantined marker OUTSIDE the spawn window', () => {
    when('[t0] the ambiguous exids are read', () => {
      then('the stale exid is not ours to warn about, so it is skipped', () => {
        const root = genTempDir({ slug: 'ambigStale' });
        const actorsRoot = join(root, 'actors');
        const transcriptsDir = join(root, 'transcripts');
        const exid = getUuid();
        genAmbiguousMarker({ actorsRoot, transcriptsDir, exid });
        // shove the transcript mtime far before the spawn window
        utimesSync(join(transcriptsDir, `${exid}.jsonl`), 1_000_000, 1_000_000);

        const out = getAmbiguousExidsWithinSpawnWindow({
          actorsRoot,
          transcriptDir: transcriptsDir,
          spawnedAt,
        });
        expect(out).toEqual([]);
      });
    });
  });

  given('[case3] a marker whose symlink target vanished', () => {
    when('[t0] the ambiguous exids are read', () => {
      then('the gone-target marker is silently skipped, never a throw', () => {
        const root = genTempDir({ slug: 'ambigGoneTarget' });
        const actorsRoot = join(root, 'actors');
        const exidsDir = join(actorsRoot, '.exids');
        mkdirSync(exidsDir, { recursive: true });
        const exid = getUuid();
        // the marker's target dir IS this clone's transcript dir, so the read
        // reaches the statSync (which throws ENOENT for the gone target) and the
        // ENOENT skip is exercised — never a throw, never a false surface
        const transcriptDir = join(root, 'gone');
        symlinkSync(
          join(transcriptDir, `${exid}.jsonl`),
          join(exidsDir, `${exid}.ambiguous`),
        );

        const out = getAmbiguousExidsWithinSpawnWindow({
          actorsRoot,
          transcriptDir,
          spawnedAt,
        });
        expect(out).toEqual([]);
      });
    });
  });

  given('[case4] no .exids dir at all', () => {
    when('[t0] the ambiguous exids are read', () => {
      then('an empty list comes back, never a throw', () => {
        const root = genTempDir({ slug: 'ambigAbsent' });
        const out = getAmbiguousExidsWithinSpawnWindow({
          actorsRoot: join(root, 'actors'),
          transcriptDir: join(root, 'transcripts'),
          spawnedAt,
        });
        expect(out).toEqual([]);
      });
    });
  });

  given(
    '[case5] a FOREIGN marker (its transcript is in a different brain/cwd dir)',
    () => {
      when('[t0] the ambiguous exids are read for THIS clone', () => {
        then(
          'the foreign marker is EXCLUDED — no false shared-cwd surface',
          () => {
            // the `.exids/*.ambiguous` index is repo-wide, so a marker from an unrelated
            // actor/brain/cwd sits in the same index. within the spawn window, the mtime
            // filter alone would falsely surface it; the transcript-dir scope excludes it
            const root = genTempDir({ slug: 'ambigForeign' });
            const actorsRoot = join(root, 'actors');
            const foreignDir = join(root, 'transcripts-foreign');
            const myDir = join(root, 'transcripts-mine');
            const exid = getUuid();
            genAmbiguousMarker({
              actorsRoot,
              transcriptsDir: foreignDir,
              exid,
            });

            const out = getAmbiguousExidsWithinSpawnWindow({
              actorsRoot,
              transcriptDir: myDir, // differs from where the foreign marker points
              spawnedAt,
            });
            expect(out).toEqual([]);
          },
        );
      });
    },
  );

  given(
    '[case6] a brain with no transcript layout (null transcriptDir)',
    () => {
      when('[t0] the ambiguous exids are read', () => {
        then(
          'an empty list comes back — a brain owns no marker of its own',
          () => {
            const root = genTempDir({ slug: 'ambigNullDir' });
            const actorsRoot = join(root, 'actors');
            const transcriptsDir = join(root, 'transcripts');
            const exid = getUuid();
            // even with a valid in-window marker present, a null transcriptDir owns none
            genAmbiguousMarker({ actorsRoot, transcriptsDir, exid });

            const out = getAmbiguousExidsWithinSpawnWindow({
              actorsRoot,
              transcriptDir: null,
              spawnedAt,
            });
            expect(out).toEqual([]);
          },
        );
      });
    },
  );
});
