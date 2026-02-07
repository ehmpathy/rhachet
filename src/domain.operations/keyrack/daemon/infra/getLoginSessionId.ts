import { UnexpectedCodePathError } from 'helpful-errors';

import { readFileSync } from 'node:fs';

/**
 * .what = read the kernel-managed login session id for a process
 * .why = login session id is the enforceable boundary for daemon access
 *
 * .note = sessionid is set by PAM/setsid at login time
 * .note = all terminals in one login session share the same sessionid
 * .note = unforgeable — kernel-managed, not user-settable
 */
export const getLoginSessionId = (input: { pid: number }): number => {
  const { pid } = input;

  // read /proc/$PID/sessionid
  const sessionidPath = `/proc/${pid}/sessionid`;

  try {
    const content = readFileSync(sessionidPath, 'utf-8').trim();
    const sessionId = parseInt(content, 10);

    // validate parsed value
    if (Number.isNaN(sessionId)) {
      throw new UnexpectedCodePathError('sessionid is not a number', {
        pid,
        sessionidPath,
        content,
      });
    }

    return sessionId;
  } catch (error) {
    if (!(error instanceof Error)) throw error;

    // check for node fs error codes
    const errorCode = (error as NodeJS.ErrnoException).code;

    // rethrow with context if file read failed
    if (errorCode === 'ENOENT') {
      throw new UnexpectedCodePathError('process not found', {
        pid,
        sessionidPath,
        cause: error,
      });
    }

    if (errorCode === 'EACCES') {
      throw new UnexpectedCodePathError('permission denied to read sessionid', {
        pid,
        sessionidPath,
        cause: error,
      });
    }

    throw error;
  }
};
