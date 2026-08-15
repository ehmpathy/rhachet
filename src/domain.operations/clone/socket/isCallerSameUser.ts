import { getSocketPeerCred } from '@src/infra/socket/getSocketPeerCred';

import type { Socket } from 'node:net';

/**
 * .what = is the peer on this clone socket the SAME os user that owns the clone?
 * .why =
 *   - a clone's socket accepts dispatch from ANY session of the OWNER user — a
 *     cron, a comms webhook, a peer clone — but NEVER another user. this is the
 *     clone threat model: same-user-any-session allowed, cross-user blocked. it
 *     differs from the daemon's gate (same-login-SESSION), so it is its own op
 *   - the check is server-side, on every connection, so the scoped-to-one-brain
 *     safety premise holds even if the socket file's perms were somehow widened
 *
 * .note = compares the peer's real uid (SO_PEERCRED, via getSocketPeerCred) to
 *   this process's uid. a non-POSIX host has no getuid — there the socket is not
 *   stood up at all (getCloneSocketPath returns null), so this is never reached
 */
export const isCallerSameUser = async (input: {
  socket: Socket;
}): Promise<boolean> => {
  const ownUid = process.getuid?.();
  if (ownUid === undefined) return false;

  const peer = await getSocketPeerCred({ socket: input.socket });
  return peer.uid === ownUid;
};
