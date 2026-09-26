import { execFileSync } from 'node:child_process';
import { isCommandNotFoundError } from './isCommandNotFoundError';
import { SSH_PROBE_TIMEOUT_MS } from './sshExecTimeouts';

/**
 * .what = list ssh keys from ssh-agent with their pubkeys
 * .why = enables recipient-based identity discovery
 *
 * .note = uses `ssh-add -L` to enumerate agent keys
 * .note = an empty agent (`ssh-add -L` exits non-zero: 1 "no identities", 2 "no
 *         agent connection") is a benign no-keys result → []. a genuine spawn
 *         fault (ssh-add absent → ENOENT, or a signal) has NO numeric status, so
 *         it surfaces loud instead of a silent [] (rule.forbid.failhide)
 * .note = execFileSync + argv array (never a shell string) + a bounded 10s timeout
 *         so a wedged agent cannot block the event loop indefinitely — the same
 *         no-shell + timeout hygiene as setSshKeyIntoAgent / getOneAgentSignature
 */
export const getAllSshAgentKeys = (): Array<{
  pubkey: string;
  comment: string;
}> => {
  try {
    const output = execFileSync('ssh-add', ['-L'], {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: SSH_PROBE_TIMEOUT_MS,
    });

    // parse output: one key per line, format: "type base64 comment"
    const lines = output.trim().split('\n').filter(Boolean);

    return lines.map((line) => {
      const parts = line.trim().split(/\s+/);
      const [keyType, base64Data, ...commentParts] = parts;

      // reconstruct the pubkey (type + base64)
      const pubkey = `${keyType} ${base64Data}`;
      const comment = commentParts.join(' ') || '';

      return { pubkey, comment };
    });
  } catch (error) {
    // allowlist ONLY the expected empty-agent exits (ssh-add ran, exited
    // non-zero → a numeric status); any other fault is real and rethrows
    if (isCommandNotFoundError(error)) return [];
    throw error;
  }
};
