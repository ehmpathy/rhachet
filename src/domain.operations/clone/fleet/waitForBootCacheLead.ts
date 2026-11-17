import type { CloneOndisk } from '@src/domain.objects/CloneOndisk';

import { getCloneReachState } from '../getCloneReachState';
import {
  asBootCacheLeadWaitUntil,
  type BootCacheLead,
} from './asBootCacheLeadDecision';
import { getOneLeadProgress } from './getOneLeadProgress';

/** how often the wait re-probes the lead's socket; the transcript is read each poll */
const LEAD_LIVE_PROBE_MS = 2_000;

/**
 * .what = whether a lead clone still runs; a lead is gone only once DEAD, for a DEAF lead may
 *   yet answer
 */
export const isOneLeadLive = async (input: {
  clone: CloneOndisk | null;
}): Promise<boolean> =>
  input.clone !== null &&
  (await getCloneReachState({ clone: input.clone })) !== 'DEAD';

/**
 * .what = wait on a lead clone's first answer, bounded
 * .why = a follower reads the boot from cache only once the lead's first response has begun; the
 *   bound is short until the lead sends and long after, and a dead lead ends the wait at once
 * .note = no lock is held here; the socket probe runs at most once per LEAD_LIVE_PROBE_MS
 */
export const waitForBootCacheLead = async (
  input: {
    repoPath: string;
    lead: BootCacheLead;
    untilMs: number;
  },
  context: { pollMs: number },
): Promise<{ outcome: 'released' | 'bound'; heldMs: number }> => {
  const heldFromMs = Date.now();

  // .note = deliberate mutation, scoped to the poll: the bound grows once the lead sends, and
  //   the probe clock gates the socket probe
  let untilMs = input.untilMs;
  let probedAtMs = Date.now();
  while (Date.now() < untilMs) {
    await new Promise((done) => setTimeout(done, context.pollMs));

    // the lead answered: release
    const progress = getOneLeadProgress({
      repoPath: input.repoPath,
      serial: input.lead.serial,
    });
    if (progress.answered)
      return { outcome: 'released', heldMs: Date.now() - heldFromMs };

    // the lead died: stop to wait on it
    if (Date.now() - probedAtMs >= LEAD_LIVE_PROBE_MS) {
      probedAtMs = Date.now();
      if (!(await isOneLeadLive({ clone: progress.clone }))) break;
    }

    // the bound follows the lead's progress
    untilMs = asBootCacheLeadWaitUntil({
      lead: input.lead,
      leadStarted: progress.started,
    });
  }
  return { outcome: 'bound', heldMs: Date.now() - heldFromMs };
};
