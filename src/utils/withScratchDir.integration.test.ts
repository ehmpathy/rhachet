import {
  genTempDir,
  getError,
  given,
  then,
  useBeforeAll,
  when,
} from 'test-fns';

import { existsSync, readdirSync, readFileSync, rmdirSync } from 'node:fs';
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

      then(
        'the scratch dir is removed after it returns; no file remains',
        () => {
          expect(existsSync(scene.seen.scratchDir)).toEqual(false);
          expect(readdirSync(scene.within)).toEqual([]);
        },
      );
    });
  });

  given('[case2] the logic throws', () => {
    const scene = useBeforeAll(async () => {
      const repoPath = genTempDir({ slug: 'scratch-dir-throw' });
      const within = join(repoPath, '.agent', '.cache', 'scratch');
      const error = await getError(
        withScratchDir({ within, prefix: 'render-' }, async () => {
          throw new Error('render failed');
        }),
      );
      return { within, error };
    });

    when('[t0] the call settles', () => {
      then('the error propagates', () => {
        expect(scene.error.message).toEqual('render failed');
      });

      then('the scratch dir is removed', () => {
        expect(readdirSync(scene.within)).toEqual([]);
      });
    });
  });

  given('[case3] two concurrent callers share one parent', () => {
    const scene = useBeforeAll(async () => {
      const repoPath = genTempDir({ slug: 'scratch-dir-concurrent' });
      const within = join(repoPath, '.agent', '.cache', 'scratch');

      // the second caller holds its dir open until the first returns
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
      return { within, secondSeen };
    });

    when('[t0] the first caller returns first', () => {
      then('the peer caller scratch dir survives it', () => {
        expect(scene.secondSeen.survived).toEqual(true);
      });

      then('both scratch dirs are removed once both return', () => {
        expect(readdirSync(scene.within)).toEqual([]);
      });
    });
  });

  given('[case4] a peer removed the parent between two calls', () => {
    const scene = useBeforeAll(async () => {
      const repoPath = genTempDir({ slug: 'scratch-dir-parent-gone' });
      const within = join(repoPath, '.agent', '.cache', 'scratch');
      await withScratchDir({ within, prefix: 'render-' }, async () => null);
      rmdirSync(within);
      const seen = await withScratchDir(
        { within, prefix: 'render-' },
        async (scratchDir) => existsSync(scratchDir),
      );
      return { seen };
    });

    when('[t0] the second call runs', () => {
      then('it recreates the parent and runs, never ENOENT', () => {
        expect(scene.seen).toEqual(true);
      });
    });
  });
});
