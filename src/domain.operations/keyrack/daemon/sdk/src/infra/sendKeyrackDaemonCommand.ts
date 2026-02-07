import { UnexpectedCodePathError } from 'helpful-errors';

import type { Socket } from 'node:net';
import type { KeyrackDaemonCommand } from '../../../../../../domain.objects/keyrack/KeyrackDaemonCommand';

/**
 * .what = daemon response shape
 * .why = typed protocol for daemon responses
 */
export interface DaemonResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * .what = send a command to the keyrack daemon and receive response
 * .why = encapsulates the request/response protocol over unix socket
 *
 * .note = writes json request, reads json response
 * .note = closes socket after response received
 */
export const sendKeyrackDaemonCommand = async <T>(input: {
  socket: Socket;
  command: KeyrackDaemonCommand;
  payload?: unknown;
}): Promise<DaemonResponse<T>> => {
  const { socket, command, payload } = input;

  return new Promise((resolve, reject) => {
    let buffer = '';

    // handle response data
    socket.on('data', (chunk) => {
      buffer += chunk.toString();
    });

    // handle socket close (response complete)
    socket.on('close', () => {
      try {
        const response = JSON.parse(buffer) as DaemonResponse<T>;
        resolve(response);
      } catch (error) {
        reject(
          new UnexpectedCodePathError('failed to parse daemon response', {
            buffer: buffer.slice(0, 200),
            cause: error instanceof Error ? error : undefined,
          }),
        );
      }
    });

    // handle socket error
    socket.on('error', (err) => {
      reject(err);
    });

    // send request
    const request = JSON.stringify({ command, payload: payload ?? {} });
    socket.write(request);
  });
};
