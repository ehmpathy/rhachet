import { computeCloneInputState } from '../screen/computeCloneInputState';
import type { CloneScreenRead } from '../screen/genCloneScreenFeed';
import { computeCloneSubmitDelay } from './computeCloneSubmitDelay';
import {
  CLONE_SUBMIT_READY_BUDGET_MS,
  CLONE_SUBMIT_READY_POLL_MS,
} from './constants';

/**
 * .what = hold the dispatch between its bulk content write and its submit `\r` until the
 *   daemon OBSERVES the message committed into the input box — or the budget elapses
 * .why =
 *   - claude commits a written buffer ASYNCHRONOUSLY, so an Enter that lands before the
 *     commit submits an empty line and the message is left in the box, unsent. the write
 *     path used to GUESS that interval with a length-scaled sleep
 *     (computeCloneSubmitDelay), which is a guess in both directions: too short loses a
 *     paste (measured 2026-09-17 — a 3-line bracketed paste sat `buffered` forever behind
 *     a 50ms floor) and too long taxes every short say that committed in one tick
 *   - the daemon already holds a LIVE rendered screen for its dispatch gate, so the
 *     interval need not be guessed at all: poll the box until the caller's own message
 *     appears in it, then submit. the read channel this wish built serves the WRITE path
 *   - the wait is on a RISE, never a presence (the repo's rise rule): `--force` may write
 *     into a box that already holds the same text, so the baseline is taken first and the
 *     submit waits for a count ABOVE it
 *
 * .how it degrades = when the screen cannot be read — `feed-not-live`, `feed-faulted`, or
 *   a box the classifier does not recognize — there is no observation to wait on, so this
 *   falls back to the PROVEN length-scaled sleep and reports `observed: false`. the caller
 *   submits either way; the flag says whether the submit was timed or seen
 *
 * .note = the budget is generous on purpose. an early exit costs the observation, so a
 *   long budget is free on every message that commits promptly and is the only bound that
 *   saves a large paste. it bounds a pathological screen, never the common case
 */
export const awaitCloneSubmitReady = async (input: {
  read: () => CloneScreenRead;
  message: string;
  /** the box count taken BEFORE the content write — the submit waits for a rise above it */
  countBefore: number;
  /** wait between polls, injected in a clamp to keep it deterministic */
  sleep?: (ms: number) => Promise<void>;
  /** read the clock, injected in a clamp */
  now?: () => number;
}): Promise<{ observed: boolean; waitedMs: number }> => {
  const sleep =
    input.sleep ??
    ((ms: number) => new Promise<void>((done) => setTimeout(done, ms)));
  const now = input.now ?? (() => Date.now());

  const startedAt = now();
  const budgetMs = Math.max(
    CLONE_SUBMIT_READY_BUDGET_MS,
    computeCloneSubmitDelay({ messageLength: input.message.length }),
  );

  for (;;) {
    const screen = input.read();

    // no live grid to observe — fall back to the proven blind sleep, minus what we
    // already waited, so a degraded feed behaves exactly as the prior write path did
    if (!screen.live) {
      const blindMs = computeCloneSubmitDelay({
        messageLength: input.message.length,
      });
      const leftMs = blindMs - (now() - startedAt);
      if (leftMs > 0) await sleep(leftMs);
      return { observed: false, waitedMs: now() - startedAt };
    }

    const state = computeCloneInputState({ screen, message: input.message });
    if (state.countInInput > input.countBefore)
      return { observed: true, waitedMs: now() - startedAt };

    if (now() - startedAt >= budgetMs)
      return { observed: false, waitedMs: now() - startedAt };

    await sleep(CLONE_SUBMIT_READY_POLL_MS);
  }
};

/**
 * .what = the box count of a message BEFORE the content write — the submit's baseline
 * .why = the rise rule: a `--force` write into a dirty box may find the needle already
 *   present, so a presence test would submit at once, before the paste committed. an
 *   unreadable screen yields 0, which is the safe baseline — any later rise counts
 */
export const getCloneSubmitBaseline = (input: {
  read: () => CloneScreenRead;
  message: string;
}): number => {
  const screen = input.read();
  if (!screen.live) return 0;
  return computeCloneInputState({ screen, message: input.message })
    .countInInput;
};
