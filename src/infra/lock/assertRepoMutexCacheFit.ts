import { MalfunctionError } from 'helpful-errors';

import { readFileSync, realpathSync } from 'node:fs';
import { dirname } from 'node:path';
import { asRecordOrNull } from '../asRecordOrNull';

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
  const manifest = asRecordOrNull({
    value: JSON.parse(readFileSync(manifestPath, 'utf8')),
  });
  return {
    path: realpathSync(dirname(manifestPath)),
    version: asVersionOrUnknown({ manifest }),
  };
};

/**
 * .what = the manifest's version string, or 'unknown' when it declares none
 */
const asVersionOrUnknown = (input: {
  manifest: Record<string, unknown> | null;
}): string =>
  typeof input.manifest?.version === 'string'
    ? input.manifest.version
    : 'unknown';

/**
 * .what = whether the cache carries a callable `version()`
 */
const isCacheVersionCallable = (input: { cache: object }): boolean =>
  'version' in input.cache && typeof input.cache.version === 'function';

/**
 * .what = refuse a lock cache that lacks `version()`, and name the copy it came from
 * .why = with no `version()`, `with-simple-mutex` faults deep in its acquire with a bare
 *   TypeError that names no file; this names the copy before any key is taken, so no
 *   half-taken lock is left behind (vision case 5)
 *
 * .note = `rhx` is a getter: the provenance is read only to name a refusal, never on a fit cache
 */
export const assertRepoMutexCacheFit = (input: {
  cache: object;
  rhx: () => {
    active: { path: string; version: string };
    pinned: { path: string; version: string } | null;
  };
}): void => {
  if (isCacheVersionCallable({ cache: input.cache })) return;
  const cacheFound = getOneCacheProvenance();
  const rhx = input.rhx();
  throw new MalfunctionError(
    'the lock cache lacks version(): a foreign simple-on-disk-cache copy',
    {
      cache: cacheFound,
      wanted: `simple-on-disk-cache ${CACHE_VERSION_WANTED}`,
      rhx,
      hint: `this rhx (${rhx.active.path}) loaded simple-on-disk-cache ${cacheFound.version} from ${cacheFound.path}; reinstall so its own copy loads (pnpm install), or run the repo's pinned rhx (npx rhx)`,
    },
  );
};
