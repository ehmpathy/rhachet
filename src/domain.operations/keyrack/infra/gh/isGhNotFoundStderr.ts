import { GH_STDERR_MARKERS_NOT_FOUND } from './ghStderrMarkers';

/**
 * .what = decide whether gh stderr indicates a genuine "not found" (404)
 * .why = an absent repo/file is an expected, benign absence; transient failures
 *        (network, rate limit, 500) must NOT be mistaken for absence, or a caller
 *        could recreate/overwrite state that actually exists but was unreachable
 *
 * .note = the matched substrings are pinned in ghStderrMarkers (with a gh-version cite)
 */
export const isGhNotFoundStderr = (input: { stderr: string }): boolean => {
  const stderr = input.stderr.toLowerCase();
  return GH_STDERR_MARKERS_NOT_FOUND.some((marker) => stderr.includes(marker));
};
