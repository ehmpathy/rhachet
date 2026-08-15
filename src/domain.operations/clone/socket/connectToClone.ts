import { ConstraintError } from 'helpful-errors';

import { createConnection, type Socket } from 'node:net';

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
  const timeoutMs = input.timeoutMs ?? 2000;

  return new Promise((done, fail) => {
    const socket = createConnection(input.socketPath);

    socket.setTimeout(timeoutMs, () => {
      socket.destroy();
      fail(
        new ConstraintError(
          'clone socket did not answer in time — the clone may be dead',
          { socketPath: input.socketPath, timeoutMs },
        ),
      );
    });

    socket.once('connect', () => {
      socket.setTimeout(0); // clear the connect timeout; the caller owns it now
      done(socket);
    });

    socket.once('error', (error) =>
      fail(
        new ConstraintError(
          'no live clone at this socket — it refused or is gone',
          {
            socketPath: input.socketPath,
            cause: error instanceof Error ? error : undefined,
          },
        ),
      ),
    );
  });
};
