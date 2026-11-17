import type { BootCacheLead } from './asBootCacheLeadDecision';
import { getOneLeadProgress } from './getOneLeadProgress';

/**
 * .what = the lead progress and liveness the decision should judge, given the record as read
 *   under the lock and the probe taken before it
 * .why = the record may move between the probe and the lock. an unmoved record keeps the probe's
 *   reads; a moved one is re-read, and its fresh claim is presumed live by its own act
 * .note = no peer lead (none, or self) judges as not started, not answered, not live
 */
export const getOneLeadProgressToJudge = (input: {
  repoPath: string;
  selfSerial: string;
  leadFound: BootCacheLead | null;
  probe: {
    leadSeen: BootCacheLead | null;
    progressSeen: ReturnType<typeof getOneLeadProgress> | null;
    leadLiveSeen: boolean;
  };
}): { started: boolean; answered: boolean; live: boolean } => {
  // no peer lead: naught to judge
  if (input.leadFound === null || input.leadFound.serial === input.selfSerial)
    return { started: false, answered: false, live: false };

  // the same claim the probe saw: its reads stand
  const isUnmoved =
    input.probe.leadSeen?.serial === input.leadFound.serial &&
    input.probe.leadSeen?.claimedAtMs === input.leadFound.claimedAtMs;
  if (isUnmoved && input.probe.progressSeen !== null)
    return {
      started: input.probe.progressSeen.started,
      answered: input.probe.progressSeen.answered,
      live: input.probe.leadLiveSeen,
    };

  // a moved claim: re-read its progress; a claim this fresh is live by its own act
  const progress = getOneLeadProgress({
    repoPath: input.repoPath,
    serial: input.leadFound.serial,
  });
  return { started: progress.started, answered: progress.answered, live: true };
};
