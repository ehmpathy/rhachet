import { genTempDir, given, then, when } from 'test-fns';

import { mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { isDirLink } from './isDirLink';

describe('isDirLink', () => {
  given('[case1] a dir, a file, and links to each', () => {
    const root = genTempDir({ slug: 'is-dir-link' });
    mkdirSync(join(root, 'store'));
    writeFileSync(join(root, 'file.md'), '');
    symlinkSync(join(root, 'store'), join(root, 'link-dir'), 'dir');
    symlinkSync(join(root, 'file.md'), join(root, 'link-file'));
    symlinkSync(join(root, 'absent'), join(root, 'link-dangle'));

    when('[t0] each is probed', () => {
      then('a link to a dir is a dir link', () => {
        expect(isDirLink({ path: join(root, 'link-dir') })).toEqual(true);
      });

      then('a plain dir, a link to a file, and a dangled link are not', () => {
        expect(isDirLink({ path: join(root, 'store') })).toEqual(false);
        expect(isDirLink({ path: join(root, 'link-file') })).toEqual(false);
        expect(isDirLink({ path: join(root, 'link-dangle') })).toEqual(false);
      });
    });
  });

  given('[case2] a path gone before the probe, as mid a view swap', () => {
    const root = genTempDir({ slug: 'is-dir-link-gone' });

    when('[t0] it is probed', () => {
      then('it is no dir link, and the probe does not throw', () => {
        expect(isDirLink({ path: join(root, 'gone') })).toEqual(false);
      });
    });
  });
});
