import { execFileSync } from 'node:child_process';
import { copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { asAskpassEnv } from './asAskpassEnv';
import { asExecFailureError } from './asExecFailureError';
import { SSH_INTERACTIVE_TIMEOUT_MS } from './sshExecTimeouts';

/**
 * .what = strip the passphrase from a passphrased ssh key into a decrypted copy,
 *         prompting for the passphrase via the mandated gnome dialog (never the tty)
 * .why  = a passphrased rsa/ecdsa key cannot back the deterministic sign-as-KDF derive
 *         (vision q4 = ed25519-only), so it decrypts via `age -d -i`. but age reads the
 *         key passphrase from /dev/tty directly — the exact garbled-prompt UX the wish
 *         set out to kill (vision q2). ssh-keygen -p, by contrast, honors SSH_ASKPASS
 *         (same read_passphrase() as ssh-add), so keyrack strips the passphrase via the
 *         Wayland-native dialog into a decrypted copy, then hands THAT to age — the
 *         passphrase never touches the tty, matching the ed25519 dialog posture
 *
 * .note = the decrypted copy is written INTO the caller's private 0700 temp dir, so the
 *         caller's own cleanup removes it; it is never left beside the real key
 * .note = the passphrase flows dialog → ssh-keygen internally; it never enters this
 *         process, an argv, or an env var (SSH_ASKPASS names the dialog, not the secret)
 * .note = error class per rule.require.exit-code-semantics: a numeric ssh-keygen exit
 *         (RAN + rejected — wrong/cancelled passphrase, or no graphical session for the
 *         dialog) is a CALLER-fixable ConstraintError (exit 2); a spawn fault (ssh-keygen
 *         absent, killed by the timeout — no numeric status) is a MalfunctionError (exit 1)
 */
export const asDecryptedSshKeyCopy = (input: {
  keyPath: string;
  dialog: string;
  intoDir: string;
}): string => {
  // the decrypted copy lives in the caller's private 0700 dir; copy preserves the
  // source key's 0600 perms, so the plaintext key is never world-readable
  const copyPath = join(input.intoDir, 'decrypted-key');
  copyFileSync(input.keyPath, copyPath);

  try {
    // ssh-keygen -p changes the passphrase of the copy IN PLACE: -N '' sets the new
    // passphrase to empty (strip it), and the OLD passphrase is read via the gnome
    // dialog under SSH_ASKPASS_REQUIRE=force — never the tty. argv-only (never a shell
    // string) so a path can never be interpreted as shell syntax
    execFileSync('ssh-keygen', ['-p', '-f', copyPath, '-N', ''], {
      stdio: 'pipe',
      env: asAskpassEnv({ dialog: input.dialog }),
      // bound the strip so an unanswered dialog can never wedge unlock forever;
      // the interactive tier (blocks on the human at the dialog), shared with ssh-add
      timeout: SSH_INTERACTIVE_TIMEOUT_MS,
    });
    return copyPath;
  } catch (error) {
    // classify via the shared askpass-exec classifier (asExecFailureError): a numeric
    // ssh-keygen exit = RAN + rejected = caller-fixable ConstraintError; a spawn fault
    // (absent, timeout-killed) = MalfunctionError (rule.require.exit-code-semantics)
    throw asExecFailureError({
      error,
      ranButRejected: {
        message:
          'ssh-keygen could not decrypt the key — the passphrase was wrong or cancelled, or there is no graphical session for the dialog',
        metadata: { keyPath: input.keyPath },
      },
      spawnFault: {
        message: 'ssh-keygen failed to decrypt the key',
        metadata: { keyPath: input.keyPath },
      },
    });
  }
};
