/**
 * .what = a boot payload in the shape the token counter measures — body plus stats renderer
 * .why = THREE sites state this pair: `calcBootPayloadTokens` receives it, the gate's `of`
 *        carries it, and a subject's marginal re-render returns it
 *        (`rule.prefer.wet-over-dry` puts the abstraction at three).
 *
 * 🔴 .note = the stats block is a RENDERER rather than lines, and that is the whole reason the
 *   pair cannot collapse to a string. the block reports the number it is part of, so the
 *   counter must be able to re-render it per candidate total and iterate to a fixed point.
 */
export interface BootPayloadMeasurable {
  /**
   * every line of the payload except the stats block
   */
  linesBody: string[];

  /**
   * renders the stats block, given the count it is to report
   */
  genStatsLines: (input: { counted: { tokens: number } | null }) => string[];
}
