import type { CloneGetReply } from './asCloneGetReply';

/**
 * .what = the pre-dispatch baseline every say verdict is a RISE against — the transcript
 *   submit-count and the two screen counts, read BEFORE the write
 * .why = every verdict field is a rise (a post read compared against this), never a
 *   presence; a daemon repeats one text, so a prior tick's echo must not read as this
 *   dispatch
 */
export interface CloneSayBaseline {
  transcriptCount: number;
  /**
   * .what = the pre-dispatch input-region count, or null when the baseline probe was blind
   * .why = a probe-blind baseline holds NO measured count — it is unmeasured, never zero. so
   *   a rise cannot be asserted against it (`asCloneObservationScreen` reads null as "no rise")
   */
  countInInput: number | null;
  /** .what = the pre-dispatch screen count, or null when the baseline probe was blind (as above) */
  countOnScreen: number | null;
}

/**
 * .what = derive the pre-dispatch baseline from the transcript count and the baseline probe
 *   reply
 * .why = a probe-blind reply carries no counts, so the ternary is a decode-friction the
 *   orchestrator should not inline — a named derivation states "an unsupported probe
 *   contributes an unmeasured baseline" once, where a reader grasps it without simulation
 *
 * .note = a probe-blind baseline collapses to `null`, NEVER `0`. the distinction is
 *   safety-relevant: a zero baseline reads as "the screen held no content before this
 *   dispatch", so a prior tick's echo already on the viewport (a daemon repeats one text —
 *   invariant 6) would rise `1 > 0` against it and mint a FALSE `enqueued` on a message the
 *   brain dropped — the one verdict whose retry advice is no-resend, so the drop is never
 *   retried (r006-i010-b1). a `null` baseline is unmeasured: a later capable read cannot claim
 *   a rise against it, so the verdict falls to the honest `absent` residual, and a probe-blind
 *   dispatch verifies by transcript regardless (case=4)
 */
export const computeCloneSayBaseline = (input: {
  transcriptCount: number;
  probe: CloneGetReply;
}): CloneSayBaseline => ({
  transcriptCount: input.transcriptCount,
  countInInput:
    input.probe.probe === 'capable' ? input.probe.state.countInInput : null,
  countOnScreen:
    input.probe.probe === 'capable' ? input.probe.state.countOnScreen : null,
});
