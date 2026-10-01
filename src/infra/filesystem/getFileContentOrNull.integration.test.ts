import { genTempDir, getError, given, then, when } from 'test-fns';

import { mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getFileContentOrNull } from './getFileContentOrNull';

describe('getFileContentOrNull', () => {
  given('[case1] a file is at the path', () => {
    const dir = genTempDir({ slug: 'content-present' });
    const path = join(dir, 'a.txt');
    writeFileSync(path, 'hello');

    when('[t0] it is read', () => {
      then('it returns the content', () => {
        expect(getFileContentOrNull({ path })).toEqual('hello');
      });
    });
  });

  given('[case2] no entry is at the path', () => {
    const dir = genTempDir({ slug: 'content-absent' });

    when('[t0] it is read', () => {
      then('it returns null', () => {
        expect(getFileContentOrNull({ path: join(dir, 'none.txt') })).toEqual(
          null,
        );
      });
    });
  });

  given('[case3] a dangled symlink is at the path', () => {
    const dir = genTempDir({ slug: 'content-dangled' });
    const path = join(dir, 'link.txt');
    symlinkSync(join(dir, 'gone.txt'), path);

    when('[t0] it is read', () => {
      then('it returns null', () => {
        expect(getFileContentOrNull({ path })).toEqual(null);
      });
    });
  });

  given('[case4] a directory is at the path', () => {
    const dir = genTempDir({ slug: 'content-dir' });
    const path = join(dir, 'sub');
    mkdirSync(path);

    when('[t0] it is read', () => {
      then('it surfaces the error rather than read as absent', async () => {
        const error = await getError(() => getFileContentOrNull({ path }));
        expect(error).toHaveProperty('code', 'EISDIR');
      });
    });
  });
});
