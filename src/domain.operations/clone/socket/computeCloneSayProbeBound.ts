import {
  CLONE_PROBE_REPLY_DEFAULT_MS,
  CLONE_SAY_PROBE_REPLY_MS,
} from './constants';

/**
 * .what = the reply bound the observe loop gives its NEXT probe, from how the last one went
 * .why = each probe opens a fresh connection, and the server's same-user gate pays its peer
 *   lookup on every one. on a loaded host that lookup can outlast the 1s probe bound, so a
 *   fixed bound times out every cycle the same way and the loop never lands a read — it ends
 *   `unreadable` on a clone that answered each time, just late (measured 2026-10-23, the full
 *   integration sweep). a probe that used its whole bound doubles the next one, capped at the
 *   one-shot default; a capable read resets it, so a healthy host keeps the 1s cadence
 * .note = a blind reply that came back INSIDE its bound (`feed-not-live` from the server, a
 *   gone socket) was not slow, so it keeps the bound it had — only a timeout earns more time
 */
export const computeCloneSayProbeBound = (input: {
  boundPrior: number;
  probeMs: number;
  capable: boolean;
}): number => {
  // a capable read proves the host answers in time; return to the base cadence
  if (input.capable) return CLONE_SAY_PROBE_REPLY_MS;

  // a fast blind reply is an answer, not a stall; the bound stays
  if (input.probeMs < input.boundPrior) return input.boundPrior;

  // the probe used its whole bound; give the next one twice as long, never past the default
  return Math.min(input.boundPrior * 2, CLONE_PROBE_REPLY_DEFAULT_MS);
};
