import { createConnection } from 'node:net';

/**
 * .what = is a clone's dispatch socket connectable right now? the SOLE reader of
 *   clone liveness (F4 — liveness is DERIVED from the socket, never stored)
 * .why =
 *   - a clone is LIVE exactly while its socket answers a connect. no status field
 *     to keep in sync, no pid to reap: the socket's connectability IS the truth.
 *     a dead brain leaves a socket that refuses (ECONNREFUSED) or is gone (ENOENT),
 *     and that refusal speaks the clone's death for itself
 *   - one reader means `list`, `say`, and `get` all judge liveness the same way
 *
 * .note = a bare connect probe: it opens, then closes at once — it sends NO bytes,
 *   so the server's same-user `ss` gate never fires for a liveness check. a
 *   connect timeout bounds a pathological socket so the probe never hangs
 */
export const isCloneLive = (input: {
  socketPath: string;
  timeoutMs?: number;
}): Promise<boolean> => {
  const timeoutMs = input.timeoutMs ?? 1000;

  return new Promise((done) => {
    const socket = createConnection(input.socketPath);

    const settle = (live: boolean): void => {
      socket.destroy();
      done(live);
    };

    socket.setTimeout(timeoutMs, () => settle(false));
    socket.once('connect', () => settle(true));
    socket.once('error', () => settle(false));
  });
};
