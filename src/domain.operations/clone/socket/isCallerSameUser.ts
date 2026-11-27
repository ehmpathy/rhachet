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
 * .note = the peer read and the own uid are injectable, so the compare is unit-tested on every
 *   host — the integration proof ([case21]) needs a pid 1 that is not the test user
 */
export const isCallerSameUser = async (
  input: { socket: Socket },
  context: {
    getPeerCred: typeof getSocketPeerCred;
    getOwnUid: () => number | undefined;
  } = {
    getPeerCred: getSocketPeerCred,
    getOwnUid: () => process.getuid?.(),
  },
): Promise<boolean> => {
  // fail closed on a host with no uid: no compare can prove the caller
  const ownUid = context.getOwnUid();
  if (ownUid === undefined) return false;

  // compare the peer's uid to ours; a lookup fault propagates, and the gate denies on it
  const peer = await context.getPeerCred({ socket: input.socket });
  return peer.uid === ownUid;
};
