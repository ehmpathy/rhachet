import { GH_STDERR_MARKERS_WRITE_CONFLICT } from './ghStderrMarkers';

/**
 * .what = decide whether gh stderr indicates an optimistic-concurrency write conflict
 * .why = a findsert-style write can lose a race: a concurrent create makes the second
 *        PUT 422, a concurrent update makes it 409 (stale sha). both mean "someone
 *        wrote first", so the caller can re-read + retry rather than a hard failure
 *
 * .note = the matched substrings are pinned in ghStderrMarkers (with a gh-version cite)
 */
export const isGhWriteConflictStderr = (input: { stderr: string }): boolean => {
  const stderr = input.stderr.toLowerCase();
  return GH_STDERR_MARKERS_WRITE_CONFLICT.some((marker) =>
    stderr.includes(marker),
  );
};
