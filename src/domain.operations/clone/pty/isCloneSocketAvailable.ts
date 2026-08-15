import type { PtyModule } from './getPtyModuleOrNull';

/**
 * .what = decide whether a clone can ACTUALLY stand up a reach socket on this host
 * .why = socket reach needs three things at once: it must be WANTED (eligible by
 *   brain + interactivity, via isCloneSocketEligible), the pty addon must have
 *   loaded (ptyModule non-null), and a socket path must have resolved. a name for
 *   the three-part decision keeps genClone's spawn choice a single narrative line
 *   (rule.require.named-transformers) instead of an inline boolean the reader must
 *   simulate. the two decisions pair up: isCloneSocketEligible answers "should we"
 *   (policy); this answers "can we, here" (host capability).
 */
export const isCloneSocketAvailable = (input: {
  wantsSocket: boolean;
  ptyModule: PtyModule | null;
  socketPath: string | null;
}): boolean =>
  input.wantsSocket && input.ptyModule !== null && input.socketPath !== null;
