/**
 * .what = whether a caught exec error is a plain "command not found" (a `which`-
 *         style probe that ran and exited non-zero → `error.status` is a number),
 *         vs a genuine spawn/permission fault
 * .why = the `which` probes (isSshAgentAvailable, isAgeCliAvailable, the askpass
 *        PATH lookup) want to treat "not on PATH" as a false/null result, but must
 *        NOT swallow a real fault — `which` itself absent (ENOENT on spawn), a
 *        signal, or a permission error has no numeric `.status`, so it surfaces
 *        loud (rule.forbid.failhide)
 *
 * .note = shared by all three `which`-probe call sites (the rule-of-three
 *         extraction); lives in infra/ssh, the shared ssh infra all layers reach
 */
export const isCommandNotFoundError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'status' in error &&
  typeof (error as { status: unknown }).status === 'number';
