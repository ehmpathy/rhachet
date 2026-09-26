/**
 * .what = wrap a value in shell single-quotes, safe against embedded single-quotes
 * .why  = a path baked into a generated shim must be quoted so a space or a shell
 *         metacharacter in it can never be reinterpreted as syntax; single-quotes
 *         are the one shell form that treats EVERY inner byte literally
 *
 * .note = the one byte single-quotes cannot hold is a single-quote itself, so it
 *         is emitted as the standard `'\''` idiom: close the quote, an escaped
 *         literal quote, reopen — the whole value stays one shell token
 * .note = pure: a string in, a quoted string out; no i/o, fully unit-testable
 */
export const asShellSingleQuoted = (input: string): string =>
  `'${input.split("'").join(`'\\''`)}'`;
