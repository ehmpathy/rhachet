import type { BoxPressure } from './getOneBoxPressureNow';

/**
 * .what = the peak of a run's pressure so far, with one more sample folded in
 * .note = psi is null on a host with none; a null never outranks a number, and two nulls stay null
 */
export const asPeakPressure = (input: {
  now: BoxPressure;
  peak: BoxPressure | null;
}): BoxPressure => ({
  cpuPsiSomeAvg10: asMaxOrNull({
    a: input.now.cpuPsiSomeAvg10,
    b: input.peak?.cpuPsiSomeAvg10 ?? null,
  }),
  load1: Math.max(input.now.load1, input.peak?.load1 ?? 0),
  cores: input.now.cores,
});

/**
 * .what = the larger of two values, where null is absent rather than zero
 */
const asMaxOrNull = (input: { a: number | null; b: number | null }): number | null => {
  if (input.a === null) return input.b;
  if (input.b === null) return input.a;
  return Math.max(input.a, input.b);
};
