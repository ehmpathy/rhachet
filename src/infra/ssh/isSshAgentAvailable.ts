import { execFileSync } from 'node:child_process';
import { isCommandNotFoundError } from './isCommandNotFoundError';
import { SSH_PROBE_TIMEOUT_MS } from './sshExecTimeouts';

/**
 * .what = check whether the ssh-agent binary is available on PATH
 * .why  = a PREFLIGHT probe for the agent-dependent integration tests: they
 *         guard with `if (!isSshAgentAvailable()) throw` so a box without
 *         openssh-client fails loud up front rather than deep in a spawn
 *
 * .note = this is a test-infra guard by design — production does NOT call it.
 *         the real prod path (`genEphemeralSshAgent`) detects an absent binary
 *         at the actual spawn site (ENOENT → a caller-fix ConstraintError with
 *         the install hint), so it needs no separate check-then-spawn preflight
 *         (which would be a TOCTOU race anyway). kept in infra/ssh next to the
 *         primitives it probes, not in test infra, so the probe hygiene lives
 *         with the code it guards
 * .note = a `which` probe that never spawns an agent (so it cannot leak a stray
 *         daemon); execFileSync + argv array (never a shell string) for the same
 *         no-shell hygiene as setSshKeyIntoAgent / getOneAgentSignature
 * .note = allowlists ONLY the expected "command not found" outcome; a genuine
 *         fault (`which` absent, a signal, a permission error) surfaces loud
 *         (rule.forbid.failhide)
 */
export const isSshAgentAvailable = (): boolean => {
  try {
    // bound the probe: a wedged `which` must not hang the event loop
    execFileSync('which', ['ssh-agent'], {
      stdio: 'pipe',
      env: process.env,
      timeout: SSH_PROBE_TIMEOUT_MS,
    });
    return true;
  } catch (error) {
    if (isCommandNotFoundError(error)) return false;
    throw error;
  }
};
