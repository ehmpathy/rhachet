import { join } from 'node:path';

/**
 * .what = the path of the login a 1.48.0 enroll left in an actor's brain dir
 * .why = one owner of the brain-dir login layout, beside its peer for the shared
 *   login (getBrainAuthPath)
 */
export const getBrainDirAuthPath = (input: { brainDir: string }): string =>
  join(input.brainDir, '.credentials.json');
