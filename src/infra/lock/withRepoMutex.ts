import { ConstraintError } from 'helpful-errors';
import type { SimpleOnDiskCache } from 'simple-on-disk-cache';

import { mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
} from 'node:path';
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
 * .what = one on-disk cache per repo, keyed by the repo's realpath
 * .why = the cache dir is the lock's isolation scope, so every caller in this process that
 *   guards a file of one repo shares one instance
 * .note = deliberate mutation — a process-wide memo; a repo's cache is built once, on first use
 */
const cacheByRepo = new Map<string, Promise<SimpleOnDiskCache>>();

/**
 * .what = the on-disk cache that holds one repo's mutex keys
 * .note = `<repo>/.agent/.actors/.locks/`. the actors root (`getActorsRootDir`) is ignored by
 *   git, and the dir also writes its own `*` ignore, so no key file ever shows in `git status`,
 *   even before `rhx init` writes the actors ignore. the literal is restated here because infra
 *   may not import a domain operation
 * .note = keyed by realpath, so a symlink or worktree hop never splits one repo into two scopes
 */
const getOneRepoMutexCache = async (input: {
  repoPath: string;
}): Promise<SimpleOnDiskCache> => {
  // the dir is ensured on every use, never only at build: a caller may remove the actors root
  //   between two guarded writes of one process, and the memoized cache must not then fault
  const repoReal = realpathSync(input.repoPath);
  const dir = join(repoReal, '.agent', '.actors', '.locks');
  setRepoMutexCacheDir({ dir });
  const found = cacheByRepo.get(repoReal);
  if (found) return found;
  const created = (async () => {
    const { createCache } = await import('simple-on-disk-cache');
    return createCache({ directory: { local: { path: dir } } });
  })();
  cacheByRepo.set(repoReal, created);
  return created;
};

/**
 * .what = findsert the mutex cache dir and its `*` ignore
 * .why = the dir holds only key files, which git must never see, so its ignore travels with it
 */
const setRepoMutexCacheDir = (input: { dir: string }): void => {
  mkdirSync(input.dir, { recursive: true });
  try {
    writeFileSync(join(input.dir, '.gitignore'), '*\n', { flag: 'wx' });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
  }
};

/**
 * .what = the mutex key for one guarded file: its path relative to the repo, or its absolute
 *   path when it sits outside the repo
 * .why = the same name the hand-rolled lock keyed on (the file it guards), stable across the
 *   repo's own path and every symlink hop, so two callers that reach one file two ways land
 *   on one key
 */
const asRepoMutexKey = (input: { repoPath: string; path: string }): string => {
  const pathCanonical = getOnePathCanonical({ path: input.path });
  const pathRelative = relative(realpathSync(input.repoPath), pathCanonical);
  const isOutside = pathRelative.startsWith('..') || isAbsolute(pathRelative);
  return isOutside ? pathCanonical : pathRelative;
};

/**
 * .what = a file's path with its dir resolved through every symlink
 * .why = one caller reaches a brain dir through `<repo>/.claude` and another through the
 *   actors root; both must land on one key. the file itself may not exist yet, so only its
 *   dir is resolved, and a dir not yet made keeps its given path
 */
const getOnePathCanonical = (input: { path: string }): string => {
  const pathAbsolute = resolve(input.path);
  try {
    return join(realpathSync(dirname(pathAbsolute)), basename(pathAbsolute));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return pathAbsolute;
    throw error;
  }
};

/**
 * .what = run an async section while this repo's mutex over one file is held, so two `rhx`
 *   processes (or two call chains of one) that write the file take turns
 * .why = the one owner of `with-simple-mutex` in rhachet (inventory.of=requirements.case=6):
 *   it fixes the cache, the lease, the wait bound and the wait notice, so every guarded
 *   read-modify-write shares one contract
 *
 * .note = NOT reentrant: a section that takes the same key again from within its own hold
 *   waits on itself until the wait bound fails it. a caller that holds a key calls the
 *   `*WithinLock` form of a nested writer, never its locked form
 * .note = the wait is announced once, on the first lost attempt — the moment a peer is found
 *   to hold the key — the same line the hand-rolled lock printed
 * .note = a wait past the bound fails loud as a ConstraintError that names the file; a fault
 *   of the section itself propagates as it was thrown
 * .note = `with-simple-mutex` and the cache load lazily, so a cli call that guards no file
 *   pays no load for them (rule.require.thinnest-import-path)
 */
export const withRepoMutex = async <T>(
  input: {
    repoPath: string;
    path: string;
    /** the wait bound; default two minutes */
    waitMs?: number;
    /** the lease; default five minutes. a test shortens it to prove a lapsed hold is retaken */
    leaseMs?: number;
  },
  logic: () => Promise<T>,
): Promise<T> => {
  const { withSimpleMutex, SimpleMutexAcquireTimeoutError } = await import(
    'with-simple-mutex'
  );
  const { isSimpleCacheConditionError } = await import('simple-on-disk-cache');
  const cache = await getOneRepoMutexCache({ repoPath: input.repoPath });
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
      key: () => asRepoMutexKey(input),
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
        hint: 'wait for the other rhx init / enroll to finish, then retry. a hold left by a killed rhx lapses on its own within five minutes',
        cause: error,
      });
    throw error;
  }
};
