/**
 * .what = the tokens a boot payload runs past its declared budget
 * .why = the halt readout and the thrown error's metadata both report the overage, and one
 *        named owner keeps the two from drift (`rule.require.named-transformers`)
 */
export const calcBudgetOverage = (input: {
  payload: { tokens: number };
  budget: { tokens: number };
}): number => input.payload.tokens - input.budget.tokens;
