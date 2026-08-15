import type { PtyModule } from './pty/getPtyModuleOrNull';

/**
 * .what = why a wanted socket is unavailable — an absent pty addon vs a host that
 *   cannot open a socket — or null when the socket is available (or was never wanted)
 */
export type CloneSocketFallback = 'pty-absent' | 'host-incapable' | null;

/**
 * .what = classify the socket-fallback cause from the three spawn facts, so genClone
 *   reads as narrative instead of a nested ternary
 * .why =
 *   - genClone is an orchestrator; an inline nested ternary forces a reader to
 *     simulate the branch logic to learn the outcome (decode-friction). a named
 *     transformer lets the call site state WHAT (the fallback cause), not HOW
 *   - both causes drive the SAME loud fallback (say/get disabled) but name different
 *     downstream fixes: 'pty-absent' → install the pty addon; 'host-incapable' → the
 *     host cannot open a unix socket (no getuid, e.g. a non-POSIX host)
 *
 * .note = pure: a plain boolean/null classification, no i/o
 */
export const computeCloneSocketFallback = (input: {
  wantsSocket: boolean;
  socketEligible: boolean;
  ptyModule: PtyModule | null;
}): CloneSocketFallback => {
  // an available socket — or one that was never wanted — has no fallback
  if (!input.wantsSocket || input.socketEligible) return null;

  // wanted-but-unavailable: an absent addon, else an incapable host
  return input.ptyModule === null ? 'pty-absent' : 'host-incapable';
};
