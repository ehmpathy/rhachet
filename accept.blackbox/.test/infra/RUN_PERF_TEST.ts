/**
 * .what = flag to control whether performance tests run
 * .why = skipped on local by default because dev machines vary too broadly
 *
 * runs when:
 * - CI=true (github actions, etc)
 * - PERF=true (explicit local perf testing)
 */
export const RUN_PERF_TEST = !!(process.env.CI || process.env.PERF);
