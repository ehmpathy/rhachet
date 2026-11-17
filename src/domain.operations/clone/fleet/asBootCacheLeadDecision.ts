/**
 * .what = how long after its claim a lead may go without a sent request before it is no lead
 * .why = a parallel fleet's lead submits within moments of its claim. a lead whose say never
 *   submitted (a message held in its box, a say that failed) writes no boot, so a follower must
 *   not wait on it past this short window
 */
export const BOOT_CACHE_LEAD_UNSENT_MS = 5_000;

/**
 * .what = how long a lead's sent first request may stay unanswered before a follower stops to wait
 * .why = a lead that never answers (it hung, it parked on a prompt) must not hold a fleet forever;
 *   past this age, the follower goes and writes the boot itself
 */
export const BOOT_CACHE_LEAD_UNANSWERED_MS = 45_000;

/**
 * .what = how long after a lead's claim its answered boot counts as warm in the api cache
 * .why = the api keeps a cache entry five minutes past its last read; measured from the claim, the
 *   window is conservative, so a follower never assumes a warm entry the api already let go
 */
export const BOOT_CACHE_WARM_MS = 5 * 60_000;

/**
 * .what = the lead record of one boot: the clone whose first request writes the boot into the cache
 */
export type BootCacheLead = {
  serial: string;
  claimedAtMs: number;
};

/**
 * .what = the moment a follower stops to wait on a lead: short while the lead has sent naught, long
 *   once its first request is in flight
 */
export const asBootCacheLeadWaitUntil = (input: {
  lead: BootCacheLead;
  leadStarted: boolean;
}): number =>
  input.lead.claimedAtMs +
  (input.leadStarted
    ? BOOT_CACHE_LEAD_UNANSWERED_MS
    : BOOT_CACHE_LEAD_UNSENT_MS);

/**
 * .what = decide what a clone's first say does about the boot cache: claim the lead, go at once on a
 *   warm boot, or wait on the lead's first reply
 * .why = the api makes a cache entry readable only once the first response starts, so N clones of one
 *   boot that send their first request together each write it. one lead goes; the rest wait for it
 *
 * .note = a lead that is dead, or that sent naught in its short window, or whose request outlived the
 *   long bound, is no lead: its follower claims at once
 */
export const asBootCacheLeadDecision = (input: {
  lead: BootCacheLead | null;
  leadStarted: boolean;
  leadAnswered: boolean;
  leadLive: boolean;
  selfSerial: string;
  nowMs: number;
}):
  | { kind: 'claim' }
  | { kind: 'warm' }
  | { kind: 'wait'; untilMs: number } => {
  // no lead, or this clone is the lead: claim it
  if (input.lead === null) return { kind: 'claim' };
  if (input.lead.serial === input.selfSerial) return { kind: 'claim' };

  // the lead answered within the cache window: the boot is warm, go at once
  const ageMs = input.nowMs - input.lead.claimedAtMs;
  if (input.leadAnswered && ageMs < BOOT_CACHE_WARM_MS) return { kind: 'warm' };

  // the lead is live, unanswered, and within its window: wait on it
  const untilMs = asBootCacheLeadWaitUntil({
    lead: input.lead,
    leadStarted: input.leadStarted,
  });
  if (!input.leadAnswered && input.leadLive && input.nowMs < untilMs)
    return { kind: 'wait', untilMs };

  // a stale, dead, silent, or long-answered lead: this clone takes the lead
  return { kind: 'claim' };
};
