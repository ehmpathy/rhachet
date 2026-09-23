import type {
  CloneFocus,
  CloneInputRegion,
} from '../screen/computeCloneInputState';
import type { CloneProbeBlindReason } from './asCloneGetReply';
import type { CloneWithheldReason } from './computeCloneDispatchPrecheck';

/**
 * .what = the one verdict a `say` lands on — a state of the input triple
 *   (buffered → enqueued → released), or a refusal orthogonal to it
 * .why = a transcript-only verify has ONE word for "not in the transcript" — it reads as
 *   "the brain never took it" — so a message the brain merely QUEUED reads as a false
 *   failure. these six verdicts part "not yet" from "never", so a caller's retry policy is
 *   writable (the wish's loudest benefit). each coined word owes a `domain.terms/` cluster
 */
export type CloneSayVerdict =
  | 'released'
  | 'enqueued'
  | 'buffered'
  | 'withheld'
  | 'absent'
  | 'unreadable';

/**
 * .what = the reason a non-success verdict landed as it did — a CLOSED slug set a caller
 *   branches on for the safe action
 * .why = the retry contract is three-way, and `reason` is what parts the branches within
 *   `withheld`: an `input-region-dirty` refusal MAY be forced; a `modal-holds-focus` one
 *   may NEVER be. `enqueued` carries a null reason — there is no safe action to brief. a
 *   `released` read on a live screen carries null too, but a probe-blind `released` (verified
 *   by transcript alone) carries WHICH cause — `feed-not-live` vs `peer-probe-blind` — so the
 *   report names the right remedy on the success surface (self-heals vs re-enroll)
 *
 * .note = COMPOSED from its constituents, never re-spelled: the withheld refusals
 *   (`CloneWithheldReason`, owned by the pre-check) and the probe-blind causes
 *   (`CloneProbeBlindReason`, owned by the get reply) flow in by reference, plus the two
 *   say-only slugs. so a future withheld/probe-blind reason reaches this set by construction —
 *   no remembered hand-edit at three layers (r011-i007-n2)
 */
export type CloneSayReason =
  | CloneWithheldReason
  | CloneProbeBlindReason
  | 'input-region-holds-text'
  | 'no-rise-observed';

/**
 * .what = the decided say outcome — the verdict, its reason, the probe strength, and
 *   whether the bytes were handed to the pty
 * .why = `verdict` is the discriminator a retry policy reads; `reason` is the safe-action
 *   slug; `probe` states the verdict's STRENGTH (a capable read vs a degraded guess),
 *   always present so a consumer never needs an `in` check; `delivered` keeps its extant
 *   sense (bytes handed to the pty) so no caller of the machine channel breaks (V13)
 */
export interface CloneSayOutcome {
  verdict: CloneSayVerdict;
  reason: CloneSayReason | null;
  probe: 'capable' | 'unsupported';
  delivered: boolean;
}

/**
 * .what = the observations a verdict is computed from — the server's dispatch outcome, the
 *   transcript rise (the `released` basis), and the post-bound screen read (null when the
 *   feed was not live)
 * .why = every field is a RISE, never a presence: a daemon repeats one text, so a prior
 *   tick's echo sits on screen; only a pre-write baseline compared against a post-bound
 *   read parts "the old echo" from "the old echo plus ours"
 */
export interface CloneSayObservation {
  /**
   * .what = the server's dequeue pre-check refusal, or null when the bytes were delivered
   * .why = a refusal is decided SERVER-SIDE at dequeue (the read must be current at the
   *   write, never stale by the queue depth). `--force` overrides an `input-region-dirty`
   *   refusal server-side, so this is already null in that case; a `modal-holds-focus` or
   *   `focus-unrecognized` refusal has no force path and reaches here intact (V3, case=6)
   */
  refusal: CloneWithheldReason | null;
  /**
   * .what = did the transcript submit-count rise within the bound — proof the message was
   *   SUBMITTED, and no more
   * .why = 🔴 the brain writes each user turn to the jsonl the moment it is submitted, NOT when
   *   it is released (`getCloneSubmittedCount.ts:12-14`, and measured against a live peer
   *   2026-09-18: a message visibly held in the queue region raised this count within 678ms).
   *   so a rise cannot part `enqueued` from `released` — it is satisfied by both. the
   *   `released` claim needs a rise AND an empty queue (`screen.queued`), which is why this
   *   field alone no longer terminates the decision
   */
  transcriptRose: boolean;
  /**
   * .what = the post-bound screen read, or null when the feed was not live (probe-blind)
   * .why = a null screen is the honest degrade `unreadable` rests on — never a false
   *   `absent` read off a blank grid (V7)
   */
  screen: {
    focus: CloneFocus;
    input: CloneInputRegion;
    countInInputRose: boolean;
    countOnScreenRose: boolean;
    /**
     * .what = the brain's queue is non-empty — a submitted message is held, unreleased
     * .why = the one observation that parts `enqueued` from `released`, since the transcript
     *   rise is satisfied by both (see `transcriptRose` above). NOT a rise: a queue is a
     *   present-tense state, and the baseline cannot help — a queue that was non-empty before
     *   the write still holds a message now
     */
    queued: boolean;
  } | null;
  /**
   * .what = why the read was probe-blind, when `screen` is null — else null
   * .why = `unreadable` has three distinct causes with different remedies: `feed-not-live` (a
   *   same-version feed not yet attached, wait), `feed-faulted` (a same-version emulator that
   *   threw, re-enroll), and `peer-probe-blind` (an older daemon that cannot answer a probe,
   *   re-enroll). the report copy names the right fix off THIS, never a single misstated cause
   *   (r9.n1). a non-null screen carries no probe-blind reason
   */
  probeReason: CloneProbeBlindReason | null;
}

/**
 * .what = is a screen read the `enqueued` SHAPE — focus input, region clear, screen count rose
 * .why = the brain HOLDS the message above the input line IFF all THREE hold: a single read would
 *   call an eaten paste (case=6) `enqueued`. ONE owner for the three-condition conjunct, reused by
 *   the observe poll (which short-circuits the `enqueue` target on it) and the verdict compute
 *   below — so the contract shape reads as a named call, never a re-derivation (r4-n1)
 */
export const isCloneSayEnqueuedShape = (input: {
  screen: CloneSayObservation['screen'];
}): boolean =>
  input.screen !== null &&
  input.screen.focus === 'input' &&
  input.screen.input === 'clear' &&
  input.screen.countOnScreenRose;

/**
 * .what = decide one `say` dispatch to exactly one verdict, from its observations
 * .why = this IS the six-verdict decision, pure and in one place — so the CLI, the machine
 *   channel, and every test read one contract. the branches are ordered by strength, first
 *   match wins, and `absent` is the residual
 *
 * .note = the order is NOT the vision's textual list — `withheld` is checked first because
 *   it is structurally exclusive (a refusal means NO write happened, so there is no rise to
 *   read), and `unreadable` precedes the screen verdicts because a null screen cannot yield
 *   `enqueued`/`buffered`/`absent` at all. within the readable branches the vision's ranking
 *   holds: `released` outranks `enqueued`, which outranks `buffered`
 *
 * .note = 🔴 the vision justified that ranking as *"a transcript rise is the stronger
 *   observation"*, and the premise was refuted by measurement on 2026-09-18: the brain writes
 *   the user turn on SUBMIT, so a rise is satisfied by `enqueued` and `released` alike. the
 *   RANK is unchanged — `released` is still the stronger claim — but its BASIS is now a rise
 *   plus an empty queue, never a rise alone. see `transcriptRose` and the branch itself
 */
export const computeCloneSayVerdict = (
  input: CloneSayObservation,
): CloneSayOutcome => {
  const probe: 'capable' | 'unsupported' =
    input.screen !== null ? 'capable' : 'unsupported';

  // withheld — the server refused at the pre-check, so no bytes reached the pty. a refusal
  // is read off a LIVE screen server-side, so the strength is capable regardless of the
  // client's own post-probe. `delivered: false` — the one verdict where no write happened
  if (input.refusal !== null)
    return {
      verdict: 'withheld',
      reason: input.refusal,
      probe: 'capable',
      delivered: false,
    };

  // released — the brain TOOK it: the transcript gained the user turn AND the queue is empty.
  //
  // 🔴 the second clause is load-bearing, and its absence was a mislabel on a shipped verdict.
  //   the brain writes the user turn on SUBMIT, so a rise alone is satisfied by `enqueued` too
  //   (see `transcriptRose`); with `released` checked on the rise alone it won every busy
  //   dispatch and `enqueued` was unreachable in production — measured 2026-09-18 against a
  //   live peer mid-turn, which reported `released` for a message rendered in its queue region.
  //   `--await release` then returned on a submit, so the knob never waited for a release
  //
  // a PROBE-BLIND read (screen null) still lands `released` off the transcript alone: it is the
  // strongest read available to a peer that cannot answer a probe, and to withhold the verdict
  // there would break case=4's honest degrade. so the queue gate binds a CAPABLE read only —
  // exactly where the queue is knowable. such a read carries WHICH probe-blind cause so the
  // report splits its remedy — `feed-not-live` self-heals as the feed attaches, whereas
  // `peer-probe-blind` needs a re-enroll to read future says (r008-i004-b1 / r9.n1 on success)
  if (input.transcriptRose && (input.screen === null || !input.screen.queued))
    return {
      verdict: 'released',
      reason:
        input.screen === null ? (input.probeReason ?? 'feed-not-live') : null,
      probe,
      delivered: true,
    };

  // unreadable — the bound elapsed and no live read was available, so no screen verdict is
  // reachable. the honest degrade `unreadable` rests on, never a false `absent` (V7). the
  // reason names the distinct cause (feed-not-live vs peer-probe-blind); default to
  // feed-not-live when a null screen carried no reason
  if (input.screen === null)
    return {
      verdict: 'unreadable',
      reason: input.probeReason ?? 'feed-not-live',
      probe: 'unsupported',
      delivered: true,
    };

  // enqueued — the brain HOLDS it above the input line: focus is input (no modal ate it),
  // the input region went clear (our text left it), AND the screen count rose (it is now a
  // queued turn). all THREE, via the one owner of the conjunct — a single read would call an
  // eaten paste (case=6) enqueued
  if (isCloneSayEnqueuedShape({ screen: input.screen }))
    return { verdict: 'enqueued', reason: null, probe, delivered: true };

  // buffered — our text still sits in the input region (its count rose there). the bytes
  // were written but the submit did not take, so a re-send would APPEND and wedge — verify
  // later, never re-send blind
  if (input.screen.countInInputRose)
    return {
      verdict: 'buffered',
      reason: 'input-region-holds-text',
      probe,
      delivered: true,
    };

  // absent — the residual: bytes were handed off, yet no rise held anywhere. the write
  // happened (so no pty re-send is owed), but no read confirms where the message went
  return {
    verdict: 'absent',
    reason: 'no-rise-observed',
    probe,
    delivered: true,
  };
};
