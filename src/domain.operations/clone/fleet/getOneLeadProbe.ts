import type { BootCacheLead } from './asBootCacheLeadDecision';
import { getOneBootCacheLead } from './getOneBootCacheLead';
import { getOneLeadProgress } from './getOneLeadProgress';
import { isOneLeadLive } from './waitForBootCacheLead';

/**
 * .what = the lead record as it stands before the lock, the peer lead's progress, and whether its
 *   socket answers
 * .why = the socket probe is the one slow read of the gate; done before the lock, a slow socket
 *   never holds the lock against a peer's first say
 * .note = the progress is read only for a PEER lead, and the socket probed only while that lead's
 *   answer is still owed; a self lead or an answered lead needs neither
 */
export const getOneLeadProbe = async (input: {
  repoPath: string;
  leadPath: string;
  selfSerial: string;
}): Promise<{
  leadSeen: BootCacheLead | null;
  progressSeen: ReturnType<typeof getOneLeadProgress> | null;
  leadLiveSeen: boolean;
}> => {
  // the record, and whether it names a peer
  const leadSeen = getOneBootCacheLead({ path: input.leadPath });
  if (leadSeen === null || leadSeen.serial === input.selfSerial)
    return { leadSeen, progressSeen: null, leadLiveSeen: false };

  // the peer's progress; an answered peer needs no probe
  const progressSeen = getOneLeadProgress({
    repoPath: input.repoPath,
    serial: leadSeen.serial,
  });
  if (progressSeen.answered)
    return { leadSeen, progressSeen, leadLiveSeen: false };

  // the socket, while the peer's answer is owed
  const leadLiveSeen = await isOneLeadLive({ clone: progressSeen.clone });
  return { leadSeen, progressSeen, leadLiveSeen };
};
