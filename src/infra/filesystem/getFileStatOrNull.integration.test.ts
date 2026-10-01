import { genTempDir, getError, given, then, when } from 'test-fns';

import { symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getFileStatOrNull } from './getFileStatOrNull';

describe('getFileStatOrNull', () => {
  given('[case1] a file is at the path', () => {
    const dir = genTempDir({ slug: 'stat-file' });
    const path = join(dir, 'a.txt');
    writeFileSync(path, 'hello');

    when('[t0] it is stat-ed', () => {
      then('it returns the stats of a file', () => {
        expect(getFileStatOrNull({ path })?.isFile()).toEqual(true);
      });
    });
  });

  given('[case2] a dangled symlink is at the path', () => {
    const dir = genTempDir({ slug: 'stat-dangled' });
    const path = join(dir, 'link.txt');
    symlinkSync(join(dir, 'gone.txt'), path);

    when('[t0] it is stat-ed', () => {
      then('it returns the stats of the link itself', () => {
        expect(getFileStatOrNull({ path })?.isSymbolicLink()).toEqual(true);
      });
    });
  });

  given('[case3] no entry is at the path', () => {
    const dir = genTempDir({ slug: 'stat-absent' });

    when('[t0] it is stat-ed', () => {
      then('it returns null', () => {
        expect(getFileStatOrNull({ path: join(dir, 'none.txt') })).toEqual(
          null,
        );
      });
    });
  });

  given('[case4] a path under a file, not a dir', () => {
    const dir = genTempDir({ slug: 'stat-notdir' });
    const file = join(dir, 'a.txt');
    writeFileSync(file, 'hello');

    when('[t0] it is stat-ed', () => {
      then('it surfaces the error rather than read as absent', async () => {
        const error = await getError(() =>
          getFileStatOrNull({ path: join(file, 'b.txt') }),
        );
        expect(error).toHaveProperty('code', 'ENOTDIR');
      });
    });
  });
});
