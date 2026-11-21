import { isProcessReclaimedByRun } from './isProcessReclaimedByRun';

/**
 * .what = the processes a run left, split into the ones the run reclaims and the ones that leaked
 * .why = a session daemon is the run's to reclaim, a note; every other survivor is a leak, a red
 */
export const asLeftPartitioned = <TProcess extends { command: string }>(input: {
  left: TProcess[];
}): { reclaimed: TProcess[]; leaked: TProcess[] } => ({
  reclaimed: input.left.filter((proc) => isProcessReclaimedByRun(proc)),
  leaked: input.left.filter((proc) => !isProcessReclaimedByRun(proc)),
});
