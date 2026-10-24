import { MalfunctionError } from 'helpful-errors';

import { exec } from 'node:child_process';
import { readlinkSync, statSync } from 'node:fs';
import type { Socket } from 'node:net';
import { promisify } from 'node:util';
import { asSocketPeerInodeFromSs } from './asSocketPeerInodeFromSs';
import { getSocketInodeHolderPid } from './getSocketInodeHolderPid';

const execAsync = promisify(exec);

/**
 * .what = the os credentials of the peer process on a unix socket — its pid, and
 *   the uid + gid that own it
 * .why =
 *   - node does not expose SO_PEERCRED directly, so this recovers the peer's
 *     identity via the kernel: our socket's inode → the PEER socket's inode (`ss -x`)
 *     → the process that holds that inode (`/proc/<pid>/fd`) → the owner uid/gid of
 *     `/proc/<pid>` (its real credentials)
 *   - a caller needs the peer UID to enforce same-user dispatch on a clone socket
 *     (isCallerSameUser)
 *
 * .note = 🔴 why `ss -x` and not `ss -xp`: `-p` maps every fd of every process on the host,
 *   once per connection — 168–343ms on an idle dev box (`rhx ss.peer.probe`), and past the
 *   observe loop's 1s probe bound under suite load. the client then hung up mid-auth, its
 *   fd closed, and the map found no owner: `could not read peer pid from ss` (measured
 *   2026-10-23). `ss -x` (26ms) names the peer inode, and the holder scan stops at the first
 *   match. and `-p` read the pid off whichever of the pair's two lines came first, which
 *   could be the server's OWN line; the peer inode is read off our line alone
 * .note = linux-specific (needs /proc + ss); a lookup break is a MalfunctionError
 *   (a real infra fault to diagnose, not a caller fault)
 * .note = ASYNC: the `ss` lookup is a subprocess, so it is awaited (execAsync), NOT run
 *   through a synchronous execSync — the clone process mirrors the human's pty, so a sync
 *   shell-out would freeze the terminal for its duration
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

  // read the peer inode off OUR line — no process map, so it costs the socket list alone
  const { stdout: ssOutput } = await execAsync(
    `ss -x | grep -E "${grepPattern}" || true`,
    { encoding: 'utf-8', timeout: 5000 },
  );
  const peerInode = asSocketPeerInodeFromSs({
    ssOutput,
    inode,
    signedInode: String(signedInode),
  });
  if (peerInode === null)
    return MalfunctionError.throw('could not read peer inode from ss', {
      inode,
      socketDestroyed: input.socket.destroyed,
    });

  // find the process that holds the peer end; an unreadable or absent holder fails closed
  const pid = await getSocketInodeHolderPid({ inode: peerInode });
  if (pid === null)
    return MalfunctionError.throw(
      'could not find the process that holds the peer socket',
      {
        inode,
        peerInode,
        socketDestroyed: input.socket.destroyed,
      },
    );

  // the owner of /proc/<pid> carries the peer's real uid + gid
  const stat = statSync(`/proc/${pid}`);
  return { pid, uid: stat.uid, gid: stat.gid };
};
