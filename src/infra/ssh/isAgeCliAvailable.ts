import { execFileSync } from 'node:child_process';
import { isCommandNotFoundError } from './isCommandNotFoundError';
import { SSH_PROBE_TIMEOUT_MS } from './sshExecTimeouts';

/**
 * .what = check if the age CLI binary is available on PATH
 * .why = required for passphrase-protected ssh keys
 *
 * .note = explicitly passes process.env to ensure PATH changes are respected
 * .note = allowlists ONLY the expected "command not found" outcome (`which` ran
 *         and exited non-zero → `error.status` is a number). a genuine fault —
 *         `which` itself absent (ENOENT on spawn), a signal, a permission error
 *         — has no numeric `.status`, so it surfaces loud (rule.forbid.failhide)
 */
export const isAgeCliAvailable = (): boolean => {
  try {
    // bound the probe: a wedged `which` must not hang the event loop
    execFileSync('which', ['age'], {
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
