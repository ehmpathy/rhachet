import { getKeyrackDaemonSocketPath } from '@src/domain.operations/keyrack/daemon/infra/getKeyrackDaemonSocketPath';

import { createConnection, type Socket } from 'node:net';

/**
 * .what = connect to the keyrack daemon via unix socket
 * .why = enables client-side communication with the daemon
 *
 * .note = returns socket instance for request/response
 * .note = caller must close the socket when done
 */
export const connectToKeyrackDaemon = (input?: {
  socketPath?: string;
}): Promise<Socket> => {
  const socketPath = input?.socketPath ?? getKeyrackDaemonSocketPath();

  return new Promise((resolve, reject) => {
    const socket = createConnection(socketPath);

    socket.once('connect', () => {
      resolve(socket);
    });

    socket.once('error', (err) => {
      reject(err);
    });
  });
};

/**
 * .what = check if daemon is reachable
 * .why = determines if daemon needs to be started
 */
export const isDaemonReachable = async (input?: {
  socketPath?: string;
}): Promise<boolean> => {
  try {
    const socket = await connectToKeyrackDaemon(input);
    socket.destroy();
    return true;
  } catch {
    return false;
  }
};
