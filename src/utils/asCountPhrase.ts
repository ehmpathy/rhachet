/**
 * .what = a count and the phrase that agrees with it: `1 clone refers` or `3 clones refer`
 * .why = a readout row must agree in number; one transformer holds the choice, so no row
 *        inlines a ternary per word
 */
export const asCountPhrase = (input: {
  count: number;
  one: string;
  many: string;
}): string => `${input.count} ${input.count === 1 ? input.one : input.many}`;
