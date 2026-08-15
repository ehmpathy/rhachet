import type { IsoTimeStamp } from 'iso-time';

import { CLONE_SPAWN_WINDOW_TOLERANCE_MS } from './constants';

/**
 * .what = does a transcript's mtime place it AT OR AFTER this clone's spawn?
 * .why =
 *   - a clone's history must link only transcripts of ITS OWN session, never a
 *     PRIOR session's that shares the same cwd. the spawn-window predicate is the
 *     first filter: a transcript created before this clone spawned cannot be ours
 *   - ONE pure owner of this rule, shared by two consumers: `genCloneHistoryLink`
 *     (which candidate to link) and `getCloneOutput` (which quarantine marker is
 *     ours to warn about). a single predicate keeps the two from drift
 *
 * .note = a small negative tolerance (CLONE_SPAWN_WINDOW_TOLERANCE_MS) absorbs
 *   clock + fs-granularity skew, so a transcript created a hair before the recorded
 *   spawnedAt still counts. this is a NECESSARY-not-sufficient filter — the atomic
 *   `.exids/` claim + the ambiguous-refuse guard settle WHICH in-window transcript
 *   is ours
 */
export const isTranscriptWithinSpawnWindow = (input: {
  transcriptMtimeMs: number;
  spawnedAt: IsoTimeStamp;
}): boolean => {
  const spawnedAtMs = Date.parse(input.spawnedAt);
  return (
    input.transcriptMtimeMs >= spawnedAtMs - CLONE_SPAWN_WINDOW_TOLERANCE_MS
  );
};
