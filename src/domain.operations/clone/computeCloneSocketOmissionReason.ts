import type { PtyModule } from './pty/getPtyModuleOrNull';

/**
 * .what = why a wanted socket was OMITTED — an absent pty addon vs a host that cannot
 *   open a socket — or null when the socket was delivered (or was never asked for)
 *
 * ⚠️ never rename to `fallback` — no second path is ever taken here; every non-null value
 *   ends in a throw. settled dispute: `term=fallback._.choice.reason.md`.
 */
export type CloneSocketOmissionReason = 'pty-absent' | 'host-incapable' | null;

/**
 * .what = classify WHY a wanted socket was omitted, from the three spawn facts, so
 *   genClone reads as narrative instead of a nested ternary
 * .why =
 *   - genClone is an orchestrator; an inline nested ternary forces a reader to
 *     simulate the branch logic to learn the outcome (decode-friction). a named
 *     transformer lets the call site state WHAT (the omission's reason), not HOW
 *   - both reasons drive the SAME loud report (no clone is made) but name different
 *     downstream fixes: 'pty-absent' → install the pty addon; 'host-incapable' → the
 *     host cannot open a unix socket (no getuid, e.g. a non-POSIX host)
 *
 * ⚠️ this value names the reason ALONE. it deliberately makes no claim about the party,
 *   the exit code, or whether a human can repair it — `asCloneSocketOmissionReasonError`
 *   owns that decision, and it needs the platform to make it. a value that pre-judged the
 *   party would put a second owner on the split.
 *
 * .note = pure: a plain boolean/null classification, no i/o
 */
export const computeCloneSocketOmissionReason = (input: {
  wantsSocket: boolean;
  socketEligible: boolean;
  ptyModule: PtyModule | null;
}): CloneSocketOmissionReason => {
  // a delivered socket — or one that was never asked for — was not omitted, so it has
  // no reason to report
  if (!input.wantsSocket || input.socketEligible) return null;

  // wanted-but-unavailable: an absent addon, else an incapable host
  return input.ptyModule === null ? 'pty-absent' : 'host-incapable';
};
