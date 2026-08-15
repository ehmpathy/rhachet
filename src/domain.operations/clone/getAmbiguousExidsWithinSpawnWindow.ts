import type { IsoTimeStamp } from 'iso-time';

import { getActorsIndexDir } from '@src/domain.operations/actor/enrolled/getActorsIndexDir';

import { existsSync, readdirSync, readlinkSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { isTranscriptWithinSpawnWindow } from './isTranscriptWithinSpawnWindow';

/**
 * .what = read the quarantined-ambiguous exid markers (`.exids/*.ambiguous`) and keep
 *   only those that are plausibly THIS clone's own — the marker's transcript must sit
 *   in this clone's transcript dir (its brain + cwd) AND fall within its spawn window
 * .why =
 *   - `getCloneOutput` warns "empty because the cwd was shared" only when the
 *     history-link REFUSED to guess between two co-located clones and quarantined the
 *     candidates; a name for this read keeps that orchestrator a narrative line instead
 *     of a four-stage inline readdir→filter→map→filter pipeline the reader must
 *     simulate (rule.require.named-transformers)
 *   - the `.exids/*.ambiguous` index is REPO-WIDE (one index under `actorsRoot`, shared
 *     across every actor + brain + cwd), so the spawn-window mtime filter ALONE would
 *     match a marker from a wholly unrelated actor/brain/cwd whose transcript happens to
 *     land in the window — a FALSE "you shared a cwd" diagnosis. the write side scopes
 *     its candidates to one `transcriptDir` (getBrainTranscriptDir({brain, cwd})); this
 *     read must apply the SAME scope, else the two halves disagree. so we keep only a
 *     marker whose target lives in this clone's own transcript dir
 *   - the spawn-window filter then scopes to markers that could plausibly be this
 *     clone's own run — a stale marker from an earlier run in the SAME dir is not ours
 *
 * .note = a brain with no known transcript layout (null dir) has no transcript of its
 *   own to be quarantined, so it warns about none — return empty
 * .note = a marker whose symlink target vanished is silently skipped — it carries no
 *   evidence for this clone, so it neither warns nor throws (a soft, bounded skip)
 */
export const getAmbiguousExidsWithinSpawnWindow = (input: {
  actorsRoot: string;
  transcriptDir: string | null;
  spawnedAt: IsoTimeStamp;
}): string[] => {
  // a brain with no transcript layout owns no marker — none to warn about
  if (input.transcriptDir === null) return [];

  const exidsDir = getActorsIndexDir({
    actorsRoot: input.actorsRoot,
    index: 'exids',
  });

  if (!existsSync(exidsDir)) return [];

  return readdirSync(exidsDir)
    .filter((name) => name.endsWith('.ambiguous'))
    .map((name) => ({
      exid: name.slice(0, -'.ambiguous'.length),
      markerPath: join(exidsDir, name),
    }))
    .filter((marker) => {
      try {
        const transcriptPath = readlinkSync(marker.markerPath);
        // scope to THIS clone's transcript dir: a marker whose transcript lives in a
        // DIFFERENT brain/cwd dir belongs to another clone, never ours
        if (dirname(transcriptPath) !== input.transcriptDir) return false;
        return isTranscriptWithinSpawnWindow({
          transcriptMtimeMs: statSync(transcriptPath).mtimeMs,
          spawnedAt: input.spawnedAt,
        });
      } catch (error) {
        // a vanished marker/target (ENOENT) carries no evidence — skip it.
        // ANY other fault (EACCES, EIO, …) is unexpected: rethrow it loud rather
        // than hide a real permission/io problem behind a false skip (failhide).
        if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') return false;
        throw error;
      }
    })
    .map((marker) => marker.exid);
};
