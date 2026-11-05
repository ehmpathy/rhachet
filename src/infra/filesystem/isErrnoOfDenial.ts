/**
 * .what = the errnos of a denied or read-only path: the faults a human fixes on their own box
 */
const ERRNOS_OF_DENIAL: ReadonlySet<string> = new Set([
  'EACCES',
  'EPERM',
  'EROFS',
]);

/**
 * .what = is this a node fs error for a path this process may not write
 * .why = a structural check, as `isErrnoEnoent` is: an fs error thrown across a vm realm (e.g.
 *        under jest) fails `instanceof Error`
 */
export const isErrnoOfDenial = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  typeof error.code === 'string' &&
  ERRNOS_OF_DENIAL.has(error.code);
