import { MalfunctionError } from 'helpful-errors';
import { getError, given, then, useBeforeAll, when } from 'test-fns';

import {
  genSampleRepoWithLinkedRole,
  putSampleFile,
} from '@src/.test/assets/genSampleRepoWithLinkedRole';
import { RoleModViewStaleError } from '@src/domain.objects/RoleModViewStaleError';

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { assertRoleModdedViewFresh } from './assertRoleModdedViewFresh';
import { getOneRoleModHookBasis } from './getOneRoleModHookBasis';
import { getOneRoleModState } from './getOneRoleModState';
import { setRoleModdedView } from './setRoleModdedView';
import { syncRoleModdedViews } from './syncRoleModdedViews';

const REF = { repo: 'ehmpathy', role: 'mechanic' };

/**
 * .what = a repo whose mod nots a skill, with the view built as a render that passed the
 *         hook check at the installed package version leaves it
 * .why = jest cannot load a role package (importEsmSafe's note), so the hook check itself
 *        cannot pass here; the view is seeded through the same writer the sync calls, with
 *        the hook basis the sync would record. the sample package does not load, so any
 *        hook check the sync runs surfaces as a refusal
 */
const genRepoWithHookCheckedView = (input: {
  slug: string;
}): ReturnType<typeof genSampleRepoWithLinkedRole> => {
  const repo = genSampleRepoWithLinkedRole({
    slug: input.slug,
    withMod: false,
  });
  putSampleFile({
    path: join(repo.modDir, 'boot.yml'),
    content: [
      'of: ehmpathy/mechanic',
      'skills:',
      '  not:',
      '    - skills/wax.board.sh',
      '',
    ].join('\n'),
  });
  const state = getOneRoleModState({
    cwd: repo.repo,
    role: REF.role,
    refsLinked: [REF],
  });
  if (!state)
    throw new MalfunctionError('the sample mod has no state', {
      modDir: repo.modDir,
    });
  setRoleModdedView({
    roleDir: state.roleDir,
    sources: state.sources,
    links: state.links,
    hookBasis: getOneRoleModHookBasis({
      cwd: repo.repo,
      ref: state.target,
      plan: state.plan,
    }),
  });
  return repo;
};

/**
 * .what = set the installed version of the sample role package; its files stay as they are
 */
const setRolePackageVersion = (input: {
  repo: string;
  version: string;
}): void =>
  writeFileSync(
    join(input.repo, 'node_modules', 'rhachet-roles-ehmpathy', 'package.json'),
    `${JSON.stringify({ version: input.version })}\n`,
  );

describe('syncRoleModdedViews, hook basis', () => {
  given(
    '[case1] a view whose hook check passed at 1.40.0, then a bump with no file set change',
    () => {
      const scene = useBeforeAll(async () =>
        genRepoWithHookCheckedView({ slug: 'mods-sync-hook-basis' }),
      );

      when('[t0] the package is still at 1.40.0', () => {
        const synced = useBeforeAll(async () => {
          const view = assertRoleModdedViewFresh({
            cwd: scene.repo,
            ref: REF,
            getRefsLinked: () => [REF],
          });
          const result = await syncRoleModdedViews({}, scene.context);
          return { view, result };
        });

        then('the record keeps the version the hooks were checked at', () => {
          const record = JSON.parse(
            readFileSync(join(scene.roleDir, '.modded.json'), 'utf8'),
          );
          expect(record.hookBasis).toEqual({ version: '1.40.0' });
        });

        then('the boot reads the view as fresh', () => {
          expect(synced.view).not.toEqual(null);
        });

        then(
          'the sync leaves the fresh view as it is, and runs no hook check',
          () => {
            expect(synced.result.refusals).toEqual([]);
            expect(synced.result.changed).toEqual([]);
            expect(
              existsSync(join(scene.roleDir, 'skills', 'wax.board.sh')),
            ).toEqual(false);
          },
        );
      });

      when('[t1] the package is bumped to 1.41.0', () => {
        const bumped = useBeforeAll(async () => {
          setRolePackageVersion({ repo: scene.repo, version: '1.41.0' });
          const errorOfBoot = await getError(async () =>
            assertRoleModdedViewFresh({
              cwd: scene.repo,
              ref: REF,
              getRefsLinked: () => [REF],
            }),
          );
          const result = await syncRoleModdedViews({}, scene.context);
          return { errorOfBoot, result };
        });

        then('the boot reads the view as stale, and names the render', () => {
          expect(bumped.errorOfBoot).toBeInstanceOf(RoleModViewStaleError);
          expect(bumped.errorOfBoot.message).toContain(
            'its hooks were not checked against the role package installed now',
          );
          expect(JSON.stringify(bumped.errorOfBoot)).toContain(
            'rhx init --hooks',
          );
        });

        then(
          'the sync runs the hook check again, rather than skip the view as fresh',
          () => {
            expect(bumped.result.refusals.map((one) => one.role)).toEqual([
              'mechanic',
            ]);
            expect(bumped.result.refusals[0]?.error.message).toContain(
              'no hook can be checked against a not of a skill',
            );
          },
        );

        then('the skill the mod would not is back in the view', () => {
          expect(
            existsSync(join(scene.roleDir, 'skills', 'wax.board.sh')),
          ).toEqual(true);
        });
      });
    },
  );

  given(
    '[case2] a view record from before the hook basis, under a not of a skill',
    () => {
      const scene = useBeforeAll(async () => {
        const repo = genRepoWithHookCheckedView({
          slug: 'mods-sync-hook-basis-absent',
        });
        const path = join(repo.roleDir, '.modded.json');
        const { hookBasis: _hookBasis, ...recordOld } = JSON.parse(
          readFileSync(path, 'utf8'),
        );
        writeFileSync(path, `${JSON.stringify(recordOld, null, 2)}\n`);
        return repo;
      });

      when('[t0] the boot checks the view', () => {
        then(
          'the view reads as stale, so the hook check runs again',
          async () => {
            const error = await getError(async () =>
              assertRoleModdedViewFresh({
                cwd: scene.repo,
                ref: REF,
                getRefsLinked: () => [REF],
              }),
            );
            expect(error).toBeInstanceOf(RoleModViewStaleError);
          },
        );
      });
    },
  );
});
