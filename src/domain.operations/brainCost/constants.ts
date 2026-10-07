/**
 * .what = the price per million tokens every cost readout in this repo quotes
 * .why = it was stated as a literal `3` at two sites a human compares against each other.
 *        two literals that must agree and are declared apart will drift, and a drifted
 *        pair reads as two different prices rather than as one defect
 *        (`rule.forbid.magic-values`)
 *
 * .note = it lives beside `calcBrainTokens` because the price of a token is that module's
 *   domain. a caller that quotes a dollar figure reaches for this; a caller that merely
 *   counts tokens does not.
 */
export const COST_PER_MILLION_TOKENS = 3;
