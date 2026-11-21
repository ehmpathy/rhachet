import type { BoxPressure } from './getOneBoxPressureNow';

/**
 * .what = the thresholds past which a box reads as starved
 * .why = above them a test's timeout may be the box, not the code; below them a timeout is a
 *   plain red. psi where the kernel has it; load over cores where it does not
 */
const STARVED_CPU_PSI_PERCENT = 50;
const STARVED_LOAD_PER_CORE = 1.5;

/**
 * .what = whether a run's peak pressure reads as a starved box
 */
export const isBoxStarved = (input: { peak: BoxPressure }): boolean => {
  if (input.peak.cpuPsiSomeAvg10 !== null)
    return input.peak.cpuPsiSomeAvg10 >= STARVED_CPU_PSI_PERCENT;
  return input.peak.load1 / input.peak.cores >= STARVED_LOAD_PER_CORE;
};
