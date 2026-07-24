import { GH_STDERR_MARKERS_FORBIDDEN } from './ghStderrMarkers';

/**
 * .what = decide whether gh stderr indicates a genuine permission denial (403)
 * .why = a member's org-installations call is forbidden (403); we must not confuse
 *        that with transient failures (network, rate limit) which should fail loud
 *
 * .note = the matched substrings are pinned in ghStderrMarkers (with a gh-version cite)
 */
export const isGhForbiddenStderr = (input: { stderr: string }): boolean => {
  const stderr = input.stderr.toLowerCase();
  return GH_STDERR_MARKERS_FORBIDDEN.some((marker) => stderr.includes(marker));
};
