import type { BrainSlug } from '@src/domain.objects/BrainSlug';

import { isBrainSocketCapable } from '../../brain/isBrainSocketCapable';

/**
 * .what = should this enroll stand up a managed-pty socket for the clone?
 * .why =
 *   - the socket is a per-brain adapter, not a universal mechanism. three facts
 *     must ALL hold for it to make sense: the brain can carry one, the enroll is
 *     interactive (a human to mirror), and the human did not opt out via
 *     `--no-socket`. any one false → the plain-spawn fallback (socketEligible=false)
 *   - one named transformer for this composite keeps the genClone orchestrator a
 *     narrative — it asks "is this clone socket-eligible?" instead of an inline
 *     three-way AND (rule.forbid.decode-friction-in-orchestrators)
 *
 * .note = this is the DESIGN-TIME gate (brain + intent). a SECOND runtime gate —
 *   whether the pty addon actually loads on this host (getPtyModuleOrNull) — is
 *   distinct, and the two produce OPPOSITE outcomes:
 *
 *   | this gate | the addon loads | outcome |
 *   |---|---|---|
 *   | false (`--no-socket`, headless, non-capable brain) | — | a QUIET plain-spawn **fallback** — a real second path |
 *   | true | ❌ | a LOUD **omission** — no clone is made at all |
 *
 * ⚠️ only the first row is a `fallback`; the second takes no second path, which is why
 *   its value is a `CloneSocketOmissionReason` rather than a fallback
 *   (`term=fallback._.choice.reason.md`, the RESOLVED dispute)
 */
export const isCloneSocketEligible = (input: {
  brain: BrainSlug;
  interactive: boolean;
  noSocket: boolean;
}): boolean =>
  isBrainSocketCapable({ brain: input.brain }) &&
  input.interactive &&
  !input.noSocket;
