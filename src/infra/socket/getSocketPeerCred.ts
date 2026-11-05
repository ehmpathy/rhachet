import { ConstraintError, MalfunctionError } from 'helpful-errors';

import { execFile } from 'node:child_process';
import { readlinkSync, statSync } from 'node:fs';
import type { Socket } from 'node:net';
import { promisify } from 'node:util';
import { asSocketPeerInodeFromSs } from './asSocketPeerInodeFromSs';
import { SOCKET_PEER_CRED_LOOKUP_TIMEOUT_MS } from './constants';
import { getSocketInodeHolderPid } from './getSocketInodeHolderPid';

const execFileAsync = promisify(execFile);

/**
 * .what = the most `ss -x` output the lookup will buffer, in bytes
 * .why = the whole table is read (no `grep` filter), at ~100 bytes a line. node's 1 MiB default
 *   fails at ~10k unix sockets — a busy box, which is the case #678 is about — and a buffer fault
 *   would deny a same-user caller exactly as the old 5s kill did. 64 MiB holds ~600k sockets
 */
const SS_TABLE_MAX_BYTES = 64 * 1024 * 1024;

/**
 * .what = the named cause of an `ss` scan fault
 */
const asSsScanFaultMessage = (input: {
  error: NodeJS.ErrnoException & { killed?: boolean };
}): string => {
  if (input.error.code === 'ENOENT')
    return '`ss` (iproute2) is absent, so the peer cannot be read';
  if (input.error.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER')
    return '`ss` table exceeds the read buffer (SS_TABLE_MAX_BYTES)';
  if (input.error.killed) return '`ss` scan killed at the lookup bound';
  return '`ss` scan failed';
};

/**
 * .what = the hint for a holder that left between the scan that found it and its /proc read
 */
const PEER_GONE_HINT =
  'the peer exited before its cred read (often a caller that hung up mid-dispatch); rerun the say from a live process';

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
 *   once per connection — 168–343ms on an idle dev box, and past a 1s probe bound under suite
 *   load (measured 2026-10-23). `ss -x` names the peer inode, and the holder scan stops at the
 *   first match. `-p` also read the pid off whichever of the pair's two lines came first, which
 *   could be the server's OWN line; the peer inode is read off our line alone
 * .note = a peer of another uid is never found as a holder: a non-root reader cannot read its
 *   fds, so the scan skips it and the lookup fails closed — the same reach `ss -p` has
 * .note = linux-specific (needs /proc + ss). every break is a named MalfunctionError: no fd,
 *   not a socket, `ss` absent, `ss` killed at the bound, `ss` overflow, `ss` failed, no peer
 *   inode, no holder found, a holder gone before its /proc read. a bound that is not a positive
 *   number is the caller's to fix, a ConstraintError. the clone gate folds each into a deny; a
 *   distinct reply reason for a lookup fault is ehmpathy/rhachet#683
 * .note = ASYNC: the `ss` lookup is a subprocess, so it is awaited (execFileAsync), NOT run
 *   through a synchronous execSync — the clone process mirrors the human's pty, so a sync
 *   shell-out would freeze the terminal for its duration
 * .note = `context.lookupTimeoutMs` bounds the `ss` scan; prod callers take the default
 *   (SOCKET_PEER_CRED_LOOKUP_TIMEOUT_MS). it is injectable so a test can prove the kill
 *   at the bound in seconds rather than a minute
 */
export const getSocketPeerCred = async (
  input: { socket: Socket },
  context: { lookupTimeoutMs: number } = {
    lookupTimeoutMs: SOCKET_PEER_CRED_LOOKUP_TIMEOUT_MS,
  },
): Promise<{ pid: number; uid: number; gid: number }> => {
  // halt on a bound that would arm no kill timer: node arms it only for a positive timeout, so
  //   0, a negative, NaN, or an absent field would leave the scan unbounded. checked first, so
  //   the caller's own fix is named before any infra fault can mask it
  const lookupTimeoutMs = context.lookupTimeoutMs;
  if (!Number.isFinite(lookupTimeoutMs) || lookupTimeoutMs <= 0)
    return ConstraintError.throw(
      'peer-cred lookup bound must be a positive number of ms',
      {
        lookupTimeoutMs,
        hint: 'omit the context to take SOCKET_PEER_CRED_LOOKUP_TIMEOUT_MS, or pass a positive ms',
      },
    );

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

  // `ss` reports inodes as signed 32-bit; /proc reports unsigned — the parser matches both
  const inodeNum = parseInt(inode, 10);
  const INT32_MAX = 2147483647;
  const UINT32_MAX = 4294967296;
  const signedInode = inodeNum > INT32_MAX ? inodeNum - UINT32_MAX : inodeNum;

  // read the whole table from `ss` itself, no shell: the bound's kill then lands on `ss`, never
  //   on a shell that leaves `ss` to run on; and a fault of `ss` (absent, killed, overflow,
  //   failed) rejects by name, never reads as an empty table that looks like an unseen peer
  // .note = `env: process.env` equals the default in prod; it is explicit so the `PATH` a test
  //   sets reaches the lookup (jest hands each test file its own copy of `process.env`, which
  //   node's core child_process never reads unless it is passed)
  const ssOutput = await execFileAsync('ss', ['-x'], {
    encoding: 'utf-8',
    timeout: lookupTimeoutMs,
    maxBuffer: SS_TABLE_MAX_BYTES,
    env: process.env,
  }).then(
    (result) => result.stdout,
    (error: NodeJS.ErrnoException & { killed?: boolean }) =>
      MalfunctionError.throw(asSsScanFaultMessage({ error }), {
        inode,
        lookupTimeoutMs,
        errnoCode: error.code ?? null,
        killed: error.killed ?? false,
        cause: error,
      }),
  );

  // read the peer inode off OUR line
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
        hint: 'the peer runs as another user, whose fds this user cannot read; or it exited before the lookup named it (often a caller that hung up mid-dispatch). run the say as the user that enrolled the clone, from a live process',
      },
    );

  // the owner of /proc/<pid> carries the peer's real uid + gid; a holder that exited after the
  //   scan found it has no /proc entry, which is named here rather than thrown as a raw errno
  const stat = statSync(`/proc/${pid}`, { throwIfNoEntry: false });
  if (!stat)
    return MalfunctionError.throw('peer process exited before its cred read', {
      pid,
      inode,
      hint: PEER_GONE_HINT,
    });
  return { pid, uid: stat.uid, gid: stat.gid };
};
