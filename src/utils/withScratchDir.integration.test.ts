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

  given('[case3] two concurrent callers share one fresh parent', () => {
    const scene = useBeforeAll(async () => {
      const repoPath = genTempDir({ slug: 'scratch-dir-concurrent' });
      const within = join(repoPath, '.agent', '.cache', 'scratch');

      // the second caller holds its dir open until the first, which created the parent, returns
      const firstDone = { settle: (): void => undefined };
      const firstReturned = new Promise<void>((settle) => {
        firstDone.settle = settle;
      });
      const first = withScratchDir({ within, prefix: 'render-' }, async () => {
        await new Promise((settle) => setTimeout(settle, 10));
        return 'first';
      }).then((result) => {
        firstDone.settle();
        return result;
      });
      const second = withScratchDir(
        { within, prefix: 'render-' },
        async (scratchDir) => {
          await firstReturned;
          return { survived: existsSync(join(scratchDir, '.gitignore')) };
        },
      );
      const [, secondSeen] = await Promise.all([first, second]);
      return { repoPath, secondSeen };
    });

    when('[t0] the creator of the parent returns first', () => {
      then('the sibling caller scratch dir survives it', () => {
        expect(scene.secondSeen.survived).toEqual(true);
      });

      then('the last caller out removes every created dir', () => {
        expect(existsSync(join(scene.repoPath, '.agent'))).toEqual(false);
      });
    });
  });
});
