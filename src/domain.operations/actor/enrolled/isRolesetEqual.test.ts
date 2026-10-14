import { given, then, when } from 'test-fns';

import { isRolesetEqual } from './isRolesetEqual';

describe('isRolesetEqual', () => {
  given('[case1] two rolesets of the same roles', () => {
    when('[t0] in the same order', () => {
      then('they are equal', () => {
        expect(
          isRolesetEqual({
            left: ['mechanic', 'driver'],
            right: ['mechanic', 'driver'],
          }),
        ).toEqual(true);
      });
    });

    when('[t1] in another order', () => {
      then('they are equal — order is ignored', () => {
        expect(
          isRolesetEqual({
            left: ['mechanic', 'driver'],
            right: ['driver', 'mechanic'],
          }),
        ).toEqual(true);
      });
    });

    when('[t2] both are empty', () => {
      then('they are equal', () => {
        expect(isRolesetEqual({ left: [], right: [] })).toEqual(true);
      });
    });
  });

  given('[case2] two rolesets of different roles', () => {
    when('[t0] one holds a role the other lacks', () => {
      then('they are not equal', () => {
        expect(
          isRolesetEqual({
            left: ['mechanic', 'driver'],
            right: ['mechanic'],
          }),
        ).toEqual(false);
      });
    });

    when('[t1] same size, different roles', () => {
      then('they are not equal', () => {
        expect(
          isRolesetEqual({
            left: ['mechanic', 'driver'],
            right: ['mechanic', 'reviewer'],
          }),
        ).toEqual(false);
      });
    });
  });
});
