/**
 * .what = is this a node fs error for an absent path
 * .why = a structural check, since an fs error thrown across a vm realm (e.g. under
 *        jest) fails `instanceof Error` — so an instanceof guard would rethrow the
 *        very ENOENT it means to allow
 */
export const isErrnoEnoent = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  error.code === 'ENOENT';
