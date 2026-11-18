/**
 * .what = whether a hook matcher reads the same as a js regex (claude) and a posix ere (bash)
 * .why = claude matched a role hook's matcher as a js regex; the dispatcher matches it with bash
 *   `=~`, a posix ere. a matcher in a syntax only js reads (`\d`, `\w`, `\s`, `\b`, `(?…)`, a lazy
 *   quantifier) would fit other tools, or none, inside the dispatcher, so the sync refuses it
 *
 * .note = `*`, empty, and an exact list (`Bash|Write`, `Read,Edit`) never reach a regex engine
 */
export const isHookMatcherPortable = (input: { matcher: string }): boolean => {
  // an exact list or a wildcard is matched by name, never as a regex
  if (input.matcher === '' || input.matcher === '*') return true;
  if (/^[A-Za-z0-9_|,]+$/.test(input.matcher)) return true;

  // a regex: refuse each construct only js reads
  return !/\\[dDwWsSbB]|\(\?|[*+?}]\?/.test(input.matcher);
};
