import { BOOT_DRIFT_NUDGE_LINES } from './BOOT_DRIFT_NUDGE_LINES';

/**
 * .what = whether a drift outgrows the nudge threshold
 * .why = the nudge decision and the readout's size line must agree on the boundary; one
 *        predicate holds it, so a drift of exactly the threshold reads `under` in both
 */
export const isBootDriftOverThreshold = (input: { lines: number }): boolean =>
  input.lines > BOOT_DRIFT_NUDGE_LINES;
