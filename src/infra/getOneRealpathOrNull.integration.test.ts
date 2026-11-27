import { genTempDir, given, then, when } from 'test-fns';

import { mkdirSync, realpathSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getOneRealpathOrNull } from './getOneRealpathOrNull';

describe('getOneRealpathOrNull', () => {
  given('[case1] a link that lands on a real dir', () => {
    when('[t0] its realpath is read', () => {
      then('it returns the realpath of the target', () => {
        const root = genTempDir({ slug: 'realpath-or-null-lands' });
        mkdirSync(join(root, 'target'));
        symlinkSync('target', join(root, 'link'));
        expect(getOneRealpathOrNull({ path: join(root, 'link') })).toEqual(
          realpathSync(join(root, 'target')),
        );
      });
    });
  });

  given('[case2] a link whose target is absent', () => {
    when('[t0] its realpath is read', () => {
      then('it returns null', () => {
        const root = genTempDir({ slug: 'realpath-or-null-dangle' });
        symlinkSync('absent', join(root, 'link'));
        expect(getOneRealpathOrNull({ path: join(root, 'link') })).toBeNull();
      });
    });
  });

  given(
    '[case3] a path that runs through a file as though it were a dir',
    () => {
      when('[t0] its realpath is read', () => {
        then('it returns null (ENOTDIR reads as a dangle)', () => {
          const root = genTempDir({ slug: 'realpath-or-null-notdir' });
          writeFileSync(join(root, 'file'), '');
          expect(
            getOneRealpathOrNull({ path: join(root, 'file', 'below') }),
          ).toBeNull();
        });
      });
    },
  );

  given('[case4] two links that point at each other', () => {
    when('[t0] the realpath of one is read', () => {
      then('it returns null (ELOOP reads as a dangle)', () => {
        const root = genTempDir({ slug: 'realpath-or-null-loop' });
        symlinkSync('b', join(root, 'a'));
        symlinkSync('a', join(root, 'b'));
        expect(getOneRealpathOrNull({ path: join(root, 'a') })).toBeNull();
      });
    });
  });
});
