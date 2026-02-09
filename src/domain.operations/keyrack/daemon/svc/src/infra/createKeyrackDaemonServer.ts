import { UnexpectedCodePathError } from 'helpful-errors';

import { unlinkSync } from 'node:fs';
import { createServer, type Server } from 'node:net';
import {
  createDaemonKeyStore,
  type DaemonKeyStore,
} from '../domain.objects/daemonKeyStore';
import { handleKeyrackDaemonConnection } from '../domain.operations/handleKeyrackDaemonConnection';

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
