import { given, then, when } from 'test-fns';

import { getKeyrackHostFilePath } from './getKeyrackHostFilePath';

/**
 * .what = prove the shared per-owner keyrack host path builder shapes each
 *         suffix identically for the null-owner default and an explicit owner
 * .why  = every keyrack.host file (manifest, index) delegates here; one builder
 *         keeps the null-owner convention + root dir in lockstep
 *
 * .note = unit (pure) — reads only HOME via getHomeDir; set + restored per case
 */
describe('getKeyrackHostFilePath', () => {
  const HOME_FIXED = '/home/tester';
  const homeBefore = process.env.HOME;
  beforeAll(() => {
    process.env.HOME = HOME_FIXED;
  });
  afterAll(() => {
    process.env.HOME = homeBefore;
  });

  given('[case1] a null owner (the default)', () => {
    when('[t0] each suffix is built', () => {
      then('the manifest path omits the owner segment', () => {
        expect(getKeyrackHostFilePath({ owner: null, suffix: '.age' })).toEqual(
          '/home/tester/.rhachet/keyrack/keyrack.host.age',
        );
      });

      then('the compound index suffix omits the owner segment', () => {
        expect(
          getKeyrackHostFilePath({ owner: null, suffix: '.index.json' }),
        ).toEqual('/home/tester/.rhachet/keyrack/keyrack.host.index.json');
      });
    });
  });

  given('[case2] an explicit owner', () => {
    when('[t0] each suffix is built', () => {
      then('the owner segment is inserted before the suffix', () => {
        expect(
          getKeyrackHostFilePath({ owner: 'ehmpath', suffix: '.age' }),
        ).toEqual('/home/tester/.rhachet/keyrack/keyrack.host.ehmpath.age');
        expect(
          getKeyrackHostFilePath({
            owner: 'ehmpath',
            suffix: '.index.json',
          }),
        ).toEqual(
          '/home/tester/.rhachet/keyrack/keyrack.host.ehmpath.index.json',
        );
      });
    });
  });
});
