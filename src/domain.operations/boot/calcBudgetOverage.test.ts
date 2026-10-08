import { given, then, when } from 'test-fns';

import { calcBudgetOverage } from './calcBudgetOverage';

describe('calcBudgetOverage', () => {
  given('[case1] a payload over its budget', () => {
    when('[t0] the overage is computed', () => {
      then('it is the payload less the budget', () => {
        expect(
          calcBudgetOverage({
            payload: { tokens: 5_237 },
            budget: { tokens: 5_000 },
          }),
        ).toEqual(237);
      });
    });
  });

  given('[case2] a payload exactly at its budget', () => {
    when('[t0] the overage is computed', () => {
      then('it is zero', () => {
        expect(
          calcBudgetOverage({
            payload: { tokens: 5_000 },
            budget: { tokens: 5_000 },
          }),
        ).toEqual(0);
      });
    });
  });

  given('[case3] a payload under its budget', () => {
    when('[t0] the overage is computed', () => {
      // .why = the formula is a plain difference and never clamps at zero, so a caller that
      //   renders it must first check the payload is over
      then('it is negative, by the headroom left', () => {
        expect(
          calcBudgetOverage({
            payload: { tokens: 4_000 },
            budget: { tokens: 5_000 },
          }),
        ).toEqual(-1_000);
      });
    });
  });
});
