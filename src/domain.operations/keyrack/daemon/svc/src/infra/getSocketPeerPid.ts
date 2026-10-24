import { MalfunctionError } from 'helpful-errors';

import { asSocketPeerInodeFromSs } from '@src/infra/socket/asSocketPeerInodeFromSs';
import { getSocketInodeHolderPidSync } from '@src/infra/socket/getSocketInodeHolderPidSync';

import { execSync } from 'node:child_process';
import { readlinkSync } from 'node:fs';
import type { Socket } from 'node:net';

/**
 * .what = get the PID of the peer process connected to a unix socket
 * .why = enables login session verification for daemon access control
 *
 * .note = node.js does not expose SO_PEERCRED directly
 * .note = uses shell-based lookup: readlink + ss + grep, then a /proc holder scan
 * .note = this is linux-specific (requires /proc and ss)
 *
 * .how:
 *   1. get socket inode from /proc/self/fd/$fd
 *   2. use `ss -x` to read the peer inode off our own line
 *   3. find the process whose fds hold the peer inode
 */
export const getSocketPeerPid = (input: { socket: Socket }): number => {
  const { socket } = input;

  // guard: socket must have a file descriptor
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handle = (socket as any)._handle;
  if (!handle || typeof handle.fd !== 'number') {
    throw new MalfunctionError('socket has no file descriptor', {
      hasHandle: !!handle,
      fdType: handle ? typeof handle.fd : 'no handle',
    });
  }

  const fd = handle.fd;

  // step 1: get socket inode from /proc/self/fd/$fd
  const fdPath = `/proc/self/fd/${fd}`;
  let linkTarget: string;
  try {
    linkTarget = readlinkSync(fdPath);
  } catch (error) {
    throw new MalfunctionError('failed to read socket fd link', {
      fdPath,
      cause: error instanceof Error ? error : undefined,
    });
  }

  // linkTarget should be like "socket:[12345]" where 12345 is the inode
  const inodeMatch = linkTarget.match(/socket:\[(\d+)\]/);
  if (!inodeMatch) {
    throw new MalfunctionError('fd link is not a socket', {
      fdPath,
      linkTarget,
    });
  }
  const inode = inodeMatch[1]!; // guard: regex matched, group exists

  // step 2: use ss to find peer connection by inode
  // ss -xp shows unix sockets with process info
  //
  // .note = ss displays socket identifiers as signed 32-bit integers
  // .note = /proc/self/fd shows them as unsigned
  // .note = when inode > 2^31, they differ: unsigned 2367234854 vs signed -1927732442
  // .note = we grep for both representations to handle this mismatch
  const inodeNum = parseInt(inode, 10);
  const INT32_MAX = 2147483647; // 2^31 - 1
  const UINT32_MAX = 4294967296; // 2^32
  const signedInode = inodeNum > INT32_MAX ? inodeNum - UINT32_MAX : inodeNum;
  const grepPattern =
    inodeNum > INT32_MAX ? `(${inode}|${signedInode})` : inode;

  // .note = 🔴 `ss -x`, never `ss -xp`: `-p` maps every fd of every process on the host, and
  //   cost 2354ms on this box under cpu load — past this call's 5s timeout under the full suite,
  //   where the gate then refused every caller with "ss command failed" (measured 2026-10-23).
  //   `-p` also read the pid off whichever line of the pair came first, which could be the
  //   daemon's OWN line. `ss -x` names the peer inode on our line; the holder scan finds its pid
  // .note = deliberate mutation — `ssOutput` is assigned once inside the try (an
  //         execSync that may throw); bounded to this scope, never escapes
  let ssOutput: string;
  try {
    ssOutput = execSync(`ss -x | grep -E "${grepPattern}" || true`, {
      encoding: 'utf-8',
      timeout: 5000,
    });
  } catch (error) {
    throw new MalfunctionError('ss command failed', {
      inode,
      signedInode,
      cause: error instanceof Error ? error : undefined,
    });
  }

  // step 3: read the peer inode off OUR line — the shared parser the clone's
  // getSocketPeerCred uses, so the two gates never diverge on the wrong-peer hazard
  const peerInode = asSocketPeerInodeFromSs({
    ssOutput,
    inode,
    signedInode: String(signedInode),
  });
  if (peerInode === null) {
    throw new MalfunctionError('could not read peer inode from ss', {
      inode,
      ssOutput: ssOutput.slice(0, 200),
    });
  }

  // step 4: the process that holds the peer end; an absent or unreadable holder fails closed
  const pid = getSocketInodeHolderPidSync({ inode: peerInode });
  if (pid === null) {
    throw new MalfunctionError(
      'could not find the process that holds the peer socket',
      { inode, peerInode },
    );
  }

  return pid;
};
