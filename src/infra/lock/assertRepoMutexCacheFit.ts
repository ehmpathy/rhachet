import { MalfunctionError } from 'helpful-errors';

import { readFileSync, realpathSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * .what = the lowest `simple-on-disk-cache` whose cache carries `version()`
 * .why = `with-simple-mutex` takes a key via a conditional put on `version()`; a cache from
 *   before it holds no such method
 */
const CACHE_VERSION_WANTED = '>= 1.8.1';

/**
 * .what = where the loaded `simple-on-disk-cache` sits on disk, and its version
 * .why = a foreign copy (a hoisted dir, a `NODE_PATH` entry, a global install) is the cause the
 *   human must find; the path is the one fact that names it
 */
const getOneCacheProvenance = (): { path: string; version: string } => {
  const manifestPath = require.resolve('simple-on-disk-cache/package.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
    version?: string;
  };
  return {
    path: realpathSync(dirname(manifestPath)),
    version: manifest.version ?? 'unknown',
  };
};

/**
 * .what = refuse a lock cache that lacks `version()`, and name the copy it came from
 * .why = with no `version()`, `with-simple-mutex` faults deep in its acquire with a bare
 *   TypeError that names no file; this names the copy before any key is taken, so no
 *   half-taken lock is left behind (vision case 5)
 */
export const assertRepoMutexCacheFit = (input: {
  cache: object;
  rhx: {
    active: { path: string; version: string };
    pinned: { path: string; version: string } | null;
  };
}): void => {
  const version = (input.cache as { version?: unknown }).version;
  if (typeof version === 'function') return;
  const cacheFound = getOneCacheProvenance();
  throw new MalfunctionError(
    'the lock cache lacks version(): a foreign simple-on-disk-cache copy',
    {
      cache: cacheFound,
      wanted: `simple-on-disk-cache ${CACHE_VERSION_WANTED}`,
      rhx: input.rhx,
      hint: `this rhx (${input.rhx.active.path}) loaded simple-on-disk-cache ${cacheFound.version} from ${cacheFound.path}; reinstall so its own copy loads (pnpm install), or run the repo's pinned rhx (npx rhx)`,
    },
  );
};
