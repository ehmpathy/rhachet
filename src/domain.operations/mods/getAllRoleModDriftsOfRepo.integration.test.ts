import { ConstraintError } from 'helpful-errors';
import { given, then, useBeforeAll, when } from 'test-fns';

import {
  genSampleRepoWithLinkedRole,
  putSampleFile,
} from '@src/.test/assets/genSampleRepoWithLinkedRole';

import { join } from 'node:path';
import { getAllRoleModDriftsOfRepo } from './getAllRoleModDriftsOfRepo';

describe('getAllRoleModDriftsOfRepo', () => {
  given('[case1] a sound mod pinned to a version the upgrade moved off', () => {
    const scene = useBeforeAll(async () => {
      const repo = genSampleRepoWithLinkedRole({
        slug: 'mods-drifts-repo-sound',
        withMod: true,
      });
      return { ...repo, result: getAllRoleModDriftsOfRepo({}, repo.context) };
    });

    when('[t0] the drifts are read', () => {
      then('the mod is named as a drift', () => {
        expect(scene.result.drifts.map((drift) => drift.role)).toEqual([
          'ehmpathy/mechanic',
        ]);
      });

      then('no refusal is named', () => {
        expect(scene.result.refusals).toEqual([]);
      });
    });
  });

  given(
    '[case2] a mod whose `not` names a brief the role does not ship',
    () => {
      const scene = useBeforeAll(async () => {
        const repo = genSampleRepoWithLinkedRole({
          slug: 'mods-drifts-repo-refused',
          withMod: false,
        });
        putSampleFile({
          path: join(repo.modDir, 'boot.yml'),
          content: [
            'of: ehmpathy/mechanic@1.39.5',
            'briefs:',
            '  not:',
            '    - briefs/rule.forbid.wipeoutz.md',
            '',
          ].join('\n'),
        });
        return { ...repo, result: getAllRoleModDriftsOfRepo({}, repo.context) };
      });

      when('[t0] the drifts are read', () => {
        then('the refusal is surfaced for its role, never dropped', () => {
          expect(scene.result.refusals.map((one) => one.role)).toEqual([
            'mechanic',
          ]);
          expect(scene.result.refusals[0]?.error).toBeInstanceOf(
            ConstraintError,
          );
        });

        then('a refused mod is no drift', () => {
          expect(scene.result.drifts).toEqual([]);
        });
      });
    },
  );

  given('[case3] a sound mod beside a stray entry in the mods dir', () => {
    const scene = useBeforeAll(async () => {
      const repo = genSampleRepoWithLinkedRole({
        slug: 'mods-drifts-repo-stray',
        withMod: true,
      });
      putSampleFile({
        path: join(repo.repo, '.agent', 'repo=.mods', 'readme.md'),
        content: 'notes',
      });
      return { ...repo, result: getAllRoleModDriftsOfRepo({}, repo.context) };
    });

    when('[t0] the drifts are read', () => {
      then('the read does not throw, and the sound mod still drifts', () => {
        expect(scene.result.drifts.map((drift) => drift.role)).toEqual([
          'ehmpathy/mechanic',
        ]);
      });

      then('the stray entry is named as a refusal of the mods dir', () => {
        expect(scene.result.refusals.map((one) => one.role)).toEqual([null]);
        expect(scene.result.refusals[0]?.error.message).toContain(
          'names no role',
        );
      });
    });
  });
});
