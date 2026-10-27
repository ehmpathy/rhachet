import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { mkdirSync, realpathSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { getRealpathOfNearestExtant } from './getRealpathOfNearestExtant';

describe('getRealpathOfNearestExtant', () => {
  given('[case1] a repo dir and a dir outside it', () => {
    const scene = useBeforeAll(async () => {
      const repo = realpathSync(genTempDir({ slug: 'nearest-extant-repo' }));
      const outside = realpathSync(
        genTempDir({ slug: 'nearest-extant-outside' }),
      );
      mkdirSync(join(repo, 'inside'), { recursive: true });
      symlinkSync(outside, join(repo, 'linked'));
      symlinkSync(join(outside, 'absent-target'), join(repo, 'broken'));
      return { repo, outside };
    });

    when('[t0] each shape of path is measured', () => {
      then('an extant path is its own realpath', () => {
        expect(
          getRealpathOfNearestExtant({ path: join(scene.repo, 'inside') }),
        ).toEqual(join(scene.repo, 'inside'));
      });

      then('an absent path under an extant dir lands under that dir', () => {
        expect(
          getRealpathOfNearestExtant({
            path: join(scene.repo, 'inside', 'a', 'b'),
          }),
        ).toEqual(join(scene.repo, 'inside', 'a', 'b'));
      });

      then('an absent path under a link out lands outside', () => {
        expect(
          getRealpathOfNearestExtant({
            path: join(scene.repo, 'linked', 'a'),
          }),
        ).toEqual(join(scene.outside, 'a'));
      });

      then('a broken link out lands at its target, outside', () => {
        expect(
          getRealpathOfNearestExtant({ path: join(scene.repo, 'broken') }),
        ).toEqual(join(scene.outside, 'absent-target'));
      });

      then('an absent path under a broken link out lands outside', () => {
        expect(
          getRealpathOfNearestExtant({
            path: join(scene.repo, 'broken', 'brain', '.claude'),
          }),
        ).toEqual(join(scene.outside, 'absent-target', 'brain', '.claude'));
      });
    });
  });
});
