import { MalfunctionError } from 'helpful-errors';

import { delDirSync } from '@src/infra/filesystem/delDirSync';
import { getFileStatOrNull } from '@src/infra/filesystem/getFileStatOrNull';
import { isErrnoEexist } from '@src/infra/filesystem/isErrnoEexist';
import { isErrnoEnoent } from '@src/infra/filesystem/isErrnoEnoent';

import { mkdirSync, type Stats, utimesSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * .what = run a procedure while it holds a directory lock at lockPath
 * .why = a read-decide-write of a shared file races any peer that writes it too;
 *   inside one lock, no peer that takes the same lock can interleave
 *
 * .note = proper-lockfile's protocol: held while the dir exists; stale after 15s
 * .note = the holder refreshes the lock's mtime every 5s
 * .note = release and stale clear each remove only the dir of the inode they read
 */
export const withDirLock = async <T>(
  input: {
    lockPath: string;
    refusal: { message: string; hint: string };
  },
  procedure: () => T | Promise<T>,
): Promise<T> => {
  const lockPath = input.lockPath;
  mkdirSync(dirname(lockPath), { recursive: true });

  // take the lock, or wait out a live holder; a stale one is cleared
  const lockHeld = await getLockHeld({ lockPath, attempt: 0 });
  if (!lockHeld)
    throw new MalfunctionError(input.refusal.message, {
      lockPath,
      hint: input.refusal.hint,
    });

  // keep the lock fresh while the procedure runs, so no peer judges a live hold stale
  const heartbeat = setInterval(
    () => setLockFreshIfSame({ lockPath, lock: lockHeld }),
    LOCK_UPDATE_MS,
  );
  heartbeat.unref();

  // run the procedure, and release the lock whatever it does
  try {
    return await procedure();
  } finally {
    clearInterval(heartbeat);
    delLockIfSame({ lockPath, lock: lockHeld });
  }
};

const LOCK_STALE_MS = 15000;
const LOCK_UPDATE_MS = 5000;
const LOCK_TRIES = 20;

/**
 * .what = take the lock within LOCK_TRIES attempts, with a linear backoff
 * .why = a live holder releases in milliseconds; the backoff waits past it without
 *   a busy spin
 */
const getLockHeld = async (input: {
  lockPath: string;
  attempt: number;
}): Promise<Stats | null> => {
  if (input.attempt >= LOCK_TRIES) return null;
  const lockHeld = getLockHeldOnce({ lockPath: input.lockPath });
  if (lockHeld) return lockHeld;
  await new Promise((done) => setTimeout(done, 100 * (input.attempt + 1)));
  return getLockHeld({ lockPath: input.lockPath, attempt: input.attempt + 1 });
};

/**
 * .what = one attempt to take a directory lock; the held lock's stat, or null
 * .why = mkdir is atomic, so of two racers exactly one creates the dir; a lock dir
 *   older than the stale bound belongs to a holder that died, and is cleared
 */
const getLockHeldOnce = (input: { lockPath: string }): Stats | null => {
  // the lock is ours when our mkdir made the dir
  if (isDirMade({ path: input.lockPath }))
    return getFileStatOrNull({ path: input.lockPath });

  // a live holder keeps the lock; an abandoned one is cleared for the next attempt
  const lockSeen = getFileStatOrNull({ path: input.lockPath });
  if (lockSeen && isLockStale({ lock: lockSeen }))
    delLockIfStillStale({ lockPath: input.lockPath, lock: lockSeen });
  return null;
};

/**
 * .what = remove the lock dir only when it is still the stale one given
 * .why = between the first read and the removal, a peer may have cleared it and
 *   taken a fresh one (a new inode), or its holder may have refreshed it (a new
 *   mtime); either way the lock is live again, and stays
 */
const delLockIfStillStale = (input: {
  lockPath: string;
  lock: Stats;
}): void => {
  const lockNow = getFileStatOrNull({ path: input.lockPath });
  if (lockNow?.ino !== input.lock.ino) return;
  if (!isLockStale({ lock: lockNow })) return;
  delDirSync({ path: input.lockPath });
};

/**
 * .what = remove the lock dir only when it is still the one given, by inode
 * .why = a peer may have cleared the given lock and taken a fresh one since it was
 *   read; that fresh lock is the peer's, and stays
 */
const delLockIfSame = (input: { lockPath: string; lock: Stats }): void => {
  const lockNow = getFileStatOrNull({ path: input.lockPath });
  if (lockNow?.ino !== input.lock.ino) return;
  delDirSync({ path: input.lockPath });
};

/**
 * .what = touch the lock dir's mtime, only when it is still the one given, by inode
 * .why = a fresh mtime keeps a live hold under the stale bound however long the
 *   procedure runs; a lock a peer has since taken is the peer's, and is left alone
 * .note = it runs in a timer, where a throw would crash the process; a lock dir a
 *   peer removed between the stat and the touch is absent, which is no fault
 */
const setLockFreshIfSame = (input: { lockPath: string; lock: Stats }): void => {
  const lockNow = getFileStatOrNull({ path: input.lockPath });
  if (lockNow?.ino !== input.lock.ino) return;
  const now = new Date();
  try {
    utimesSync(input.lockPath, now, now);
  } catch (error) {
    if (isErrnoEnoent(error)) return;
    throw error;
  }
};

/**
 * .what = is this lock dir older than the stale bound
 */
const isLockStale = (input: { lock: Stats }): boolean =>
  Date.now() - input.lock.mtimeMs > LOCK_STALE_MS;

/**
 * .what = make a dir; false when a dir is already at the path
 * .why = the atomic step of the lock: of two racers, exactly one gets true
 */
const isDirMade = (input: { path: string }): boolean => {
  try {
    mkdirSync(input.path);
    return true;
  } catch (error) {
    if (isErrnoEexist(error)) return false;
    throw error;
  }
};
