import { BadRequestError } from 'helpful-errors';

import type { Socket } from 'node:net';
import { getLoginSessionId } from '../../../infra/getLoginSessionId';
import { getSocketPeerPid } from '../infra/getSocketPeerPid';

/**
 * .what = verify that the caller process is in the same login session as the daemon
 * .why = enforces per-login-session isolation for daemon access
 *
 * .note = uses kernel-managed sessionid (unforgeable)
 * .note = throws BadRequestError if caller is in a different session
 */
export const verifyCallerLoginSession = (input: {
  socket: Socket;
}): { callerPid: number; callerSessionId: number } => {
  const { socket } = input;

  // get the pid of the caller process
  const callerPid = getSocketPeerPid({ socket });

  // get login session id of the caller
  const callerSessionId = getLoginSessionId({ pid: callerPid });

  // get login session id of the daemon (current process)
  const daemonSessionId = getLoginSessionId({ pid: process.pid });

  // verify session match
  if (callerSessionId !== daemonSessionId) {
    throw new BadRequestError(
      'session mismatch: caller is in a different login session',
      {
        callerPid,
        callerSessionId,
        daemonSessionId,
      },
    );
  }

  return { callerPid, callerSessionId };
};
