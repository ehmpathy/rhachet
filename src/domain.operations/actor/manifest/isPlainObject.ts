/**
 * .what = whether a parsed yaml value is a map (an object, never null, never a list)
 * .why = the actors.yml casters each refuse a non-map node; one guard keeps that parse rule the
 *        same in each
 */
export const isPlainObject = (
  value: unknown,
): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
