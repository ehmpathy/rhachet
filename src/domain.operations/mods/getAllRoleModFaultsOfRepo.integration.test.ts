import { given, then, useBeforeAll, when } from 'test-fns';

import {
  genSampleRepoWithLinkedRole,
  putSampleFile,
} from '@src/.test/assets/genSampleRepoWithLinkedRole';

import { join } from 'node:path';
import { getAllRoleModFaultsOfRepo } from './getAllRoleModFaultsOfRepo';

/**
 * .what = the repo-wide fault sweep the stop and the upgrade read
 * .why = the stop holds until each fault is cured, so the sweep must name every fault the mods
 *        hold — and only those
 *
 * .note = an integration test: it writes a temp repo and reads its mods off disk
 */
describe('getAllRoleModFaultsOfRepo', () => {
  /**
   * .what = a mod spec whose `not` names a brief the role does not ship, so the mod is refused
   */
  const LINES_MOD_REFUSED = [
    'of: ehmpathy/mechanic@1.40.0',
    'briefs:',
    '  not:',
    '    - briefs/rule.forbid.wipeoutz.md',
    '',
  ];

  given('[case1] a sound mod', () => {
    const scene = useBeforeAll(async () => {
      const repo = genSampleRepoWithLinkedRole({
        slug: 'mods-faults-repo-sound',
        withMod: false,
      });
      putSampleFile({
        path: join(repo.modDir, 'boot.yml'),
        content: 'of: ehmpathy/mechanic@1.40.0\n',
      });
      return { faults: await getAllRoleModFaultsOfRepo({}, repo.context) };
    });

    when('[t0] the sweep runs', () => {
      then('it names no fault, so the stop never holds on a sound mod', () => {
        expect(scene.faults).toEqual([]);
      });
    });
  });

  given('[case2] a refused mod', () => {
    const scene = useBeforeAll(async () => {
      const repo = genSampleRepoWithLinkedRole({
        slug: 'mods-faults-repo-refused',
        withMod: false,
      });
      putSampleFile({
        path: join(repo.modDir, 'boot.yml'),
        content: LINES_MOD_REFUSED.join('\n'),
      });
      return { faults: await getAllRoleModFaultsOfRepo({}, repo.context) };
    });

    when('[t0] the sweep runs', () => {
      then('it names the mod by its role', () => {
        expect(scene.faults.map((one) => one.role)).toEqual(['mechanic']);
        expect(scene.faults[0]?.error.message).toContain('wipeoutz');
      });
    });
  });

  given('[case3] a refused mod, and a stray entry that shares its slug', () => {
    const scene = useBeforeAll(async () => {
      const repo = genSampleRepoWithLinkedRole({
        slug: 'mods-faults-repo-collision',
        withMod: false,
      });
      putSampleFile({
        path: join(repo.modDir, 'boot.yml'),
        content: LINES_MOD_REFUSED.join('\n'),
      });
      putSampleFile({
        path: join(repo.repo, '.agent', 'repo=.mods', 'mechanic'),
        content: 'notes on the mechanic mod\n',
      });
      return { faults: await getAllRoleModFaultsOfRepo({}, repo.context) };
    });

    when('[t0] the sweep runs', () => {
      then(
        '🔴 it names both the stray and the mod: the stray never hides the mod fault',
        () => {
          const messages = scene.faults.map((one) => one.error.message);
          expect(scene.faults).toHaveLength(2);
          expect(messages.some((one) => one.includes('names no role'))).toEqual(
            true,
          );
          expect(messages.some((one) => one.includes('wipeoutz'))).toEqual(
            true,
          );
        },
      );
    });
  });
});
