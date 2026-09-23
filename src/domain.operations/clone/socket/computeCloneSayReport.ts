import { isBrainCliClientCommand } from '../isBrainCliClientCommand';
import {
  type CloneProbeBlindReason,
  isCloneProbeBlindReason,
} from './asCloneGetReply';
import type { CloneSayOutcome } from './computeCloneSayVerdict';

/**
 * .what = the rendered face of a say outcome — a success line for stdout, or a failure copy
 *   the CLI throws on stderr with the right error class
 * .why = the verdict decides the channel: `released` / `enqueued` land on stdout at exit 0;
 *   `buffered` / `withheld` / `absent` / `unreadable` land on stderr, and the class sets the
 *   exit code (`constraint` = 2, a caller may amend it; `malfunction` = 1, a state to verify).
 *   pure, so the six-way map is tested without a socket
 */
export type CloneSayReport =
  | { channel: 'success'; tree: string }
  | {
      channel: 'failure';
      klass: 'constraint' | 'malfunction';
      message: string;
      hint: string;
    };

/**
 * .what = the human copy for a non-success verdict — one message + fix per reason slug
 * .why = the reasons owe different fixes: a dirty region MAY be forced; a modal or an
 *   unrecognized screen may NEVER be. so the copy names the one safe action per reason
 */
const REASON_COPY: Record<
  NonNullable<CloneSayOutcome['reason']> & string,
  { message: string; hint: string }
> = {
  'modal-holds-focus': {
    // the remedy must name a REACHABLE actor. an earlier copy said "wait for the human to clear
    // the modal" — but attendance is a MODE, never a reach, and detached is the default, so a
    // detached clone has NO tty a human could clear it at and the wait never ends. so the copy
    // splits by mode and states the detached dead-end outright (rule.require.errors-name-the-fix)
    message:
      'the clone has a modal open (a prompt or menu) — a say would answer it, so it was withheld',
    hint: 'a modal is never force-able. read what it asks with --debug; an attended clone clears it at its own tty, a detached clone has none, so no say lands until it is torn down',
  },
  'focus-unrecognized': {
    // 🔴 the SAME defect the modal copy above was repaired for: an earlier hint said "wait for the
    // clone to return to its input box", and BOTH measured causes of this state are PERMANENT — a
    // 0x0 pty geometry (asPtyGeometry, 2026-09-16) and a detached host with no tty
    // (genPtyCloneHostDetached, 2026-09-16). each leaves the band unfindable for the clone's whole
    // life, so a supervisor told to wait retries forever. the copy names the dead-end outright, and
    // the one act that clears it (rule.require.errors-name-the-fix)
    message:
      'the clone screen is unrecognized — the say was withheld rather than pasted blind',
    hint: 'an unrecognized screen is never force-able. read it with --debug; the measured causes are permanent (a 0x0 pty geometry, or a detached host with no tty), so a wait never clears them — tear the clone down and re-enroll it',
  },
  'input-region-dirty': {
    // 🔴 the hint names the READ, not only the two remedies. the wisher asked for it after a
    // refusal against their own box (2026-09-21): *"should this say what's in the input? … that
    // way the person who attempted to write can see what was inflight, and even see if the
    // message continues to expand or has paused"*. both halves are knowable, and the copy never
    // said so — a caller met a dead end at the one moment it had a way out.
    //
    // 🟡 the read it names is `clone get --what buffer`, NOT `--debug`. the two differ in width:
    // `--debug` hands back the whole viewport (every turn the brain rendered) and leaves the
    // caller to locate the band; `--what buffer` hands back the box rows alone, off the same
    // locator this refusal was decided on. a hint that points at the wider instrument asks a
    // human to sift a screen for the answer the narrow one prints
    //
    // 🟡 the growth read INFORMS, it does not decide: inert text is a human who paused OR foreign
    // output the brain has yet to redraw, and no read parts those two (see the `party` refutation,
    // cure 32). so the copy states both causes rather than a verdict it cannot earn
    message:
      'the clone input box holds uncommitted text (a human mid-type) — the say was withheld',
    hint: 'read the box with `clone get --what buffer`, twice a second apart: rows that GREW are a human mid-type; rows that held still are either a human who paused or stale output the brain has yet to redraw. then wait for it to clear, or re-send with --force (which clobbers whatever sits there)',
  },
  'input-region-holds-text': {
    message:
      'the message sits in the clone input box but the submit did not take',
    hint: 'do NOT re-send (it would append) — verify the clone accepts a submit, or retry with --await release',
  },
  'no-rise-observed': {
    // the copy NAMES the permission-prompt suspicion, where a hedge is legible (case=6 t3, V3):
    // this residual is post-write, so the probe cannot attribute a modal that has since closed —
    // it states only that no rise held anywhere and points at the most likely eater, a prompt
    message:
      'the message reached the pty and is on neither the input line nor the turn queue — a prompt may have consumed it; inspect the clone',
    hint: 'do NOT blind re-send (a prompt-consumed message would double) — verify the clone, then retry with --await release',
  },
  'feed-not-live': {
    message:
      'the clone screen feed is not live (a brand-new clone before its first chunk, or a clone with no screen emulator) and the transcript did not rise within the bound',
    hint: 'wait a moment and retry — a brand-new clone attaches its feed on its first output, so the message may have landed; if it recurs across retries the clone has no emulator to read its screen, so re-enroll on a build that carries one (a feed that faulted mid-run reports `feed-faulted`, not this)',
  },
  'feed-faulted': {
    message:
      'the clone screen feed faulted (its emulator threw) — the read is in doubt and the transcript did not rise within the bound',
    hint: 're-enroll the clone to rebuild the screen feed; a wait never clears a faulted emulator',
  },
  'peer-probe-blind': {
    message:
      'this clone predates the screen read channel, so it cannot answer a probe; the transcript did not rise within the bound',
    hint: 're-enroll the clone on a current version to read its screen state, or retry with a longer --await release bound',
  },
};

/**
 * .what = the ONE terse tree line appended to a released-but-probe-blind success, per cause
 * .why = the message DID land (transcript rose), so this is a happy-path success — the line
 *   stays a single terse advisory, never a verbose remedy essay (emphasis-noise). the full
 *   cause + remedy ride the json (`probe: 'unsupported'` + `reason`) for a machine reader; the
 *   human line only flags that the read degraded to transcript-only. one map keyed by the
 *   probe-blind set, narrowed via the shared guard, so a fourth reason is a compile error here
 *   rather than a silent fall to the wrong copy (r4.n1)
 */
/**
 * .what = narrow a wire `reason` to a probe-blind reason for the DEGRADE copy, milder-default
 * .why = a released-but-probe-blind success indexes DEGRADE_COPY by this reason. the message DID
 *   land, so an unknown wire value has no re-enroll hazard to fail-safe against — the milder
 *   `feed-not-live` copy (no action needed) is the honest default, distinct from the failure-path
 *   default which fails toward re-enroll (asCloneProbeBlindReasonFromWire). one named owner of
 *   that map, so the branch reads a call rather than an inline ternary (r3.n2)
 */
const asCloneDegradeReason = (input: {
  reason: unknown;
}): CloneProbeBlindReason =>
  isCloneProbeBlindReason(input.reason) ? input.reason : 'feed-not-live';

const DEGRADE_COPY: Record<CloneProbeBlindReason, string> = {
  'peer-probe-blind':
    '   └─ 🟡 probe-blind (older clone) — verified by transcript; re-enroll for the full read',
  'feed-faulted':
    '   └─ 🟡 feed faulted — verified by transcript; re-enroll to rebuild',
  'feed-not-live':
    '   └─ 🟡 feed not live — verified by transcript; self-heals as the feed attaches, else re-enroll (F24)',
};

/**
 * .what = map a decided say outcome to its rendered report — success line or failure copy
 * .why = the CLI reads THIS to decide the channel: render the success tree, or throw the
 *   failure with its class. the map is total over the six verdicts and pure, so a new
 *   verdict is a compile error here rather than a silent fall-through
 */
export const computeCloneSayReport = (input: {
  outcome: CloneSayOutcome;
  addressShown: string;
  /**
   * .what = the message as dispatched
   * .why = the `enqueued` advisory is only true of a PROMPT — a `/…` client command is consumed
   *   by the brain-cli at submit and never enters the model's turn queue, so the turn-hold and
   *   abort-risk clauses are both false for it (isBrainCliClientCommand). the reporter needs the
   *   message to tell the two classes apart
   */
  message: string;
}): CloneSayReport => {
  const { outcome, addressShown } = input;

  // released, probe-blind — the brain took it (transcript rose), but the screen read was
  // unavailable, so it is verified by the transcript ALONE. state the reduced guarantee on the
  // HUMAN surface too, never only in the json (case=4 t3, r9-b1). the remedy SPLITS by cause,
  // exactly as the failure path does (r9.n1): `peer-probe-blind` (an older daemon) and
  // `feed-faulted` (an emulator that threw) both need a RE-ENROLL to read future says; only
  // `feed-not-live` self-heals as the same-version feed attaches — a re-enroll would misstate its
  // fix (r008-i004-b1). the message landed either way, so the copy addresses future reads only
  if (outcome.verdict === 'released' && outcome.probe === 'unsupported') {
    // the reason rode the wire as a probe-blind cause; narrow via the named owner so an
    // unknown value falls to the milder `feed-not-live` copy rather than index the map blind
    const reason = asCloneDegradeReason({ reason: outcome.reason });
    return {
      channel: 'success',
      tree: [`😶🎙️ said to ${addressShown}`, DEGRADE_COPY[reason]].join('\n'),
    };
  }

  // released — the brain took it. the extant success line, byte-for-byte (V13)
  if (outcome.verdict === 'released')
    return { channel: 'success', tree: `😶🎙️ said to ${addressShown}` };

  // enqueued, a `/…` CLIENT command — the brain-cli consumes these at submit rather than hand them
  // to the model as a turn, so neither clause of the prompt advisory below holds: it is not queued
  // behind the active turn, and an abort of that turn cannot drop it.
  //
  // 🔴 measured 2026-09-20 against this session's own clone: `/model claude-sonnet-5[1m]` returned
  // `enqueued` with the turn-hold advisory, while the capture showed the client had ALREADY run it
  // mid-turn (`⎿ Set model to claude-sonnet-5[1m]`, two rows under the echo). so the advisory read
  // as a caveat and functioned as a fabrication, which is worse than silence
  // (rule.forbid.failhide). the screen read cannot tell the two apart — the echo of a consumed
  // command and the echo of a queued prompt occupy the same rows — so the MESSAGE decides
  if (
    outcome.verdict === 'enqueued' &&
    isBrainCliClientCommand({ message: input.message })
  )
    return {
      channel: 'success',
      tree: [
        `😶🎙️ enqueued for ${addressShown} — a /… client command; the client takes it at submit`,
        '   └─ 🟡 a client command is consumed by the brain-cli itself, never queued as a model turn — so it is not held behind the active turn, and an aborted turn cannot drop it',
      ].join('\n'),
    };

  // enqueued — held above the input line, not yet taken. a distinct success line that names the
  // hold, so a caller reads that the brain will take it on the next turn. the SECOND line discloses
  // the non-durability the vision names: a caller told not to re-send an `enqueued` must know the
  // hold dies with an aborted turn (ctrl-C, crash, prune). that disclosure rides the HUMAN surface,
  // never only the json (r010-i011-n2) — a human who reads "lands next" alone would trust a hold
  // that a ctrl-C silently drops
  if (outcome.verdict === 'enqueued')
    return {
      channel: 'success',
      tree: [
        `😶🎙️ enqueued for ${addressShown} — mid-turn; lands next`,
        '   └─ 🟡 held behind the active turn, not yet taken — if that turn is aborted (ctrl-C, crash, prune) the hold dies with it, unsent',
      ].join('\n'),
    };

  // a non-success verdict always carries a reason from computeCloneSayVerdict; a null here is a
  // defect, so render an honest "reason unavailable" rather than fabricate a cause that never held
  if (outcome.reason === null)
    return {
      channel: 'failure',
      klass: outcome.verdict === 'withheld' ? 'constraint' : 'malfunction',
      message: `the say did not succeed (verdict: ${outcome.verdict}) but reported no reason`,
      hint: 'unexpected — retry once; report it if the verdict persists',
    };

  // withheld — a caller MAY amend it (clear the modal, wait, or --force a dirty box)
  if (outcome.verdict === 'withheld')
    return {
      channel: 'failure',
      klass: 'constraint',
      ...REASON_COPY[outcome.reason],
    };

  // buffered / absent / unreadable — a state to verify, never a caller input fault (exit 1)
  return {
    channel: 'failure',
    klass: 'malfunction',
    ...REASON_COPY[outcome.reason],
  };
};
