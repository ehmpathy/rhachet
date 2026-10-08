import { given, then, when } from 'test-fns';

import { getOneHookOrphanCount } from './getOneHookOrphanCount';

describe('getOneHookOrphanCount', () => {
  given('[case1] several brain configs pruned', () => {
    when('[t0] counted', () => {
      then('the removed hooks are summed across the configs', () => {
        expect(
          getOneHookOrphanCount({
            removed: [{ hooks: [1, 2] }, { hooks: [] }, { hooks: [1] }],
          }),
        ).toBe(3);
      });
    });
  });

  given('[case2] no prune', () => {
    when('[t0] counted', () => {
      then('the count is 0', () => {
        expect(getOneHookOrphanCount({ removed: [] })).toBe(0);
      });
    });
  });
});
