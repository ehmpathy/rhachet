/**
 * .what = the share of a budget a payload occupies, as a whole percent
 * .why = THREE surfaces report this number — the `<stats>` block's `(N% used)`, the breach
 *        readout's `(N% of budget)`, and `roles cost --all`'s sweep row `(N%)` — and they
 *        must never disagree. the formula is declared once so a change to it cannot land on
 *        one surface and not the others
 *        (`rule.prefer.most-common-denominator`, `rule.require.named-transformers`).
 *
 * .note = the call sites word it differently on purpose. under budget it reads `used`;
 *   over budget it reads `of budget`, because `140% used` claims a share of a whole that
 *   was already spent. one quantity, three readings, and the arithmetic is this operation's.
 *
 * .note = `budget.tokens` is a positive integer here — the parse refuses `0`, a negative, and
 *   a non-numeric — so no division by zero can occur.
 */
export const calcBudgetPercentUsed = (input: {
  payload: { tokens: number };
  budget: { tokens: number };
}): number => Math.round((input.payload.tokens / input.budget.tokens) * 100);
