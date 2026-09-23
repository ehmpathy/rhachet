import type { CloneWithheldReason } from './computeCloneDispatchPrecheck';
import type { CloneSayObservation } from './computeCloneSayVerdict';

/**
 * .what = the observation a server-refused dispatch yields — a refusal, no rise, no screen
 * .why = a `withheld` refusal is decided SERVER-SIDE at the dequeue pre-check, so no bytes
 *   reached the pty and no state is left to observe: the transcript did not rise, the screen
 *   is null (never read), and there is no probe-blind cause. named so the orchestrator's
 *   deliver-or-refuse branch reads two named arms rather than an inline literal a reader must
 *   simulate (rule.forbid.decode-friction-in-orchestrators)
 */
export const asCloneSayRefusalObservation = (input: {
  refusal: CloneWithheldReason;
}): CloneSayObservation => ({
  refusal: input.refusal,
  transcriptRose: false,
  screen: null,
  probeReason: null,
});
