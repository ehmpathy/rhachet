/**
 * .what = the errno code a node fs error carries, or null for any other thrown value
 * .why = a structural check, since an fs error thrown across a vm realm (e.g. under jest)
 *        fails `instanceof Error`, so an instanceof guard would miss the very errno it reads
 */
export const asErrnoCode = (input: { error: unknown }): string | null => {
  if (typeof input.error !== 'object' || input.error === null) return null;
  if (!('code' in input.error)) return null;
  return typeof input.error.code === 'string' ? input.error.code : null;
};
