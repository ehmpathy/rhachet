import type { Socket } from 'node:net';
import type { KeyrackDaemonCommand } from '../../../../../../domain.objects/keyrack/KeyrackDaemonCommand';
import type { DaemonKeyStore } from '../domain.objects/daemonKeyStore';
import { handleGetCommand } from './handleGetCommand';
import { handleRelockCommand } from './handleRelockCommand';
import { handleStatusCommand } from './handleStatusCommand';
import { handleUnlockCommand } from './handleUnlockCommand';
import { verifyCallerLoginSession } from './verifyCallerLoginSession';

/**
 * .what = daemon request message shape
 * .why = typed protocol for daemon commands
 */
interface DaemonRequest {
  command: KeyrackDaemonCommand;
  payload: unknown;
}

/**
 * .what = daemon response message shape
 * .why = typed protocol for daemon responses
 */
interface DaemonResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * .what = handle a client connection to the keyrack daemon
 * .why = verifies caller session and dispatches commands
 *
 * .note = reads json from socket, writes json response
 * .note = one request-response per connection (no stream mode)
 */
export const handleKeyrackDaemonConnection = (
  input: { socket: Socket },
  context: { keyStore: DaemonKeyStore },
): void => {
  const { socket } = input;
  let buffer = '';

  socket.on('data', (chunk) => {
    buffer += chunk.toString();

    // try to parse the request
    let request: DaemonRequest;
    try {
      request = JSON.parse(buffer);
    } catch {
      // incomplete json, wait for more data
      return;
    }

    // reset buffer after parse
    buffer = '';

    // process the request
    const response = processRequest({ socket, request }, context);

    // send response and close
    socket.write(JSON.stringify(response));
    socket.end();
  });

  socket.on('error', (err) => {
    // log and close on error
    console.error('[keyrack-daemon] socket error:', err.message);
    socket.destroy();
  });
};

/**
 * .what = process a parsed daemon request
 * .why = separates parse step from command dispatch
 */
const processRequest = (
  input: { socket: Socket; request: DaemonRequest },
  context: { keyStore: DaemonKeyStore },
): DaemonResponse => {
  const { socket, request } = input;

  // verify caller is in same login session
  try {
    verifyCallerLoginSession({ socket });
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'session verification failed' };
  }

  // dispatch by command
  try {
    switch (request.command) {
      case 'UNLOCK': {
        const payload = request.payload as Parameters<
          typeof handleUnlockCommand
        >[0];
        const result = handleUnlockCommand(payload, context);
        return { success: true, data: result };
      }

      case 'GET': {
        const payload = request.payload as Parameters<
          typeof handleGetCommand
        >[0];
        const result = handleGetCommand(payload, context);
        return { success: true, data: result };
      }

      case 'STATUS': {
        const result = handleStatusCommand({}, context);
        return { success: true, data: result };
      }

      case 'RELOCK': {
        const payload = request.payload as Parameters<
          typeof handleRelockCommand
        >[0];
        const result = handleRelockCommand(payload, context);
        return { success: true, data: result };
      }

      default:
        return {
          success: false,
          error: `unknown command: ${request.command}`,
        };
    }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'command execution failed' };
  }
};
