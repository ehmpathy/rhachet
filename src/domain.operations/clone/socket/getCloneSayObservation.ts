import type { CloneOndisk } from '@src/domain.objects/CloneOndisk';

import { genCloneHistoryRelink } from '../genCloneHistoryRelink';
import { getCloneSubmittedCount } from '../getCloneSubmittedCount';
import { asCloneObservationScreen } from './asCloneObservationScreen';
import { asCloneProbeReason } from './asCloneProbeReason';
import type { CloneSayDebugCycle } from './computeCloneSayDebugReport';
import {
  type CloneSayAwaitTarget,
  computeCloneSayPollStep,
} from './computeCloneSayPollStep';
import type { CloneSayObservation } from './computeCloneSayVerdict';
// the two latency bounds this loop rides live with every other wire tunable in
// `./constants`, so a human who tunes the say budget reads them beside the submit delay
// and the wedge window rather than hunts a local per-file literal
import { CLONE_SAY_POLL_MS_MIN, CLONE_SAY_PROBE_REPLY_MS } from './constants';
import { getCloneInputStateOrBlind } from './getCloneInputStateOrBlind';

/**
 * .what = observe where a delivered message sits — poll the transcript (the `released` basis)
 *   and the rendered screen (the `enqueued` / `buffered` basis) until the target state is
 *   reached, or the bound elapses, then hand back the observation a verdict is computed from
 * .why = a `delivered` ack proves only hand-off; this reads the input triple to part
 *   `released` from `enqueued` from `buffered` from `absent`. every field is a RISE — a
 *   post read compared against the pre-dispatch baseline — never a presence, so a prior
 *   tick's echo of a repeated message is not mistaken for this dispatch (the rise rule)
 *
 * .note = this is the I/O half. the poll DECISION — the target split, the case=5 race-guard,
 *   the residual — lives in the pure `computeCloneSayPollStep`, unit-tested at the boundary;
 *   this loop gathers each cycle's read and hands it to that one call (r011-i007-b1)
 *
 * .note = only reached on a `delivered` dispatch — a `withheld` refusal is decided by the
 *   server pre-check and never observed here (its screen is null in the verdict compute).
 *   a probe-blind peer (no emulator) reads `screen: null`, the honest degrade `unreadable`
 *   rests on (V7), never a false `absent`
 *
 * .note = the return carries a `trail` beside the observation — every cycle's raw read, in
 *   order. the observation is a REDUCTION (four booleans and two enums); the trail is what
 *   it was reduced FROM, and only the trail can say which read failed and when. it is
 *   written to the failure debug log and read by no verdict, so it decides no outcome
 */
export const getCloneSayObservation = async (input: {
  repoPath: string;
  clone: CloneOndisk;
  socketPath: string;
  message: string;
  baseline: {
    transcriptCount: number;
    // null = the baseline probe was blind (unmeasured); a rise cannot be asserted against it
    countInInput: number | null;
    countOnScreen: number | null;
  };
  target: CloneSayAwaitTarget;
  timeoutMs: number;
  pollMs?: number;
  /** when the dispatch write happened, so each cycle's lag is legible; defaults to now */
  dispatchedAtMs?: number;
}): Promise<{
  observation: CloneSayObservation;
  trail: CloneSayDebugCycle[];
}> => {
  const pollMs = Math.max(
    input.pollMs ?? CLONE_SAY_POLL_MS_MIN,
    CLONE_SAY_POLL_MS_MIN,
  );
  const deadline = Date.now() + input.timeoutMs;
  const dispatchedAtMs = input.dispatchedAtMs ?? Date.now();

  // .note = deliberate mutation — a count of poll cycles elapsed, local to this loop. the
  //   pure step reads it to defer the enqueued short-circuit past cycle 0 (the case=5 guard);
  //   bounded here, never escapes
  let cyclesElapsed = 0;

  // .note = deliberate mutation — the diagnostic trail, appended once per cycle and handed
  //   back whole. it is write-only within this loop: no branch above reads it, so it cannot
  //   alter a verdict. bounded by the poll deadline (~60 cycles at the 250ms floor)
  const trail: CloneSayDebugCycle[] = [];

  for (;;) {
    // the transcript rise is the `released` basis — the strongest observation. relink the
    // transcript (a lazily-written jsonl is picked up), then read the pure count
    genCloneHistoryRelink({ repoPath: input.repoPath, clone: input.clone });
    const transcriptRose =
      getCloneSubmittedCount({ clone: input.clone, message: input.message }) >
      input.baseline.transcriptCount;

    // probe the current screen; a capable read carries the rise pair, a probe-blind peer
    // reads null (the honest degrade the `unreadable` verdict rests on).
    //
    // ⚠️ the probe never throws: this loop is reached ONLY after `delivered: true`, so a
    //   transient probe fault (a socket hiccup, a reply timeout) must NOT crash a say whose
    //   message already landed — that would reintroduce the false-failure-on-a-delivered-
    //   message class this wish exists to kill (r008-i004-b1). getCloneInputStateOrBlind
    //   degrades a fault to a probe-blind reply, so THIS cycle reads null: a transient one
    //   self-heals on the next poll, and a persistent one lands on `unreadable` at the bound
    //
    // `debug: true` asks the server to attach the RAW grid beside the classification. it
    // is the SAME read the classification below is computed from, so the failure log shows
    // the exact rows the verdict saw — never a re-probe taken at a later, different moment
    const reply = await getCloneInputStateOrBlind({
      socketPath: input.socketPath,
      message: input.message,
      debug: true,
      replyTimeoutMs: CLONE_SAY_PROBE_REPLY_MS,
    });
    const screen = asCloneObservationScreen({
      reply,
      baseline: input.baseline,
    });
    const probeReason = asCloneProbeReason({ reply });

    // retain this cycle's raw read for the failure log — appended BEFORE the step decides,
    // so the terminal cycle (the one the verdict rests on) is always the trail's last entry
    trail.push({
      cycle: cyclesElapsed,
      sinceDispatchMs: Date.now() - dispatchedAtMs,
      transcriptRose,
      reply,
    });

    // decide — the pure step owns the target split, the case=5 guard, and the residual. it
    // reads this cycle's facts and returns terminal-or-poll-again, so the branch logic is
    // unit-tested apart from these sockets and timers
    const step = computeCloneSayPollStep({
      transcriptRose,
      screen,
      probeReason,
      target: input.target,
      cyclesElapsed,
      deadlineReached: Date.now() >= deadline,
    });
    if (step.done) return { observation: step.observation, trail };

    await new Promise<void>((done) => setTimeout(done, pollMs));
    cyclesElapsed += 1;
  }
};
