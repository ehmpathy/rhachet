import { MalfunctionError } from 'helpful-errors';
import { createCache } from 'simple-on-disk-cache';
import { genTempDir, getError, given, then, when } from 'test-fns';
import { withSimpleMutex } from 'with-simple-mutex';

import { assertRepoMutexCacheFit } from './assertRepoMutexCacheFit';

/**
 * .what = a cache shaped like `simple-on-disk-cache@1.7.10`: get and set, no `version()`
 */
const genCacheWithoutVersion = (input: { dir: string }) => {
  const { version: _version, ...rest } = createCache({
    directory: { local: { path: input.dir } },
  });
  return rest;
};

const rhx = {
  active: { path: '/opt/rhx-global/node_modules/rhachet', version: '1.49.0' },
  pinned: null,
};

describe('assertRepoMutexCacheFit', () => {
  given('[case1] a cache from the declared simple-on-disk-cache', () => {
    when('[t0] it is checked', () => {
      then('it passes', () => {
        const dir = genTempDir({ slug: 'mutex-cache-fit' });
        const cache = createCache({ directory: { local: { path: dir } } });
        expect(() => assertRepoMutexCacheFit({ cache, rhx })).not.toThrow();
      });
    });
  });

  given('[case2] a foreign cache with no version()', () => {
    when(
      '[t0] with-simple-mutex takes it unchecked (the defect the guard closes)',
      () => {
        then(
          'the acquire faults with an error that names no copy',
          async () => {
            const dir = genTempDir({ slug: 'mutex-cache-foreign-raw' });
            const guarded = withSimpleMutex(async () => 'held', {
              key: () => 'k',
              cache: genCacheWithoutVersion({ dir }) as never,
              lease: { duration: { seconds: 5 } },
              acquire: {
                timeout: { seconds: 2 },
                interval: { milliseconds: 50 },
              },
            });
            const error = await getError(guarded(undefined));
            expect(error.message).not.toContain('simple-on-disk-cache');
          },
        );
      },
    );

    when('[t1] it is checked', () => {
      then(
        'a MalfunctionError names the copy, its version, and the rhx',
        async () => {
          const dir = genTempDir({ slug: 'mutex-cache-foreign' });
          const error = await getError(() =>
            assertRepoMutexCacheFit({
              cache: genCacheWithoutVersion({ dir }),
              rhx,
            }),
          );
          expect(error).toBeInstanceOf(MalfunctionError);
          expect(error.message).toContain('lacks version()');
          expect(error.message).toContain('simple-on-disk-cache');
          expect(error.message).toContain(rhx.active.path);
        },
      );
    });
  });
});
