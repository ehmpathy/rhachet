import { MalfunctionError } from 'helpful-errors';

import { delFileSync } from '@src/domain.operations/keyrack/daemon/infra/delFileSync';
import { genDaemonActivityClock } from '@src/domain.operations/keyrack/daemon/svc/src/domain.objects/daemonActivityClock';
import {
  createDaemonKeyStore,
  type DaemonKeyStore,
} from '@src/domain.operations/keyrack/daemon/svc/src/domain.objects/daemonKeyStore';
import { handleKeyrackDaemonConnection } from '@src/domain.operations/keyrack/daemon/svc/src/domain.operations/handleKeyrackDaemonConnection';
import { scheduleAutoTermination } from '@src/domain.operations/keyrack/daemon/svc/src/domain.operations/scheduleAutoTermination';
import { verifyCallerLoginSession } from '@src/domain.operations/keyrack/daemon/svc/src/domain.operations/verifyCallerLoginSession';

import { chmodSync } from 'node:fs';
import { createServer, type Server } from 'node:net';

/**
 * .what = create and start the keyrack daemon server on a unix socket
 * .why = listens for client connections and dispatches commands
 *
 * .note = cleans up stale socket file on start
 * .note = returns server instance for lifecycle management
 * .note = schedules auto-termination when the daemon holds no keys and serves no demand
 */
export const createKeyrackDaemonServer = (input: {
  socketPath: string;
  homeHash: string;
  /**
   * .what = the login-session check each connection is judged by
   * .why = optional, and defaulted to the real one, so the 7 extant call sites stay
   *        untouched. a test supplies its own to observe HOW OFTEN it is called
   */
  verifySession?: typeof verifyCallerLoginSession;
}): { server: Server; keyStore: DaemonKeyStore } => {
  const { socketPath, homeHash } = input;

  // create the key store
  const keyStore = createDaemonKeyStore();

  // start the demand clock; born here so this function's signature stays fixed
  // .why = createKeyrackDaemonServer has 7 call sites (1 prod + 6 test); to take
  // the clock as an input would ripple the change into every one of them
  const activity = genDaemonActivityClock();

  // schedule auto-termination when the daemon holds no keys and serves no demand
  scheduleAutoTermination({ keyStore, activity });

  // cleanup stale socket file if present
  delFileSync({ path: socketPath });

  // create the server
  const server = createServer((socket) => {
    handleKeyrackDaemonConnection(
      { socket },
      {
        keyStore,
        homeHash,
        activity,
        // .why = injected rather than imported by the handler, so the handler's cost
        // behavior is observable. the check shells out to `ss -xp`, whose cost grows
        // with every socket on the machine, and it must NOT run for a caller that
        // sends no bytes. that property has no other seam: a direct import can only
        // be observed by a mock, which rule.forbid.unit.remote-boundaries forbids.
        // as an injected collaborator, a test counts invocations instead
        verifySession: input.verifySession ?? verifyCallerLoginSession,
      },
    );
  });

  // listen on the unix socket
  server.listen(socketPath, () => {
    // set socket permissions to owner-only (0600) for security
    // .why = prevents other users on machine from access to daemon
    chmodSync(socketPath, 0o600);

    console.log(`[keyrack-daemon] server started at ${socketPath}`);
  });

  // handle server errors
  server.on('error', (err) => {
    console.error('[keyrack-daemon] server error:', err.message);
    throw new MalfunctionError('daemon server error', {
      socketPath,
      cause: err,
    });
  });

  return { server, keyStore };
};
