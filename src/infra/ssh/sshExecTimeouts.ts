/**
 * .what = the three semantic timeout tiers for the ssh/age child processes
 *         keyrack shells to, named once so all prod call sites share one source
 * .why  = the same three literals (10s / 30s / 120s) were repeated across ~8 prod
 *         files, each a bare magic number a reader had to re-decode and a maintainer
 *         had to keep in sync by hand. one named tier per semantic class makes the
 *         intent legible at the call site and gives a single place to audit/tune
 *
 * .note = the tiers are semantic, not arbitrary — each names WHY its bound differs:
 *         a probe is a fast local lookup, an exec does real cpu work, an interactive
 *         wait blocks on a human at a passphrase dialog. do NOT collapse them to one
 *         value; the spread is the point (a probe hung past 10s is wedged, but a
 *         human at a dialog legitimately needs far longer)
 */

/**
 * .what = probe/lookup tier — `which`, version checks, agent-list
 * .why  = these are fast local lookups; a call unreturned past this is wedged,
 *         not slow, so a short bound surfaces the hang loud
 */
export const SSH_PROBE_TIMEOUT_MS = 10_000;

/**
 * .what = exec tier — ssh-keygen -Y sign, the age cli decrypt
 * .why  = real cpu work (a signature, a decrypt) that is still non-interactive;
 *         longer than a probe, but no step here waits on a human
 */
export const SSH_EXEC_TIMEOUT_MS = 30_000;

/**
 * .what = interactive-wait tier — ssh-add / ssh-keygen -p (block on the dialog)
 * .why  = these block synchronously while the human types a passphrase into the
 *         gnome dialog, so the bound is a generous human-load budget, not a tight
 *         machine one — a timeout mid-passphrase would truncate a credential entry
 */
export const SSH_INTERACTIVE_TIMEOUT_MS = 120_000;
