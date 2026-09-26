import { execFileSync } from 'node:child_process';
import { asAskpassEnv } from './asAskpassEnv';
import { asExecFailureError } from './asExecFailureError';
import { SSH_INTERACTIVE_TIMEOUT_MS } from './sshExecTimeouts';

/**
 * .what = load an ssh key into a given agent, prompt via the gnome dialog
 * .why  = this is where the native passphrase prompt happens (vision q2): once
 *         per invocation, ssh-add loads the key into the ephemeral agent, and a
 *         passphrased key pops the Wayland-native dialog — the passphrase never
 *         touches the tty
 *
 * .note = the key is loaded ONLY into the caller's agent (via `sock`), never the
 *         persistent gcr-ssh-agent, so it dies with the ephemeral agent
 * .note = a passphrase-less key loads with no prompt (SSH_ASKPASS is moot)
 * .note = error class per rule.require.exit-code-semantics: a non-zero ssh-add
 *         exit (numeric `.status`) is a CALLER-fixable condition — a wrong or
 *         cancelled passphrase, or no graphical session for the dialog to render —
 *         so it is a ConstraintError (exit 2) whose message + hint name all three
 *         caller-fixable causes, so a wrapper can tell "the human must act" from
 *         "the tool broke". these three cannot be told apart reliably here:
 *         SSH_ASKPASS_REQUIRE=force runs the askpass program even with no display,
 *         so a headless failure and a cancelled dialog both surface as the same
 *         non-zero exit — the message names both rather than misreport one as the
 *         other. a spawn fault (ssh-add absent, killed by the timeout) has no
 *         numeric status and is a genuine MalfunctionError (exit 1). never a silent
 *         swallow, never a tty prompt
 */
export const setSshKeyIntoAgent = async (input: {
  sock: string;
  keyPath: string;
  dialog: string;
}): Promise<void> => {
  try {
    execFileSync('ssh-add', [input.keyPath], {
      stdio: 'pipe',
      env: {
        ...asAskpassEnv({ dialog: input.dialog }),
        SSH_AUTH_SOCK: input.sock,
      },
      // bound the load so an unanswered askpass dialog can never wedge forever;
      // the interactive tier (blocks on the human at the dialog)
      timeout: SSH_INTERACTIVE_TIMEOUT_MS,
    });
  } catch (error) {
    // classify via the shared askpass-exec classifier (asExecFailureError): a numeric
    // ssh-add exit = RAN + rejected = caller-fixable ConstraintError; a spawn fault
    // (absent, timeout-killed) = MalfunctionError (rule.require.exit-code-semantics)
    throw asExecFailureError({
      error,
      ranButRejected: {
        message:
          'ssh-add could not load the key — the passphrase was wrong or cancelled, or there is no graphical session for the dialog',
        metadata: { keyPath: input.keyPath, sock: input.sock },
      },
      spawnFault: {
        message: 'ssh-add failed to load the key into the agent',
        metadata: { keyPath: input.keyPath, sock: input.sock },
      },
    });
  }
};
