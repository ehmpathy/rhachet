import { ConstraintError } from 'helpful-errors';
import type { IsoDuration } from 'iso-time';
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
 *   tenth of a second keeps a queue of callers brisk. the package jitters each wait into
 *   [50%, 100%) of it
 */
const ACQUIRE_INTERVAL = { milliseconds: 100 } as const;

/**
 * .what = one on-disk cache per dir
 * .why = the cache dir is the lock's isolation scope, so every caller in this process that
 *   locks within one dir shares one instance
 * .note = deliberate mutation — a process-wide memo; a dir's cache is built once, on first use
 */
const cacheByDir = new Map<string, Promise<SimpleOnDiskCache>>();

/**
 * .what = the on-disk cache that holds one dir's mutex keys
 * .why = the mutex reads and writes its keys through this cache, so all holds within one dir
 *   meet on one set of files
 * .note = the dir is ensured on every use, never only at build: a caller may remove it
 *   between two holds of one process, and the memoized cache must not then fault
 * .note = a build that rejects is evicted, so one transient fault is retried by the next call
 *   rather than replayed to every lock in the dir for the life of the process
 */
const genDiskMutexCache = async (input: {
  dir: string;
}): Promise<SimpleOnDiskCache> => {
  mkdirSync(input.dir, { recursive: true });
  const found = cacheByDir.get(input.dir);
  if (found) return found;
  const created = (async () => {
    const { createCache } = await import('simple-on-disk-cache');
    return createCache({ directory: { local: { path: input.dir } } });
  })();
  cacheByDir.set(input.dir, created);
  created.catch(() => {
    if (cacheByDir.get(input.dir) === created) cacheByDir.delete(input.dir);
  });
  return created;
};

/**
 * .what = whether a failed `cache.set` was a put-if-absent that a peer's hold refused
 * .why = only that refusal means a peer holds the key; any other fault of the set is not a wait
 * .note = `cache.set(key, value, options)`: the mutex asks put-if-absent via
 *   `options.condition.version === null`
 */
const isPeerHoldRefusal = (input: {
  setArgs: Parameters<SimpleOnDiskCache['set']>;
  error: unknown;
  isSimpleCacheConditionError: (error: unknown) => boolean;
}): boolean => {
  const [, , setOptions] = input.setArgs;
  const isPutIfAbsent = setOptions?.condition?.version === null;
  return isPutIfAbsent && input.isSimpleCacheConditionError(input.error);
};

/**
 * .what = the cache, with a `set` that runs `onWait` once, on the first peer-hold refusal
 * .why = the mutex reports no wait of its own; its first refused put-if-absent is the moment
 *   a caller starts to wait, so that is where the wait is announced
 * .note = deliberate mutation — `isWaitAnnounced` is a flag private to the cache this returns,
 *   so each call of withDiskMutex (each wait) announces at most once; two waits in one
 *   process announce twice, one line per wait
 */
const asDiskMutexCacheWithWaitNotice = (input: {
  cache: SimpleOnDiskCache;
  onWait: (() => void) | null;
  isSimpleCacheConditionError: (error: unknown) => boolean;
}): SimpleOnDiskCache => {
  const { cache, onWait, isSimpleCacheConditionError } = input;
  if (!onWait) return cache;
  let isWaitAnnounced = false;
  return {
    ...cache,
    set: async (...args) => {
      try {
        return await cache.set(...args);
      } catch (error) {
        const isFirstPeerHold =
          !isWaitAnnounced &&
          isPeerHoldRefusal({
            setArgs: args,
            error,
            isSimpleCacheConditionError,
          });
        if (isFirstPeerHold) {
          isWaitAnnounced = true;
          onWait();
        }
        throw error;
      }
    },
  };
};

/**
 * .what = run an async section while one key's mutex is held, over an on-disk cache in `dir`,
 *   so two processes (or two call chains of one) that take the key take turns
 * .why = every lock in rhachet takes `with-simple-mutex` through this file, its one owner
 *   (inventory.of=requirements.case=6): a repo file's lock (`withRepoMutex`, below) and a
 *   box-wide one (the aws export single-flight, the daemon spawn) alike
 *
 * .note = NOT reentrant: a section that takes the same key again from within its own hold
 *   waits on itself until the wait bound fails it
 * .note = `onWait` runs once, on the first put-if-absent a peer's hold refuses
 * .note = a wait past the bound throws what `asTimeoutError` returns; a fault of the section
 *   itself propagates as it was thrown
 * .note = `with-simple-mutex` and the cache load lazily, so a cli call that takes no lock
 *   pays no load for them (rule.require.thinnest-import-path)
 */
export const withDiskMutex = async <T>(
  input: {
    dir: string;
    key: string;
    lease: IsoDuration;
    wait: IsoDuration;
    onWait: (() => void) | null;
    asTimeoutError: (input: { cause: Error }) => Error;
  },
  logic: () => Promise<T>,
): Promise<T> => {
  const { withSimpleMutex, SimpleMutexAcquireTimeoutError } = await import(
    'with-simple-mutex'
  );
  const { isSimpleCacheConditionError } = await import('simple-on-disk-cache');
  const { toMilliseconds } = await import('iso-time');
  const cache = await genDiskMutexCache({ dir: input.dir });

  // announce the wait once, on the first put-if-absent a peer's hold refuses
  const cacheAnnounced = asDiskMutexCacheWithWaitNotice({
    cache,
    onWait: input.onWait,
    isSimpleCacheConditionError,
  });

  // .note = deliberate mutation — `isAcquired` tells a wait bound from a fault of the section
  let isAcquired = false;

  const guarded = withSimpleMutex(
    async () => {
      isAcquired = true;
      return logic();
    },
    {
      key: () => input.key,
      cache: cacheAnnounced,
      lease: { duration: { milliseconds: toMilliseconds(input.lease) } },
      acquire: {
        timeout: { milliseconds: toMilliseconds(input.wait) },
        interval: ACQUIRE_INTERVAL,
      },
    },
  );

  try {
    return await guarded(undefined);
  } catch (error) {
    if (!isAcquired && error instanceof SimpleMutexAcquireTimeoutError)
      throw input.asTimeoutError({ cause: error });
    throw error;
  }
};

/**
 * .what = the dir that holds one repo's mutex keys
 * .note = `<repo>/.agent/.actors/.locks/`. the actors root (`getActorsRootDir`) is ignored by
 *   git, and the dir also writes its own `*` ignore, so no key file ever shows in `git status`,
 *   even before `rhx init` writes the actors ignore. the literal is restated here because infra
 *   may not import a domain operation
 * .note = keyed by realpath, so a symlink or worktree hop never splits one repo into two scopes
 * .note = the dir is ensured on every use: a caller may remove the actors root between two
 *   guarded writes of one process
 */
const genRepoMutexDir = (input: { repoPath: string }): string => {
  const dir = join(realpathSync(input.repoPath), '.agent', '.actors', '.locks');
  setRepoMutexCacheDir({ dir });
  return dir;
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
 * .why = every guarded read-modify-write of a repo file shares one contract: the cache dir,
 *   the lease, the wait bound and the wait notice, over `withDiskMutex` above
 *
 * .note = NOT reentrant: a section that takes the same key again from within its own hold
 *   waits on itself until the wait bound fails it. a caller that holds a key calls the
 *   `*WithinLock` form of a nested writer, never its locked form
 * .note = the wait is announced once, on the first lost attempt — the moment a peer is found
 *   to hold the key — the same line the hand-rolled lock printed
 * .note = a wait past the bound fails loud as a ConstraintError that names the file; a fault
 *   of the section itself propagates as it was thrown
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
  const waitMs = input.waitMs ?? ACQUIRE_TIMEOUT_MS;
  return withDiskMutex(
    {
      dir: genRepoMutexDir({ repoPath: input.repoPath }),
      key: asRepoMutexKey(input),
      lease:
        input.leaseMs === undefined
          ? LEASE_DURATION
          : { milliseconds: input.leaseMs },
      wait: { milliseconds: waitMs },
      onWait: () => emitRepoMutexWaitNotice({ path: input.path }),
      asTimeoutError: ({ cause }) =>
        new ConstraintError('another rhx process holds this file', {
          path: input.path,
          waitMs,
          hint: 'wait for the other rhx init / enroll to finish, then retry. a hold left by a killed rhx lapses on its own within five minutes',
          cause,
        }),
    },
    logic,
  );
};
