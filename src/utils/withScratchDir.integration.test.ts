import {
  genTempDir,
  getError,
  given,
  then,
  useBeforeAll,
  when,
} from 'test-fns';

import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { withScratchDir } from './withScratchDir';

describe('withScratchDir', () => {
  given('[case1] a repo with no cache dir', () => {
    const scene = useBeforeAll(async () => {
      const repoPath = genTempDir({ slug: 'scratch-dir-fresh' });
      const within = join(repoPath, '.agent', '.cache', 'scratch');
      const seen = await withScratchDir(
        { within, prefix: 'render-' },
        async (scratchDir) => ({
          scratchDir,
          gitignore: readFileSync(join(scratchDir, '.gitignore'), 'utf8'),
        }),
      );
      return { repoPath, within, seen };
    });

    when('[t0] logic runs in the scratch dir', () => {
      then('the scratch dir sits inside the repo', () => {
        expect(scene.seen.scratchDir.startsWith(scene.within)).toEqual(true);
      });

      then('the scratch dir ignores itself', () => {
        expect(scene.seen.gitignore).toEqual('*\n');
      });

      then('every dir the call created is removed after it returns', () => {
        expect(existsSync(scene.seen.scratchDir)).toEqual(false);
        expect(existsSync(join(scene.repoPath, '.agent'))).toEqual(false);
      });
    });
  });

  given('[case2] a repo whose cache dir already exists', () => {
    const scene = useBeforeAll(async () => {
      const repoPath = genTempDir({ slug: 'scratch-dir-extant' });
      const cache = join(repoPath, '.agent', '.cache');
      mkdirSync(cache, { recursive: true });
      const within = join(cache, 'scratch');
      const error = await getError(
        withScratchDir({ within, prefix: 'render-' }, async () => {
          throw new Error('render failed');
        }),
      );
      return { cache, within, error };
    });

    when('[t0] the logic throws', () => {
      then('the error propagates', () => {
        expect(scene.error.message).toEqual('render failed');
      });

      then('the dirs it created are removed, the extant one is kept', () => {
        expect(existsSync(scene.within)).toEqual(false);
        expect(existsSync(scene.cache)).toEqual(true);
      });
    });
  });
});
