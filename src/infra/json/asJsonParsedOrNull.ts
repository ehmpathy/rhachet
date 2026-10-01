/**
 * .what = parse a json string, or null when it is not valid json
 * .why = a reader of a file it does not own (e.g. a login written by another tool)
 *   treats unparseable bytes as "no shape we can judge", never as a crash
 *
 * .note = only a SyntaxError maps to null; every other error surfaces
 */
export const asJsonParsedOrNull = (input: { content: string }): unknown => {
  try {
    return JSON.parse(input.content);
  } catch (error) {
    if (isSyntaxError(error)) return null;
    throw error;
  }
};

/**
 * .what = is this error a SyntaxError
 * .why = a check by name, since an error thrown across a vm realm (e.g. under jest)
 *   fails `instanceof SyntaxError`
 */
const isSyntaxError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'name' in error &&
  error.name === 'SyntaxError';
