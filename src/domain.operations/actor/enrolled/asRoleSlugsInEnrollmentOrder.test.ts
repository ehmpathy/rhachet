import { given, then, when } from 'test-fns';

import { asRoleSlugsInEnrollmentOrder } from './asRoleSlugsInEnrollmentOrder';

describe('asRoleSlugsInEnrollmentOrder', () => {
  given('[case1] unsorted slugs', () => {
    when('[t0] ordered', () => {
      const slugs = ['mechanic', 'architect', 'driver'];
      const ordered = asRoleSlugsInEnrollmentOrder({ slugs });

      then('they come out in [...slugs].sort() order', () => {
        expect(ordered).toEqual(['architect', 'driver', 'mechanic']);
      });

      then('the input array is not mutated', () => {
        expect(slugs).toEqual(['mechanic', 'architect', 'driver']);
      });
    });
  });

  given('[case2] no slugs', () => {
    when('[t0] ordered', () => {
      then('the result is []', () => {
        expect(asRoleSlugsInEnrollmentOrder({ slugs: [] })).toEqual([]);
      });
    });
  });
});
