import {
  type CloneSayObservation,
  isCloneSayEnqueuedShape,
} from './computeCloneSayVerdict';

/**
 * .what = the state a caller waits a dispatched message to reach
 * .why = the target is the caller's knob: `enqueue` (the default — the message is at least
 *   held above the input line) is satisfied by BOTH `enqueued` and `released`, since released
 *   is downstream of enqueued; `release` raises the bar to a taken turn. the 15s bound is no
 *   longer the decider — it is a poll timeout, never the turn the message waits behind (the
 *   wish's core reframe)
 */
export type CloneSayAwaitTarget = 'enqueue' | 'release';

/**
 * .what = one probe cycle's read — the transcript rise, the screen read (null when
 *   probe-blind), its probe-blind cause, the caller's target, the cycle index, and whether
 *   the deadline is reached — the inputs the poll's DECISION rests on, and no more
 * .why = this is the pure half of the poll loop: no socket, no clock, no timer. every field
 *   is a fact the I/O half already gathered, so the decision is a data-in / data-out transform
 *   a unit test drives exhaustively (rule.require.test-coverage-by-grain)
 */
export interface CloneSayPollRead {
  /**
   * .what = the transcript submit-count rose — proof of SUBMIT, and no more
   * .why = the brain writes the user turn on submit, never on release, so a rise is satisfied by
   *   `enqueued` and `released` alike (measured 2026-09-18 — `computeCloneSayVerdict`'s field
   *   docblock carries the measurement). so the `released` short-circuit below pairs it with an
   *   empty queue off the screen read
   */
  transcriptRose: boolean;
  /** the screen read this cycle, or null when the feed was not live (probe-blind) */
  screen: CloneSayObservation['screen'];
  /** the probe-blind cause, when `screen` is null — else null */
  probeReason: CloneSayObservation['probeReason'];
  /** the state the caller waits the message to reach */
  target: CloneSayAwaitTarget;
  /**
   * .what = how many poll cycles have already elapsed at this read (0 on the first read)
   * .why = the `enqueue` short-circuit waits for the FIRST cycle to pass — see the guard
   *   below. the loop owns the count; this reads it
   */
  cyclesElapsed: number;
  /** the poll deadline has been reached — the loop compares the clock, this reads the verdict */
  deadlineReached: boolean;
}

/**
 * .what = one poll step's decision — either the poll is DONE (hand back the observation a
 *   verdict is computed from) or it must poll again
 * .why = a discriminated union, so the loop reads `if (step.done) return step.observation`
 *   with no field-by-field re-assembly. `refusal` is always null on this path — the poll loop
 *   is reached ONLY on a delivered dispatch, a `withheld` refusal is decided server-side and
 *   never observed here
 */
export type CloneSayPollStep =
  | { done: true; observation: CloneSayObservation }
  | { done: false };

/**
 * .what = decide whether a poll cycle is terminal, from one cycle's read — the pure
 *   state-machine that turns a poll into a `released` / `enqueued` / (deadline) residual
 * .why = extracted out of `getCloneSayObservation`'s I/O loop so the wish's single most novel
 *   piece of control-flow — the target split and the case=5 race-guard — is unit-testable at
 *   the boundary, never only through an expensive real-socket path (r011-i007-b1). the loop
 *   shrinks to I/O plus one call to this; every branch here is a fact the loop gathered
 *
 * .note = the branch ORDER is the strength order, first match wins: a transcript rise
 *   (`released`) outranks the enqueued shape, which the deadline residual falls under
 */
export const computeCloneSayPollStep = (
  input: CloneSayPollRead,
): CloneSayPollStep => {
  // released — the brain TOOK it: the transcript rose AND the queue is empty. terminal for ANY
  // target, the strongest claim.
  //
  // 🔴 the queue clause is what makes `release` a real target. the transcript rise alone is a
  //   SUBMIT proof (the brain writes the turn on submit), so this branch used to fire on a
  //   dispatch the brain had merely queued — measured 2026-09-18 against a live peer mid-turn.
  //   `enqueued` was then unreachable for a busy brain and `--await release` returned on a
  //   submit. a probe-blind read (screen null) keeps the transcript-only basis, since the queue
  //   is unknowable there and case=4's degrade rests on it
  if (input.transcriptRose && (input.screen === null || !input.screen.queued))
    return {
      done: true,
      observation: {
        refusal: null,
        transcriptRose: true,
        screen: input.screen,
        probeReason: input.probeReason,
      },
    };

  // enqueued — held above the input line: focus input, region clear, screen count rose. it
  // satisfies the `enqueue` target; a `release` target polls on for the transcript.
  //
  // ⚠️ the FIRST cycle is reserved for the transcript to settle. `released` outranks
  //   `enqueued`, and on an idle brain the transcript write lags the screen render by up to a
  //   poll: the box clears and the echo lands on screen (the enqueued SHAPE) an instant before
  //   the user turn reaches the jsonl. a return on cycle 0 would read that in-flight release as
  //   an `enqueued` — the case=5 regression (an idle say MUST read `released`, byte for byte).
  //   by cycle 1 the two cases have parted on the QUEUE rather than on the clock: a busy brain
  //   reads `queued`, so the released branch above is gated and the shape lands here; an idle
  //   one reads an empty queue, so the released branch takes it first
  //
  // .note = the guard is kept as the FLOOR, not as the discriminator. the queue gate above is
  //   what parts the two cases, and it rests on one screen marker; were that marker absent on
  //   some future render, this branch must not fire at cycle 0 and re-open the case=5 regression
  if (
    input.target === 'enqueue' &&
    isCloneSayEnqueuedShape({ screen: input.screen }) &&
    input.cyclesElapsed >= 1
  )
    return {
      done: true,
      observation: {
        refusal: null,
        // 🔴 the MEASURED rise, carried through — never a hardcoded `false`. this branch is
        //   reached WITH a rise whenever the queue gate above held it (a rise beside a
        //   non-empty queue — the 2026-09-18 measurement), so a hardcoded `false` stated a
        //   fact contrary to what was read: the `--debug` decision block then said
        //   `transcriptRose false` while its own trail row said `true`, and the very discovery
        //   this wish rests on went invisible in the instrument built to show it
        // .note = the verdict is unchanged by construction, so this repairs a REPORT and no
        //   behavior. the verdict's `released` branch is itself gated on an empty queue, so a
        //   `true` here cannot reach it: either the rise is false, or the queue is non-empty
        //   (else the branch above would have terminated first)
        transcriptRose: input.transcriptRose,
        screen: input.screen,
        probeReason: input.probeReason,
      },
    };

  // the bound elapsed — hand back the last read (a residual verdict: buffered / absent /
  // unreadable) rather than wait on a turn the message may sit behind without end
  if (input.deadlineReached)
    return {
      done: true,
      observation: {
        refusal: null,
        // the last read's own value, for the reason the branch above carries: a residual is
        // where a reader looks hardest, so it must not misstate what was measured
        transcriptRose: input.transcriptRose,
        screen: input.screen,
        probeReason: input.probeReason,
      },
    };

  // no terminal condition — poll again
  return { done: false };
};
