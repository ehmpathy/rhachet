import { ConstraintError } from 'helpful-errors';

import { createConnection, type Socket } from 'node:net';
import { CloneSocketGoneError } from './CloneSocketGoneError';
import { CLONE_CONNECT_TIMEOUT_MS } from './constants';

/**
 * .what = connect to one clone's dispatch socket, or fail loud if it does not
 *   answer — the shared get-connected adapter the talk verbs reach through
 * .why =
 *   - `say` needs a live socket to write to; a dead or absent socket must fail
 *     loud with a named fix, never hang. this bounds the connect with a timeout
 *     and turns ECONNREFUSED / ENOENT into one clear "not reachable" error
 *   - one connect adapter means `say` and any future reach verb share the exact
 *     timeout + fail-loud behavior
 *
 * .note = the caller owns the returned socket (it closes it). a connect timeout or
 *   a refused/absent socket is a ConstraintError (the caller acts: retry, or
 *   re-enroll for a fresh clone)
 */
export const connectToClone = (input: {
  socketPath: string;
  timeoutMs?: number;
}): Promise<Socket> => {
  const timeoutMs = input.timeoutMs ?? CLONE_CONNECT_TIMEOUT_MS;

  return new Promise((done, fail) => {
    const socket = createConnection(input.socketPath);

    socket.setTimeout(timeoutMs, () => {
      socket.destroy();
      fail(
        new ConstraintError(
          'clone socket did not answer in time — the clone may be dead',
          {
            socketPath: input.socketPath,
            timeoutMs,
            hint: 'check `rhx clone list`; a dead clone cannot be reached, so enroll a fresh one (`rhx enroll`)',
          },
        ),
      );
    });

    socket.once('connect', () => {
      socket.setTimeout(0); // clear the connect timeout; the caller owns it now
      done(socket);
    });

    socket.once('error', (error) => {
      // an absent path or a refused connect means no listener: the clone is gone, which a
      // caller may need to tell apart from any other connect fault (CloneSocketGoneError)
      const code = (error as NodeJS.ErrnoException).code;
      const isGone = code === 'ENOENT' || code === 'ECONNREFUSED';
      const ErrorClass = isGone ? CloneSocketGoneError : ConstraintError;
      fail(
        new ErrorClass('no live clone at this socket — it refused or is gone', {
          socketPath: input.socketPath,
          hint: 'check `rhx clone list`; a dead clone cannot be reached, so enroll a fresh one (`rhx enroll`)',
          cause: error instanceof Error ? error : undefined,
        }),
      );
    });
  });
};
