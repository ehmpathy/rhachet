/**
 * .what = checks if pattern contains glob metacharacters
 * .why = determines whether to use glob mode vs contains mode
 */
export const getHasGlobChars = (input: { pattern: string }): boolean =>
  /[*?[\]]/.test(input.pattern);
