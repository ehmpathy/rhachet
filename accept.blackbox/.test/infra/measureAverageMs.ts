/**
 * .what = measures average execution time across N runs
 * .why = accounts for cold start variance, provides stable performance metric
 */
export const measureAverageMs = (input: {
  runs: number;
  fn: () => void;
}): number => {
  const times: number[] = [];

  for (let i = 0; i < input.runs; i++) {
    const start = performance.now();
    input.fn();
    const elapsed = performance.now() - start;
    times.push(elapsed);
  }

  const sum = times.reduce((a, b) => a + b, 0);
  return sum / times.length;
};
