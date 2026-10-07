/**
 * .what = formats a token count with thousands separators
 * .why = one quantity, one format. every budget surface — `roles cost`'s tree, the budget
 *        readout, `roles cost --all`'s sweep, and the boot `<stats>` budget rows — renders
 *        through this, so a count never reads `56818` on one and `56,818` on another.
 */
export const formatTokens = (input: { tokens: number }): string => {
  return input.tokens.toLocaleString('en-US');
};
