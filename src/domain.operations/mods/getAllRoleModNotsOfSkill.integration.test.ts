import { given, then, useBeforeAll, when } from 'test-fns';

import {
  genSampleRepoWithLinkedRole,
  putSampleFile,
} from '@src/.test/assets/genSampleRepoWithLinkedRole';

import { join } from 'node:path';
import { getAllRoleModNotsOfSkill } from './getAllRoleModNotsOfSkill';

/**
 * .what = the skill lookup's read of the mods that `not` a skill
 * .why = it is the one reader of mod state on the `run --skill` path, so a broken mod must be
 *        skipped there as the boot skips it, never thrown into the skill's own refusal
 *
 * .note = an integration test: it writes a temp repo and reads its mods off disk
 */
describe('getAllRoleModNotsOfSkill', () => {
  given('[case1] a sound mod that nots a skill the role ships', () => {
    const scene = useBeforeAll(async () => {
      const repo = genSampleRepoWithLinkedRole({
        slug: 'mods-nots-of-skill-sound',
        withMod: false,
      });
      putSampleFile({
        path: join(repo.modDir, 'boot.yml'),
        content: [
          'of: ehmpathy/mechanic@1.40.0',
          'skills:',
          '  not:',
          '    - skills/wax.board.sh',
          '',
        ].join('\n'),
      });
      return repo;
    });

    when('[t0] the nots of that skill are read', () => {
      then('the mod is named as the cause, with the path it nots', () => {
        const nots = getAllRoleModNotsOfSkill({
          cwd: scene.repo,
          slugSkill: 'wax.board',
          slugRole: null,
        });
        expect(nots.map((one) => ({ role: one.role, path: one.path }))).toEqual(
          [{ role: 'mechanic', path: 'skills/wax.board.sh' }],
        );
      });
    });
  });

  given('[case2] a refused mod whose boot.yml names the skill', () => {
    const scene = useBeforeAll(async () => {
      const repo = genSampleRepoWithLinkedRole({
        slug: 'mods-nots-of-skill-refused',
        withMod: false,
      });
      putSampleFile({
        path: join(repo.modDir, 'boot.yml'),
        content: [
          'of: ehmpathy/mechanic@1.40.0',
          'briefs:',
          '  not:',
          '    - briefs/rule.forbid.wipeoutz.md',
          'skills:',
          '  not:',
          '    - skills/wax.board.sh',
          '',
        ].join('\n'),
      });
      return repo;
    });

    when('[t0] the nots of that skill are read', () => {
      then(
        '🔴 the read does not throw the mod refusal, and names no not',
        () => {
          const nots = getAllRoleModNotsOfSkill({
            cwd: scene.repo,
            slugSkill: 'wax.board',
            slugRole: null,
          });
          expect(nots).toEqual([]);
        },
      );
    });
  });
});
