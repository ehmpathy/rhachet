import { MalfunctionError } from 'helpful-errors';

import { exec } from 'node:child_process';
import { readlinkSync, statSync } from 'node:fs';
import type { Socket } from 'node:net';
import { promisify } from 'node:util';
import { asSocketPeerPidFromSs } from './asSocketPeerPidFromSs';

const execAsync = promisify(exec);

/**
 * .what = the os credentials of the peer process on a unix socket — its pid, and
 *   the uid + gid that own it
 * .why =
 *   - node does not expose SO_PEERCRED directly, so this recovers the peer's
 *     identity via the kernel: the socket's inode → the peer pid (`ss -xp`) → the
 *     owner uid/gid of `/proc/<pid>` (its real credentials)
 *   - a caller needs the peer UID to enforce same-user dispatch on a clone socket
 *     (isCallerSameUser); the daemon needs the peer PID for its session gate. the two
 *     readers stay separate (this one returns {pid,uid,gid}; the daemon's
 *     getSocketPeerPid returns just the pid, in its own svc tree), but they SHARE the
 *     one hazard-prone step — the `ss -xp` inode-to-pid parse — via asSocketPeerPidFromSs,
 *     so a fix to the parse reaches both, not one
 *
 * .note = linux-specific (needs /proc + ss); a lookup break is a MalfunctionError
 *   (a real infra fault to diagnose, not a caller fault)
 * .note = ASYNC: the `ss` lookup is a subprocess, so it is awaited (execAsync), NOT
 *   run through a synchronous execSync. the clone process is the SAME process that
 *   mirrors the human's pty, so a synchronous `ss` would freeze the human's terminal
 *   (and every other socket connection) for the lookup's duration. the `/proc`
 *   readlink/stat reads stay sync — they are microsecond-fast, never the blocker
 */
export const getSocketPeerCred = async (input: {
  socket: Socket;
}): Promise<{ pid: number; uid: number; gid: number }> => {
  // .note = deliberate cast to `any` at a node-internals boundary — node does
  //   NOT type (or publicly expose) the socket's `_handle`, yet its `.fd` is the
  //   only route to the raw descriptor the SO_PEERCRED lookup needs. the cast is
  //   fenced right here and immediately guarded (the fd is null-checked below),
  //   so a node version that renames/removes `_handle` fails loud at this line,
  //   not silently downstream. removal path: drop the cast the moment node
  //   exposes SO_PEERCRED (or a typed fd accessor) through a public api.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handle = (input.socket as any)._handle;
  if (!handle || typeof handle.fd !== 'number')
    return MalfunctionError.throw('socket has no file descriptor', {
      hasHandle: !!handle,
    });

  // the fd link names the socket inode: "socket:[<inode>]"
  const linkTarget = readlinkSync(`/proc/self/fd/${handle.fd}`);
  const inode = linkTarget.match(/socket:\[(?<inode>\d+)\]/)?.groups?.inode;
  if (!inode)
    return MalfunctionError.throw('socket fd link is not a socket', {
      linkTarget,
    });

  // `ss` reports inodes as signed 32-bit; /proc reports unsigned — grep both
  const inodeNum = parseInt(inode, 10);
  const INT32_MAX = 2147483647;
  const UINT32_MAX = 4294967296;
  const signedInode = inodeNum > INT32_MAX ? inodeNum - UINT32_MAX : inodeNum;
  const grepPattern =
    inodeNum > INT32_MAX ? `(${inode}|${signedInode})` : inode;

  const { stdout: ssOutput } = await execAsync(
    `ss -xp | grep -E "${grepPattern}" || true`,
    { encoding: 'utf-8', timeout: 5000 },
  );
  // parse the pid from the line whose inode field EXACTLY equals ours — never a
  // partial grep match (asSocketPeerPidFromSs closes the wrong-peer hazard)
  const pid = asSocketPeerPidFromSs({
    ssOutput,
    inode,
    signedInode: String(signedInode),
  });
  if (pid === null)
    return MalfunctionError.throw('could not read peer pid from ss', {
      inode,
    });

  // the owner of /proc/<pid> carries the peer's real uid + gid
  const stat = statSync(`/proc/${pid}`);
  return { pid, uid: stat.uid, gid: stat.gid };
};
