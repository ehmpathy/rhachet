import { ConstraintError, MalfunctionError } from 'helpful-errors';

/**
 * .what = classify a caught execFileSync error from an askpass-driven ssh tool
 *         (ssh-add / ssh-keygen -p) into the right helpful-error to throw
 * .why  = both askpass-driven exec callers (setSshKeyIntoAgent, asDecryptedSshKeyCopy)
 *         share ONE classification, so they must not drift apart: a numeric exit means
 *         the tool RAN and rejected = a CALLER-fixable ConstraintError (wrong/cancelled
 *         passphrase, or no graphical session for the dialog); no numeric status means a
 *         spawn/tool fault = MalfunctionError (rule.require.exit-code-semantics)
 *
 * .note = an already-classified error (Constraint/Malfunction) passes through unchanged
 * .note = three outcomes, each with its own fix-hint:
 *         (1) numeric exit → the tool RAN and rejected → caller-fixable ConstraintError
 *             (wrong/cancelled passphrase, or no graphical session for the dialog);
 *         (2) killed by a signal → the interactive timeout fired while the human was at
 *             the dialog → caller-fixable ConstraintError (retry, respond faster) — NOT a
 *             spawn fault, so it must never say "reinstall openssh";
 *         (3) no numeric status and not signal-killed → a genuine spawn/tool fault →
 *             MalfunctionError that cites the openssh-client install (rule.require.exit-code-semantics)
 * .note = returns the error to throw (never throws itself), so the caller keeps its own
 *         `throw` at the call site and the narrative stays flat
 */
export const asExecFailureError = (input: {
  error: unknown;
  ranButRejected: { message: string; metadata: Record<string, unknown> };
  spawnFault: { message: string; metadata: Record<string, unknown> };
}): Error => {
  const { error } = input;

  // pass an already-classified error through unchanged
  if (error instanceof MalfunctionError) return error;
  if (error instanceof ConstraintError) return error;

  // a numeric exit status means the tool RAN and rejected — caller-fixable
  const hasNumericStatus =
    typeof (error as { status?: unknown }).status === 'number';
  if (hasNumericStatus)
    return new ConstraintError(input.ranButRejected.message, {
      ...input.ranButRejected.metadata,
      hint: 'retry and enter the correct passphrase on a local desktop session; the passphrase dialog is a local-desktop feature',
    });

  // killed by a signal (no numeric status, but .killed / .signal set) means the
  // interactive timeout fired while the human was at the dialog — caller-fixable, NOT a
  // spawn fault. it must NOT tell the human to reinstall openssh (the tools ran fine;
  // the human just did not respond in time)
  const wasSignalKilled =
    (error as { killed?: unknown }).killed === true ||
    typeof (error as { signal?: unknown }).signal === 'string';
  if (wasSignalKilled)
    return new ConstraintError(input.ranButRejected.message, {
      ...input.ranButRejected.metadata,
      reason: error instanceof Error ? error.message : String(error),
      hint: 'the passphrase dialog timed out; retry and respond to the prompt on a local desktop session',
    });

  // no numeric status and not signal-killed → a genuine spawn/tool fault
  return new MalfunctionError(input.spawnFault.message, {
    ...input.spawnFault.metadata,
    reason: error instanceof Error ? error.message : String(error),
    hint: 'confirm the openssh client tools (ssh-add, ssh-keygen) are installed and on PATH; on debian/ubuntu: sudo apt install openssh-client',
  });
};
