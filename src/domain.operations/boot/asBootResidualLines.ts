import { asBootBlocks } from './asBootBlocks';

/**
 * .what = the lines of a boot corpus that sit outside every path-keyed block, trimmed, blanks dropped
 * .why = a byte change outside the blocks (a wrapper, a header, the cache boundary) is drift no
 *        block can carry; the delta names it, so a changed boot never reads as no drift
 */
export const asBootResidualLines = (input: { corpus: string }): string[] =>
  asBootBlocks({ corpus: input.corpus })
    .reduce((residual, block) => residual.replace(block.text, ''), input.corpus)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
