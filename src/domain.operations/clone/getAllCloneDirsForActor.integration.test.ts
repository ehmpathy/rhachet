import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getAllCloneDirsForActor } from './getAllCloneDirsForActor';

describe('getAllCloneDirsForActor', () => {
  given('[case1] an actor with no clones dir', () => {
    const scene = useBeforeAll(async () => ({
      actorDir: genTempDir({ slug: 'clone-dirs-none' }),
    }));

    when('[t0] its clone dirs are listed', () => {
      then('the list is empty', () => {
        expect(getAllCloneDirsForActor({ actorDir: scene.actorDir })).toEqual(
          [],
        );
      });
    });
  });

  given(
    '[case2] an actor with a promoted clone, a staged clone, a stray file, and a stray dir',
    () => {
      const scene = useBeforeAll(async () => {
        const actorDir = genTempDir({ slug: 'clone-dirs-mixed' });
        const clonesDir = join(actorDir, 'clones');
        mkdirSync(join(clonesDir, 'serial=aaaa-1111'), { recursive: true });
        mkdirSync(join(clonesDir, '.serial=bbbb-2222.tmp'), {
          recursive: true,
        });
        mkdirSync(join(clonesDir, 'notes'), { recursive: true });
        writeFileSync(join(clonesDir, 'serial=cccc-3333'), 'a file, not a dir');
        return { actorDir, clonesDir };
      });

      when('[t0] its clone dirs are listed', () => {
        then('only the promoted clone dir is listed', () => {
          expect(getAllCloneDirsForActor({ actorDir: scene.actorDir })).toEqual(
            [join(scene.clonesDir, 'serial=aaaa-1111')],
          );
        });
      });
    },
  );
});
