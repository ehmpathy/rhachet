import { getError, given, then, useBeforeAll, when } from 'test-fns';

import {
  genSampleRepoWithLinkedRole,
  putSampleFile,
} from '@src/.test/assets/genSampleRepoWithLinkedRole';
import { RoleModViewStaleError } from '@src/domain.objects/RoleModViewStaleError';

import { readlinkSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { assertRoleModdedViewFresh } from './assertRoleModdedViewFresh';
import { syncRoleModdedViews } from './syncRoleModdedViews';

const REF = { repo: 'ehmpathy', role: 'mechanic' };

/**
 * .what = the boot check, over the one linked role of the sample repo
 */
const checkView = (input: { repo: string }) =>
  assertRoleModdedViewFresh({
    cwd: input.repo,
    ref: REF,
    getRefsLinked: () => [REF],
  });

/**
 * .what = the mod's boot.yml, with the say list it names
 */
const asModBootYml = (input: { says: string[] }): string =>
  [
    'of: ehmpathy/mechanic@1.39.5',
    'briefs:',
    ...(input.says.length ? ['  say:'] : []),
    ...input.says.map((say) => `    - ${say}`),
    '  not:',
    '    - briefs/rule.forbid.wipeouts.md',
    '',
  ].join('\n');

describe('assertRoleModdedViewFresh', () => {
  given('[case1] a role with no mod and no view record', () => {
    const scene = useBeforeAll(async () =>
      genSampleRepoWithLinkedRole({ slug: 'mods-fresh-none', withMod: false }),
    );

    when('[t0] a boot checks the view', () => {
      then('the role reads as unmodded: null', () => {
        expect(checkView({ repo: scene.repo })).toEqual(null);
      });
    });
  });

  given('[case2] a mod whose view was rendered and not touched since', () => {
    const scene = useBeforeAll(async () => {
      const repo = genSampleRepoWithLinkedRole({
        slug: 'mods-fresh-ok',
        withMod: true,
      });
      await syncRoleModdedViews({}, repo.context);
      return repo;
    });

    when('[t0] a boot checks the view', () => {
      const checked = useBeforeAll(async () => ({
        result: checkView({ repo: scene.repo }),
      }));

      then('the view is fresh: the plan is returned', () => {
        expect(checked.result?.plan.shadows).toEqual([
          'briefs/rule.require.surf-wax.md',
        ]);
        expect(checked.result?.plan.adds).toEqual([
          'briefs/rule.require.reef-etiquette.md',
        ]);
        expect(checked.result?.plan.nots).toEqual([
          'briefs/rule.forbid.wipeouts.md',
        ]);
      });

      then('the label names the pin and the installed version', () => {
        expect(checked.result?.ofLabel).toEqual(
          'ehmpathy/mechanic@1.39.5 (installed 1.40.0)',
        );
      });
    });

    when(
      '[t1] the content of an extant shadow is edited, with no render',
      () => {
        then(
          'the view is still fresh: a content edit is live through the link',
          async () => {
            writeFileSync(
              join(scene.modDir, 'briefs', 'rule.require.surf-wax.md'),
              'wax on, modded twice',
            );
            expect(checkView({ repo: scene.repo })?.plan.shadows).toEqual([
              'briefs/rule.require.surf-wax.md',
            ]);
          },
        );
      },
    );
  });

  given('[case3] a mod file added after the view was rendered', () => {
    const scene = useBeforeAll(async () => {
      const repo = genSampleRepoWithLinkedRole({
        slug: 'mods-fresh-added',
        withMod: true,
      });
      await syncRoleModdedViews({}, repo.context);
      putSampleFile({
        path: join(repo.modDir, 'briefs', 'howto.paddle-out.md'),
        content: 'paddle out, modded',
      });
      return repo;
    });

    when('[t0] a boot checks the view', () => {
      const checked = useBeforeAll(async () => ({
        error: await getError(async () => checkView({ repo: scene.repo })),
      }));

      then('it fails loud as a stale view', () => {
        expect(checked.error).toBeInstanceOf(RoleModViewStaleError);
        expect(checked.error.message).toContain('is stale');
      });

      then('it names the added path, and the render that fixes it', () => {
        expect(JSON.stringify(checked.error)).toContain(
          'briefs/howto.paddle-out.md',
        );
        expect(JSON.stringify(checked.error)).toContain('rhx init --hooks');
      });

      then(
        'the boot wrote no file: the view still links the published brief',
        () => {
          expect(
            readlinkSync(join(scene.roleDir, 'briefs', 'howto.paddle-out.md')),
          ).toContain('node_modules');
        },
      );
    });
  });

  given('[case4] a mod file removed after the view was rendered', () => {
    const scene = useBeforeAll(async () => {
      const repo = genSampleRepoWithLinkedRole({
        slug: 'mods-fresh-removed',
        withMod: true,
      });
      await syncRoleModdedViews({}, repo.context);
      rmSync(join(repo.modDir, 'briefs', 'rule.require.reef-etiquette.md'));
      writeFileSync(join(repo.modDir, 'boot.yml'), asModBootYml({ says: [] }));
      return repo;
    });

    when('[t0] a boot checks the view', () => {
      const checked = useBeforeAll(async () => ({
        error: await getError(async () => checkView({ repo: scene.repo })),
      }));

      then('it fails loud as a stale view', () => {
        expect(checked.error).toBeInstanceOf(RoleModViewStaleError);
      });

      then('it names the link to the removed file', () => {
        expect(JSON.stringify(checked.error)).toContain(
          'briefs/rule.require.reef-etiquette.md',
        );
      });
    });
  });

  given('[case5] a mod file renamed after the view was rendered', () => {
    const scene = useBeforeAll(async () => {
      const repo = genSampleRepoWithLinkedRole({
        slug: 'mods-fresh-renamed',
        withMod: true,
      });
      await syncRoleModdedViews({}, repo.context);
      renameSync(
        join(repo.modDir, 'briefs', 'rule.require.reef-etiquette.md'),
        join(repo.modDir, 'briefs', 'rule.require.reef-manners.md'),
      );
      writeFileSync(
        join(repo.modDir, 'boot.yml'),
        asModBootYml({ says: ['briefs/rule.require.reef-manners.md'] }),
      );
      return repo;
    });

    when('[t0] a boot checks the view', () => {
      const checked = useBeforeAll(async () => ({
        error: await getError(async () => checkView({ repo: scene.repo })),
      }));

      then('it fails loud as a stale view', () => {
        expect(checked.error).toBeInstanceOf(RoleModViewStaleError);
      });

      then('it names both the old path and the new one', () => {
        expect(JSON.stringify(checked.error)).toContain(
          'briefs/rule.require.reef-etiquette.md',
        );
        expect(JSON.stringify(checked.error)).toContain(
          'briefs/rule.require.reef-manners.md',
        );
      });
    });

    when('[t1] the views are synced', () => {
      then('the view is fresh again, with the renamed add', async () => {
        await syncRoleModdedViews({}, scene.context);
        expect(checkView({ repo: scene.repo })?.plan.adds).toEqual([
          'briefs/rule.require.reef-manners.md',
        ]);
      });
    });
  });

  given('[case6] a mod added after the last render', () => {
    const scene = useBeforeAll(async () =>
      genSampleRepoWithLinkedRole({ slug: 'mods-fresh-new', withMod: true }),
    );

    when('[t0] a boot checks the role before any render', () => {
      const checked = useBeforeAll(async () => ({
        error: await getError(async () => checkView({ repo: scene.repo })),
      }));

      then('it fails loud: the mod has no rendered view', () => {
        expect(checked.error).toBeInstanceOf(RoleModViewStaleError);
        expect(checked.error.message).toContain(
          'its mod has no rendered view, since the mod was added',
        );
      });
    });
  });

  given(
    '[case6.1] a typo the render refused, then fixed with no render',
    () => {
      const scene = useBeforeAll(async () => {
        const repo = genSampleRepoWithLinkedRole({
          slug: 'mods-fresh-fixed',
          withMod: true,
        });
        const typo = join(repo.modDir, 'briefs', 'rule.require.surf-wux.md');
        putSampleFile({ path: typo, content: 'a typo of surf-wax' });
        const synced = await syncRoleModdedViews({}, repo.context);
        rmSync(typo);
        return { ...repo, synced };
      });

      when('[t0] a boot checks the role after the fix', () => {
        const checked = useBeforeAll(async () => ({
          error: await getError(async () => checkView({ repo: scene.repo })),
        }));

        then('the render had refused the typo', () => {
          expect(scene.synced.refusals.map((one) => one.role)).toEqual([
            'mechanic',
          ]);
        });

        then(
          'the stale cause names the fix as one, never only an added mod',
          () => {
            expect(checked.error).toBeInstanceOf(RoleModViewStaleError);
            expect(checked.error.message).toContain(
              'or was fixed after a refused render',
            );
            expect(JSON.stringify(checked.error)).toContain('rhx init --hooks');
          },
        );
      });
    },
  );

  given(
    '[case7] a refused mod of one role, and a same-slug role of another repo',
    () => {
      const REF_PEER = { repo: 'acme', role: 'mechanic' };
      const scene = useBeforeAll(async () => {
        const repo = genSampleRepoWithLinkedRole({
          slug: 'mods-fresh-peer',
          withMod: true,
        });
        putSampleFile({
          path: join(repo.modDir, 'briefs', 'rule.require.surf-wux.md'),
          content: 'a typo of a held path, which no say names',
        });
        return repo;
      });

      when('[t0] a boot checks the same-slug peer', () => {
        then(
          'the peer reads as unmodded: the refusal never lands on it',
          () => {
            expect(
              assertRoleModdedViewFresh({
                cwd: scene.repo,
                ref: REF_PEER,
                getRefsLinked: () => [REF, REF_PEER],
              }),
            ).toEqual(null);
          },
        );
      });

      when('[t1] a boot checks the role the mod is over', () => {
        then('the refusal lands there', async () => {
          const error = await getError(async () =>
            assertRoleModdedViewFresh({
              cwd: scene.repo,
              ref: REF,
              getRefsLinked: () => [REF, REF_PEER],
            }),
          );
          expect(error.message).toContain('surf-wux');
        });
      });
    },
  );
});
