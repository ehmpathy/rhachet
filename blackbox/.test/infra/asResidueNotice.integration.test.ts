import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, realpathSync, utimesSync } from 'node:fs';
import { join } from 'node:path';

import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { asResidueNotice } from './asResidueNotice';

/**
 * .what = proves the delete the residue notice prints clears an old dir and keeps a fresh one
 * .why = a human copies that line as-is; it must remove only the pile, never a live run's dir
 */
describe('asResidueNotice.integration', () => {
  given('[case1] a temp root with an old test repo dir, a fresh one, and a peer dir', () => {
    const scene = useBeforeAll(async () => {
      const tmpRoot = realpathSync(genTempDir({ slug: 'residue-notice-root' }));

      // an old pile dir, last touched two days ago
      const dirOld = join(tmpRoot, 'rhachet-test-old');
      mkdirSync(join(dirOld, '.ssh'), { recursive: true });
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      utimesSync(dirOld, twoDaysAgo, twoDaysAgo);

      // a fresh dir, as a live run of a peer checkout would hold
      const dirFresh = join(tmpRoot, 'rhachet-test-live');
      mkdirSync(dirFresh, { recursive: true });

      // an old dir of another name, which the delete must not reach
      const dirOther = join(tmpRoot, 'other-old');
      mkdirSync(dirOther, { recursive: true });
      utimesSync(dirOther, twoDaysAgo, twoDaysAgo);

      // the exact command the notice prints
      const notice = asResidueNotice({ dirs: 1, stubs: 0, tmpRoot }) ?? '';
      const command =
        notice.split('\n').find((line) => line.includes('find '))?.replace(/^[\s│└─]+/, '') ?? '';

      return { tmpRoot, dirOld, dirFresh, dirOther, command };
    });

    when('[t0] the printed command runs', () => {
      useBeforeAll(async () => {
        execFileSync('sh', ['-c', scene.command]);
        return {};
      });

      then('the command was found in the notice', () => {
        expect(scene.command).toContain(`find ${scene.tmpRoot} -maxdepth 1`);
      });

      then('the old test repo dir is gone', () => {
        expect(existsSync(scene.dirOld)).toBe(false);
      });

      then('the fresh test repo dir, which a live run may hold, is kept', () => {
        expect(existsSync(scene.dirFresh)).toBe(true);
      });

      then('an old dir of another name is kept', () => {
        expect(existsSync(scene.dirOther)).toBe(true);
      });
    });
  });
});
