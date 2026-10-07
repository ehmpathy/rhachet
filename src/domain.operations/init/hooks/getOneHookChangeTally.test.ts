import { given, then, when } from 'test-fns';

import { getOneHookChangeTally } from './getOneHookChangeTally';

describe('getOneHookChangeTally', () => {
  given('[case1] several role→brain applies', () => {
    when('[t0] tallied', () => {
      then('each kind of change is summed across the applies', () => {
        expect(
          getOneHookChangeTally({
            applied: [
              { hooks: { created: [1, 2], updated: [1], deleted: [] } },
              { hooks: { created: [1], updated: [], deleted: [1, 2, 3] } },
            ],
          }),
        ).toEqual({ created: 3, updated: 1, deleted: 3 });
      });
    });
  });

  given('[case2] no applies', () => {
    when('[t0] tallied', () => {
      then('every count is 0', () => {
        expect(getOneHookChangeTally({ applied: [] })).toEqual({
          created: 0,
          updated: 0,
          deleted: 0,
        });
      });
    });
  });
});
