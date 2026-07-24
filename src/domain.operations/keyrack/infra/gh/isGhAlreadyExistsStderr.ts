import { GH_STDERR_MARKERS_ALREADY_EXISTS } from './ghStderrMarkers';

/**
 * .what = decide whether gh stderr indicates the resource already exists (422)
 * .why = under concurrency a findsert can lose a toctou race: two callers both see
 *        the repo absent, both create, and github rejects the loser with 422. that
 *        is a benign signal the loser can treat as "found", not a hard failure
 *
 * .note = the matched substrings are pinned in ghStderrMarkers (with a gh-version cite)
 */
export const isGhAlreadyExistsStderr = (input: { stderr: string }): boolean => {
  const stderr = input.stderr.toLowerCase();
  return GH_STDERR_MARKERS_ALREADY_EXISTS.some((marker) =>
    stderr.includes(marker),
  );
};
