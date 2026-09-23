import { computeCloneInputState } from '../screen/computeCloneInputState';
import type { CloneScreenRead } from '../screen/genCloneScreenFeed';
import {
  type CloneWithheldReason,
  computeCloneDispatchPrecheck,
} from './computeCloneDispatchPrecheck';

/**
 * .what = the decided dequeue-time gate — proceed with the write, or withhold it with a reason
 * .why = the peer of `CloneDispatchPrecheck`, one layer up: the pre-check decides from a LIVE
 *   input state, and this decides from the raw screen read (live, faulted, or unfed) the dequeue
 *   holds. a refuse carries either a `CloneWithheldReason` (the pre-check's three slugs) or
 *   `feed-faulted` (a poisoned grid we will not paste over), so the write closure branches on one
 *   value
 */
export type CloneScreenDispatchGate =
  | { proceed: true }
  | { proceed: false; reason: CloneWithheldReason | 'feed-faulted' };

/**
 * .what = decide whether a dequeued write may reach the pty, from the current screen read
 * .why = the dequeue is the one moment the read is current at the write (the queue serialized this
 *   write, so a client-side probe taken before enqueue may be stale by up to the queue depth). this
 *   is the most safety-critical decision in the feature — the gate that decides whether to paste
 *   over a human's dirty input (case=2, case=6). it was inlined in the write closure that also
 *   performs the pty write, provable only at the integration grain; extracted here (mirrors
 *   `computeCloneAcceptRoute`) so the three-way branch is unit-testable with a raw `CloneScreenRead`
 *   fixture, no socket or queue harness (r11-i016-n1)
 *
 * .note = the `feed-not-live` branch PROCEEDS ungated — the pre-check does not run, because a
 *   `feed-not-live` screen carries no readable input region to classify. that leaves the safety
 *   pre-check off for a probe-blind peer (a transient not-yet-attached feed, or a durably
 *   emulator-absent clone). whether to refuse-blind or write-blind there is an undecided WISHER
 *   scope call (F07), itemized as fulcrum F17. the shipped behavior PROCEEDS so a brand-new clone
 *   can still receive its first `say` (V13, case=4 the honest degrade); an F07 = IN verdict flips
 *   this branch to a withhold
 */
export const computeCloneScreenDispatchGate = (input: {
  screen: CloneScreenRead;
  message: string;
  force: boolean;
}): CloneScreenDispatchGate => {
  // a LIVE screen — classify the input region and run the dispatch pre-check (V3, case=2, case=6)
  if (input.screen.live) {
    const precheck = computeCloneDispatchPrecheck({
      state: computeCloneInputState({
        screen: input.screen,
        message: input.message,
      }),
      force: input.force,
    });
    if (!precheck.proceed) return { proceed: false, reason: precheck.reason };
    return { proceed: true };
  }

  // a FAULTED feed HAS the read channel, but its emulator threw, so the grid's parse integrity is
  // in doubt — a human's just-typed keystrokes may be invisible in a stale grid. withhold rather
  // than paste blind: invariant 1 (never write over the human's unsubmitted work, case=2) must hold
  // on a same-version clone whose grid we cannot trust. a SERVER fault (re-enroll to rebuild the
  // feed), never a caller-amendable refusal
  if (input.screen.reason === 'feed-faulted')
    return { proceed: false, reason: 'feed-faulted' };

  // a `feed-not-live` screen (transient not-yet-attached, OR a permanently probe-blind peer with no
  // usable grid at all) PROCEEDS ungated — see the .note above (F17, wisher-scoped under F07)
  return { proceed: true };
};
