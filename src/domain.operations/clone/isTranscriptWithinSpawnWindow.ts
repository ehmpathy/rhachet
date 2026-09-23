import type { IsoTimeStamp } from 'iso-time';

import { CLONE_SPAWN_WINDOW_TOLERANCE_MS } from './constants';

/**
 * .what = was a transcript CREATED at or after this clone's spawn?
 * .why =
 *   - a clone's history must link only transcripts of ITS OWN session, never a
 *     PRIOR or CONCURRENT session's that shares the same cwd. the spawn-window
 *     predicate is the first filter: a transcript created before this clone
 *     spawned cannot be ours
 *   - ONE pure owner of this rule, shared by two consumers: `genCloneHistoryLink`
 *     (which candidate to link) and `getCloneOutput` (which quarantine marker is
 *     ours to warn about). a single predicate keeps the two from drift
 *
 * .note = creation is read first, modification only as a FALLBACK. a mtime-only
 *   window can never exclude a CONCURRENT parent's transcript: the parent writes
 *   every turn, so its mtime is always "now" and always inside a child's window.
 *   measured 2026-09-16 — a peer clone adopted its parent's live transcript and
 *   rendered the parent's own turns as the clone's talk, which also forges a
 *   `released` say verdict off the parent's transcript rise
 * .note = a small negative tolerance (CLONE_SPAWN_WINDOW_TOLERANCE_MS) absorbs
 *   clock + fs-granularity skew, so a transcript created a hair before the recorded
 *   spawnedAt still counts. this is a NECESSARY-not-sufficient filter — the atomic
 *   `.exids/` claim + the ambiguous-refuse guard settle WHICH in-window transcript
 *   is ours
 * .note = a birthtime is TRUSTWORTHY only when it is present, non-zero, and no later
 *   than the mtime — a file cannot be written before it was created, so a birthtime
 *   past its mtime is a filesystem that reports a stamp it does not keep. on every
 *   untrustworthy read the predicate falls back to mtime, which is exactly the
 *   behavior that predates this fix: creation is read where it is knowable, and
 *   candidacy is never widened where it is not
 */
export const isTranscriptWithinSpawnWindow = (input: {
  transcriptBirthtimeMs: number | null;
  transcriptMtimeMs: number;
  spawnedAt: IsoTimeStamp;
}): boolean => {
  const spawnedAtMs = Date.parse(input.spawnedAt);

  // prefer creation: it is fixed for the life of the file, so a live peer's
  // transcript cannot walk into our window on the strength of a fresh write
  const observedAtMs =
    input.transcriptBirthtimeMs !== null &&
    input.transcriptBirthtimeMs > 0 &&
    input.transcriptBirthtimeMs <= input.transcriptMtimeMs
      ? input.transcriptBirthtimeMs
      : input.transcriptMtimeMs;

  return observedAtMs >= spawnedAtMs - CLONE_SPAWN_WINDOW_TOLERANCE_MS;
};
