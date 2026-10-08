/**
 * .what = an fs errno fixture — a bare `Error` with a string `code`, the shape node's fs throws
 * .why = the fault classifiers (`isWalkVanishFault`, `isActorHookSyncFault`) and the hook-sync
 *   report each grade an unclassified fs errno, so they share one specimen shape
 * .note = a bare `Error` by design: node throws an errno unclassified, so a leaf here would
 *   never exercise the errno arm (the `src/.test/` specimen carve-out of
 *   `rule.forbid.helpful-error-parents`)
 */
export const genSampleErrnoError = (input: {
  code: string;
  message?: string;
}): Error =>
  Object.assign(new Error(input.message ?? `${input.code}: a fault`), {
    code: input.code,
  });
