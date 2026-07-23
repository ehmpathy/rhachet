/**
 * .what = decides whether an argv token is the `--roles` option flag (long form
 *         or its `-r` short alias)
 * .why = the roles flag is exposed under two forms, and MORE than one place needs
 *        to recognize it — the argv preprocess (getPreprocessedRoleArgv, to open a
 *        value run) and the enroll passthrough filter (filterOutRolesArg, to strip it
 *        before it reaches the brain). a single shared predicate keeps the two forms in
 *        exactly one place, so a future alias change cannot diverge across copies —
 *        the very divergence class that produced the `-r` regression.
 *
 * .note = the `--roles=<value>` joined form is a DIFFERENT single token and is handled
 *   separately by its own consumers; this predicate matches only the bare flag tokens.
 * .note = pure transformer — no i/o, deterministic.
 */
export const isRolesFlag = (input: { token: string }): boolean =>
  input.token === '--roles' || input.token === '-r';
