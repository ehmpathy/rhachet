import { UnexpectedCodePathError } from 'helpful-errors';

import { execSync } from 'node:child_process';
import { readlinkSync } from 'node:fs';
import type { Socket } from 'node:net';

/**
 * .what = get the PID of the peer process connected to a unix socket
 * .why = enables login session verification for daemon access control
 *
 * .note = node.js does not expose SO_PEERCRED directly
 * .note = uses shell-based lookup: readlink + ss + grep
 * .note = this is linux-specific (requires /proc and ss)
 *
 * .how:
 *   1. get socket inode from /proc/self/fd/$fd
 *   2. use ss to find peer info by inode
 *   3. parse pid from ss output
 */
export const getSocketPeerPid = (input: { socket: Socket }): number => {
  const { socket } = input;

  // guard: socket must have a file descriptor
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handle = (socket as any)._handle;
  if (!handle || typeof handle.fd !== 'number') {
    throw new UnexpectedCodePathError('socket has no file descriptor', {
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
    throw new UnexpectedCodePathError('failed to read socket fd link', {
      fdPath,
      cause: error instanceof Error ? error : undefined,
    });
  }

  // linkTarget should be like "socket:[12345]" where 12345 is the inode
  const inodeMatch = linkTarget.match(/socket:\[(\d+)\]/);
  if (!inodeMatch) {
    throw new UnexpectedCodePathError('fd link is not a socket', {
      fdPath,
      linkTarget,
    });
  }
  const inode = inodeMatch[1]!; // guard: regex matched, group exists

  // step 2: use ss to find peer connection by inode
  // ss -xp shows unix sockets with process info
  let ssOutput: string;
  try {
    ssOutput = execSync(`ss -xp 2>/dev/null | grep "${inode}" || true`, {
      encoding: 'utf-8',
      timeout: 5000,
    });
  } catch (error) {
    throw new UnexpectedCodePathError('ss command failed', {
      inode,
      cause: error instanceof Error ? error : undefined,
    });
  }

  if (!ssOutput.trim()) {
    throw new UnexpectedCodePathError('no ss output for socket inode', {
      inode,
    });
  }

  // step 3: parse pid from ss output
  // format: ... users:(("process",pid=12345,fd=6)) ...
  const pidMatch = ssOutput.match(/pid=(\d+)/);
  if (!pidMatch) {
    throw new UnexpectedCodePathError('failed to parse pid from ss output', {
      inode,
      ssOutput: ssOutput.substring(0, 200),
    });
  }

  const pidString = pidMatch[1]!; // guard: regex matched, group exists
  const pid = parseInt(pidString, 10);
  if (Number.isNaN(pid) || pid <= 0) {
    throw new UnexpectedCodePathError('parsed pid is invalid', {
      inode,
      pidString,
    });
  }

  return pid;
};
