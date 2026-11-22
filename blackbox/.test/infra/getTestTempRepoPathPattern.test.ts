import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { getError, getOneTempDirRoot, given, then, when } from 'test-fns';

import { genTempDirPhysical } from '@src/.test/infra/genTempDirPhysical';

/**
 * .what = loads a fresh instance of the masker, so its one-slot root cache starts empty
 * .why = the guard fires only on the FIRST read; a module instance another case already read
 *        would skip it
 */
const loadMaskerFresh = (): typeof import('./getTestTempRepoPathPattern') => {
  let masker: typeof import('./getTestTempRepoPathPattern') | null = null;
  jest.isolateModules(() => {
    masker = require('./getTestTempRepoPathPattern');
  });
  if (!masker)
    throw new MalfunctionError('the masker module failed to load under jest.isolateModules', {
      module: './getTestTempRepoPathPattern',
      hint: 're-run this case alone and read the isolateModules failure above; a bad relative import path is the usual cause',
    });
  return masker;
};

describe('getTestTempRepoPathPattern', () => {
  given('[case1] the first read comes from a cwd inside this repo', () => {
    when('[t0] the pattern is asked for', () => {
      then('it matches a temp test repo path under the derived root', () => {
        const { getTestTempRepoPathPattern } = loadMaskerFresh();
        const root = getOneTempDirRoot().pathPhysical;
        const path = `${root}/2026-01-19T12-34-56.789Z.r7f3a91c2.rhachet-test.a1b2c3d4/x`;
        expect(path.replace(getTestTempRepoPathPattern(), '/TMP_REPO')).toEqual(
          '/TMP_REPO/x',
        );
      });
    });
  });

  given('[case2] the first read comes from a cwd outside this repo', () => {
    when('[t0] the pattern is asked for', () => {
      then('it refuses loud, rather than cache a foreign root', async () => {
        const { getTestTempRepoPathPattern } = loadMaskerFresh();
        const elsewhere = genTempDirPhysical({ slug: 'masker-elsewhere' });
        const cwdOriginal = process.cwd();
        // .note = deliberate mutation: the case IS a moved cwd; restored in finally
        process.chdir(elsewhere);
        const error = await (async () => {
          try {
            return await getError(() => getTestTempRepoPathPattern());
          } finally {
            process.chdir(cwdOriginal);
          }
        })();
        // by name: the isolated module instance loads its own copy of helpful-errors, so its
        // ConstraintError is a different class object than the one this file imports
        expect(error.constructor.name).toEqual(ConstraintError.name);
        expect(error.message).toContain('first read from a cwd outside this repo');
        expect(error.message).toContain(
          'mask a snapshot before the chdir, or chdir back first',
        );
      });
    });
  });
});
