import { given, then, when } from 'test-fns';

/**
 * .what = a fixture with a frozen roster: two `alpha` tests, one `beta` test, no snapshots
 * .why = the test.under-unit-config skill suite snaps the report envelope of a run against
 *        this file, so its counts must change only when the skill's render changes. a fixture
 *        with its own purpose (e.g. getProbeSlug.test.ts) would redden the skill suite on its
 *        own edits
 * .note = do not add, remove, or rename a test here; that reddens the skill suite by design
 */
describe('frozenRoster', () => {
  given('[case1] the roster', () => {
    when('[t0] it is run', () => {
      then('alpha one holds', () => {
        expect(1).toEqual(1);
      });
      then('alpha two holds', () => {
        expect(2).toEqual(2);
      });
      then('beta holds', () => {
        expect(3).toEqual(3);
      });
    });
  });
});
