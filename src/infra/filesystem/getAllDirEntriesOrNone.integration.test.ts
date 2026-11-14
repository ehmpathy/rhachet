import { genTempDir, getError, given, then, when } from 'test-fns';

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getAllDirEntriesOrNone } from './getAllDirEntriesOrNone';

describe('getAllDirEntriesOrNone', () => {
  given('[case1] a dir with entries', () => {
    const dir = genTempDir({ slug: 'dir-entries-some' });
    writeFileSync(join(dir, 'b.md'), '');
    mkdirSync(join(dir, 'a'));

    when('[t0] the entries are read', () => {
      then('each entry is named, sorted', () => {
        expect(getAllDirEntriesOrNone({ dir })).toEqual(['a', 'b.md']);
      });
    });
  });

  given('[case2] a dir that is absent', () => {
    const dir = join(genTempDir({ slug: 'dir-entries-absent' }), 'gone');

    when('[t0] the entries are read', () => {
      then('there are none, and no throw', () => {
        expect(getAllDirEntriesOrNone({ dir })).toEqual([]);
      });
    });
  });

  given('[case3] a path that is a file, not a dir', () => {
    const root = genTempDir({ slug: 'dir-entries-file' });
    const dir = join(root, 'file.md');
    writeFileSync(dir, '');

    when('[t0] the entries are read', () => {
      then('the fault is real, and throws', async () => {
        const error = await getError(async () =>
          getAllDirEntriesOrNone({ dir }),
        );
        expect((error as NodeJS.ErrnoException).code).toEqual('ENOTDIR');
      });
    });
  });
});
