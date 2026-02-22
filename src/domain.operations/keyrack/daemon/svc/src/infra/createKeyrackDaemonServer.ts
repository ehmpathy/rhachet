import { UnexpectedCodePathError } from 'helpful-errors';

import {
  createDaemonKeyStore,
  type DaemonKeyStore,
} from '@src/domain.operations/keyrack/daemon/svc/src/domain.objects/daemonKeyStore';
import { handleKeyrackDaemonConnection } from '@src/domain.operations/keyrack/daemon/svc/src/domain.operations/handleKeyrackDaemonConnection';

import { chmodSync, unlinkSync } from 'node:fs';
import { createServer, type Server } from 'node:net';

/**
 * .what = create and start the keyrack daemon server on a unix socket
 * .why = listens for client connections and dispatches commands
 *
 * .note = cleans up stale socket file on start
 * .note = returns server instance for lifecycle management
 */
export const createKeyrackDaemonServer = (input: {
  socketPath: string;
}): { server: Server; keyStore: DaemonKeyStore } => {
  const { socketPath } = input;

  // create the key store
  const keyStore = createDaemonKeyStore();

  // cleanup stale socket file if present
  try {
    unlinkSync(socketPath);
  } catch {
    // ignore if file does not exist
  }

  // create the server
  const server = createServer((socket) => {
    handleKeyrackDaemonConnection({ socket }, { keyStore });
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
    throw new UnexpectedCodePathError('daemon server error', {
      socketPath,
      cause: err,
    });
  });

  return { server, keyStore };
};
