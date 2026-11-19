/**
 * .what = the exit code of a brain dir sync, with its drift faults counted
 * .why = a drift not written leaves its clones on a stale drift, so a sync that otherwise
 *        succeeded exits 1; a sync that already failed keeps its own code
 */
export const asExitCodeWithDriftFaults = (input: {
  exitCodeOfFailures: 0 | 1 | 2;
  isDriftFaulted: boolean;
}): 0 | 1 | 2 => {
  // a failure already named keeps its code
  if (input.exitCodeOfFailures !== 0) return input.exitCodeOfFailures;

  // a drift fault alone is a malfunction
  return input.isDriftFaulted ? 1 : 0;
};
