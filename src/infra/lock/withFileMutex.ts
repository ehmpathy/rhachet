import { ConstraintError } from 'helpful-errors';
import type { SimpleOnDiskCache } from 'simple-on-disk-cache';

import { mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative } from 'node:path';
import { emitRepoMutexWaitNotice } from './emitRepoMutexWaitNotice';

/**
 * .what = how long one hold may last before a peer may take the key
 * .why = five minutes, the stale bound the hand-rolled lock used. every section this guards is
 *   a read and a whole-file write of one small file, or the settings shield's hook sync, which
 *   runs in seconds; so a live holder never nears it, and a crashed holder blocks its peers
 *   for at most this long. the package default (30 min) would stall a peer half an hour
 *   behind a killed `rhx init`
 */
const LEASE_DURATION = { minutes: 5 } as const;

/**
 * .what = how long a caller waits for a peer's hold before it fails loud
 * .why = two minutes, the deadline the hand-rolled lock held to; it outlasts any live hold
 */
const ACQUIRE_TIMEOUT_MS = 120_000;

/**
 * .what = how often a waiter retries the key
 * .why = the package default (one second) is long beside a hold of a few milliseconds; a
 *   tenth of a second keeps a queue of `rhx` calls brisk. the package jitters each wait into
 *   [50%, 100%) of it
 */
const ACQUIRE_INTERVAL = { milliseconds: 100 } as const;

/**
 * .what = one on-disk cache per locks dir
 * .why = the cache dir is the lock's isolation scope, so every caller in this process that
 *   guards a file of one scope shares one instance
 * .note = deliberate mutation — a process-wide memo; a scope's cache is built once, on first use
 */
const cacheByDir = new Map<string, Promise<SimpleOnDiskCache>>();

/**
 * .what = the on-disk cache that holds one scope's mutex keys
 * .note = default `<root>/.locks/`; each wrapper names its own (`withRepoMutex`, `withHostMutex`)
 * .note = the root is keyed by realpath, so a symlink or worktree hop never splits one root into
 *   two scopes
 */
const getOneFileMutexCache = async (input: {
  root: string;
  locksDir: string | null;
}): Promise<SimpleOnDiskCache> => {
  // the dir is ensured on every use, never only at build: a caller may remove the locks dir
  //   between two guarded writes of one process, and the memoized cache must not then fault
  const dir = input.locksDir ?? join(realpathSync(input.root), '.locks');
  setFileMutexCacheDir({ dir });
  const found = cacheByDir.get(dir);
  if (found) return found;
  const created = (async () => {
    const { createCache } = await import('simple-on-disk-cache');
    return createCache({ directory: { local: { path: dir } } });
  })();
  cacheByDir.set(dir, created);
  return created;
};

/**
 * .what = findsert the mutex cache dir and its `*` ignore
 * .why = the dir holds only key files, which git must never see, so its ignore travels with it
 */
const setFileMutexCacheDir = (input: { dir: string }): void => {
  mkdirSync(input.dir, { recursive: true });
  try {
    writeFileSync(join(input.dir, '.gitignore'), '*\n', { flag: 'wx' });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
  }
};

/**
 * .what = the mutex key for one guarded file: its path relative to the root, or its absolute
 *   path when it sits outside the root
 * .why = the same name the hand-rolled lock keyed on (the file it guards), stable across the
 *   root's own path and every symlink hop, so two callers that reach one file two ways land
 *   on one key
 */
const asFileMutexKey = (input: { root: string; path: string }): string => {
  const pathCanonical = getOnePathCanonical({ path: input.path });
  const pathRelative = relative(realpathSync(input.root), pathCanonical);
  const isOutside = pathRelative.startsWith('..') || isAbsolute(pathRelative);
  return isOutside ? pathCanonical : pathRelative;
};

/**
 * .what = a file's absolute path with its dir followed through every symlink
 * .why = one caller reaches a brain dir through `<repo>/.claude` and another through the
 *   actors root; both must land on one key. the file itself may not exist yet, so only its
 *   dir is followed, and a dir not yet made keeps its given path
 */
const getOnePathCanonical = (input: { path: string }): string => {
  const pathAbsolute = isAbsolute(input.path)
    ? join(input.path)
    : join(process.cwd(), input.path);
  try {
    return join(realpathSync(dirname(pathAbsolute)), basename(pathAbsolute));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return pathAbsolute;
    throw error;
  }
};

/**
 * .what = run an async section while a mutex over one file is held, so two `rhx` processes
 *   (or two call chains of one) that write the file take turns
 * .why = the one owner of `with-simple-mutex` in rhachet (inventory.of=requirements.case=6):
 *   it fixes the cache, the lease, the wait bound and the wait notice, so every guarded
 *   read-modify-write shares one contract. `root` is neutral: a repo, a home, any dir the
 *   key is relative to; `withRepoMutex` and `withHostMutex` each name theirs
 *
 * .note = NOT reentrant: a nested writer under a held key uses its `*WithinLock` form
 * .note = a wait past the bound fails as a ConstraintError that names the file
 */
export const withFileMutex = async <T>(
  input: {
    root: string;
    path: string;
    /** the wait bound; default two minutes */
    waitMs?: number;
    /** the lease; default five minutes. a test shortens it to prove a lapsed hold is retaken */
    leaseMs?: number;
    /** where the mutex keys live; default `<root>/.locks/` */
    locksDir?: string;
  },
  logic: () => Promise<T>,
): Promise<T> => {
  const { withSimpleMutex, SimpleMutexAcquireTimeoutError } = await import(
    'with-simple-mutex'
  );
  const { isSimpleCacheConditionError } = await import('simple-on-disk-cache');
  const cache = await getOneFileMutexCache({
    root: input.root,
    locksDir: input.locksDir ?? null,
  });
  const waitMs = input.waitMs ?? ACQUIRE_TIMEOUT_MS;

  // announce the wait once, on the first put-if-absent a peer's hold refuses
  // .note = deliberate mutation — `isWaitAnnounced` and `isAcquired` are local flags this one
  //   call reads, the first to print the notice once, the second to tell a wait bound from a
  //   fault of the section
  let isWaitAnnounced = false;
  let isAcquired = false;
  const cacheAnnounced: SimpleOnDiskCache = {
    ...cache,
    set: async (...args) => {
      try {
        return await cache.set(...args);
      } catch (error) {
        const isPeerHold =
          args[2]?.condition?.version === null &&
          isSimpleCacheConditionError(error);
        if (isPeerHold && !isWaitAnnounced) {
          isWaitAnnounced = true;
          emitRepoMutexWaitNotice({ path: input.path });
        }
        throw error;
      }
    },
  };

  const guarded = withSimpleMutex(
    async () => {
      isAcquired = true;
      return logic();
    },
    {
      key: () => asFileMutexKey({ root: input.root, path: input.path }),
      cache: cacheAnnounced,
      lease: {
        duration:
          input.leaseMs === undefined
            ? LEASE_DURATION
            : { milliseconds: input.leaseMs },
      },
      acquire: {
        timeout: { milliseconds: waitMs },
        interval: ACQUIRE_INTERVAL,
      },
    },
  );

  try {
    return await guarded(undefined);
  } catch (error) {
    if (!isAcquired && error instanceof SimpleMutexAcquireTimeoutError)
      throw new ConstraintError('another rhx process holds this file', {
        path: input.path,
        waitMs,
        hint: 'wait for the other rhx process to finish, then retry. a hold left by a killed rhx lapses on its own within five minutes',
        cause: error,
      });
    throw error;
  }
};
