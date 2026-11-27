import { given, then, when } from 'test-fns';

import { join } from 'node:path';
import { filterPathsByGlob } from './filterBootResourcesByGlob';

/**
 * .what = the in-memory contract of the boot glob filter
 * .why = a skipped mod boots its role as published, and a view the last render left modded lacks
 *        each not on disk; the filter must match the boot's own universe, never the disk (F03)
 */
describe('filterPathsByGlob', () => {
  // a dir that holds no file at all, so no match can come from the disk
  const cwd = join('/', 'nowhere', 'role=surfer');

  given('[case1] a path the disk does not hold', () => {
    when('[t0] a glob names it', () => {
      then('it matches: the paths given are the universe', async () => {
        const path = join(cwd, 'briefs', 'rule.forbid.wipeouts.md');
        const result = await filterPathsByGlob({
          paths: [path],
          globs: ['briefs/rule.forbid.wipeouts.md'],
          cwd,
        });
        expect(result).toEqual([path]);
      });
    });
  });

  given('[case2] a glob that leads with ./', () => {
    when('[t0] it names a held path', () => {
      then('it matches as though the ./ were absent', async () => {
        const path = join(cwd, 'briefs', 'howto.paddle-out.md');
        const result = await filterPathsByGlob({
          paths: [path],
          globs: ['./briefs/howto.paddle-out.md'],
          cwd,
        });
        expect(result).toEqual([path]);
      });
    });
  });

  given('[case3] a dotfile under a wildcard', () => {
    when('[t0] the glob is briefs/*', () => {
      then('the dotfile does not match, the plain file does', async () => {
        const pathPlain = join(cwd, 'briefs', 'core.md');
        const pathDot = join(cwd, 'briefs', '.draft.md');
        const result = await filterPathsByGlob({
          paths: [pathDot, pathPlain],
          globs: ['briefs/*'],
          cwd,
        });
        expect(result).toEqual([pathPlain]);
      });
    });
  });

  given('[case4] a path outside the cwd', () => {
    when('[t0] the glob is **', () => {
      then('it does not match', async () => {
        const result = await filterPathsByGlob({
          paths: [join('/', 'elsewhere', 'core.md')],
          globs: ['**'],
          cwd,
        });
        expect(result).toEqual([]);
      });
    });
  });
});
