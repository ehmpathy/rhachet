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
 *   distinct: this one true yet the addon absent is the LOUD fallback, vs
 *   `--no-socket`/headless which is the QUIET expected fallback
 */
export const isCloneSocketEligible = (input: {
  brain: BrainSlug;
  interactive: boolean;
  noSocket: boolean;
}): boolean =>
  isBrainSocketCapable({ brain: input.brain }) &&
  input.interactive &&
  !input.noSocket;
