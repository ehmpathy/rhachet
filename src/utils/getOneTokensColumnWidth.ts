import { formatTokens } from './formatTokens';
import { getOneColumnWidth } from './getOneColumnWidth';

/**
 * .what = the width of a token-count column, as `formatTokens` renders each count
 * .why = three renders right-align a token column — the sweep roster, the cost rank, and the
 *        subject margins. each measured the width inline over its own rows; this is the one
 *        owner, so the width always matches the format the cells are rendered in
 */
export const getOneTokensColumnWidth = (input: { counts: number[] }): number =>
  getOneColumnWidth({
    cells: input.counts.map((tokens) => formatTokens({ tokens })),
  });
