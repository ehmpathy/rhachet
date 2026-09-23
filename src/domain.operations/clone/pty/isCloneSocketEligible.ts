import type { BrainSlug } from '@src/domain.objects/BrainSlug';

import { isBrainSocketCapable } from '../../brain/isBrainSocketCapable';

/**
 * .what = should this enroll stand up a managed-pty socket for the clone?
 * .why =
 *   - the socket is a per-brain adapter, not a universal mechanism. two facts must
 *     BOTH hold for it to make sense: the brain can carry one, and the caller did
 *     not opt out via `--no-socket`. either false → the plain-spawn fallback
 *     (socketEligible=false)
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
 *   | false (`--no-socket`, non-capable brain) | — | a QUIET plain-spawn **fallback** — a real second path |
 *   | true | ❌ | a LOUD **omission** — no clone is made at all |
 *
 * ⚠️ only the first row is a `fallback`; the second takes no second path, which is why
 *   its value is a `CloneSocketOmissionReason` rather than a fallback
 *   (`term=fallback._.choice.reason.md`, the RESOLVED dispute)
 *
 * 🔴 .note = an attendance axis sat here until 2026-09-16 — first as `interactive`
 *   (a bare `process.stdout.isTTY` read), then widened to `attended`. BOTH were
 *   wrong, and the widen was a cure one layer too shallow: it kept attendance in the
 *   gate and merely grew what counts as attendance, so the residue re-opened for the
 *   next caller (a cron, a hook, a supervisor — attended by no one, and each fully
 *   intends to `say`).
 *
 *   the measured cost was not a wasted socket. the same gate decides whether a PTY
 *   is taken at all, so a `false` here handed the brain-cli a non-tty stdin, which
 *   auto-enabled `--print`, which died with no prompt argument — no clone at all,
 *   never merely a deaf one.
 *
 *   ⇒ attendance decides the MODE (watch vs async), never the REACH:
 *   `define.invariant.clone-attendance-is-a-mode-never-a-reach`
 */
export const isCloneSocketEligible = (input: {
  brain: BrainSlug;
  noSocket: boolean;
}): boolean => isBrainSocketCapable({ brain: input.brain }) && !input.noSocket;
