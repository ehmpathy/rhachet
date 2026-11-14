import { ConstraintError } from 'helpful-errors';
import {
  genTempDir,
  getError,
  given,
  then,
  useBeforeAll,
  when,
} from 'test-fns';

import { putSampleFile } from '@src/.test/assets/genSampleRepoWithLinkedRole';
import { ContextCli } from '@src/domain.objects/ContextCli';
import { getLinkedRolesWithHooks } from '@src/domain.operations/brains/getLinkedRolesWithHooks';
import { discoverInitExecutables } from '@src/domain.operations/invoke/discoverInitExecutables';
import { discoverSkillExecutables } from '@src/domain.operations/invoke/discoverSkillExecutables';
import { findUniqueRoleDir } from '@src/domain.operations/invoke/findUniqueRoleDir';
import { discoverRoleKeyracks } from '@src/domain.operations/keyrack/discoverRoleKeyracks';
import { discoverLinkedRoles } from '@src/domain.operations/role/discoverLinkedRoles';

import { chmodSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { getRoleBriefs } from './getRoleBriefs';

/**
 * .what = a repo whose `.agent/` holds a mod dir that looks like a role dir in every kind,
 *         beside one native role that holds the same kinds
 * .why = every scanner must read the native role and never the mod dir: a mod reaches the
 *        boot through its role's view, so a scanner that read `.mods` would see a second role
 *
 * .note = the native role `lifeguard` is the control: each scanner finds it, so an empty
 *   answer for `surfer` proves the skip, never a scanner that reads naught
 */
const genRepoWithModDir = (input: { slug: string }): { repo: string } => {
  const repo = realpathSync(genTempDir({ slug: input.slug }));
  const asPath = (rel: string): string => join(repo, '.agent', rel);
  for (const [dir, slug] of [
    ['repo=.mods/role=surfer', 'surfer'],
    ['repo=.this/role=lifeguard', 'lifeguard'],
  ] as const) {
    putSampleFile({
      path: asPath(`${dir}/briefs/rule.require.${slug}.md`),
      content: `a ${slug} brief`,
    });
    putSampleFile({
      path: asPath(`${dir}/skills/${slug}.go.sh`),
      content: `#!/usr/bin/env bash\necho ${slug}\n`,
    });
    putSampleFile({
      path: asPath(`${dir}/inits/${slug}.init.sh`),
      content: `#!/usr/bin/env bash\necho ${slug}\n`,
    });
    putSampleFile({
      path: asPath(`${dir}/keyrack.yml`),
      content: 'org: ehmpathy\n',
    });
    chmodSync(asPath(`${dir}/skills/${slug}.go.sh`), 0o755);
    chmodSync(asPath(`${dir}/inits/${slug}.init.sh`), 0o755);
  }
  putSampleFile({
    path: asPath('repo=.mods/role=surfer/boot.yml'),
    content: 'of: test/surfer\n',
  });
  return { repo };
};

/**
 * .what = run a scanner with the repo as the process cwd, then restore the cwd
 * .why = the invoke and role scanners read `.agent/` from `process.cwd()`
 */
const withCwd = async <T>(input: {
  cwd: string;
  run: () => T | Promise<T>;
}): Promise<T> => {
  const cwdBefore = process.cwd();
  process.chdir(input.cwd);
  try {
    return await input.run();
  } finally {
    process.chdir(cwdBefore);
  }
};

describe('asRepoSlugKind, across every scanner of `.agent/`', () => {
  given(
    '[case1] a repo whose `.agent/` holds a mod dir beside a native role',
    () => {
      const scene = useBeforeAll(async () =>
        genRepoWithModDir({ slug: 'mods-scanners-skip' }),
      );

      when('[t0] the skills are discovered', () => {
        const found = useBeforeAll(async () => ({
          skills: await withCwd({
            cwd: scene.repo,
            run: () => discoverSkillExecutables({}),
          }),
        }));

        then('the native skill is found, and no skill of the mod dir', () => {
          expect(found.skills.map((one) => one.slug)).toEqual(['lifeguard.go']);
          expect(found.skills.map((one) => one.slugRepo)).not.toContain(
            '.mods',
          );
        });
      });

      when('[t1] the inits are discovered', () => {
        const found = useBeforeAll(async () => ({
          inits: await withCwd({
            cwd: scene.repo,
            run: () => discoverInitExecutables({}),
          }),
        }));

        then('the native init is found, and no init of the mod dir', () => {
          expect(found.inits.map((one) => one.slug)).toEqual([
            'lifeguard.init',
          ]);
          expect(found.inits.map((one) => one.slugRepo)).not.toContain('.mods');
        });
      });

      when('[t2] a role dir is looked up by slug', () => {
        then('the native role is found', async () => {
          const found = await withCwd({
            cwd: scene.repo,
            run: () => findUniqueRoleDir({ slugRole: 'lifeguard' }),
          });
          expect(found?.slugRepo).toEqual('.this');
        });

        then('the slug only the mod dir holds is no role', async () => {
          const found = await withCwd({
            cwd: scene.repo,
            run: () =>
              findUniqueRoleDir({ slugRole: 'surfer', ifPresent: true }),
          });
          expect(found).toEqual(null);
        });
      });

      when('[t3] the briefs of a role are read', () => {
        then('the native role yields its brief', async () => {
          const briefs = await withCwd({
            cwd: scene.repo,
            run: () =>
              getRoleBriefs({
                by: {
                  role: { name: 'lifeguard' },
                  briefs: { glob: '**/*.md' },
                },
              }),
          });
          expect(briefs).toHaveLength(1);
        });

        then(
          'the slug only the mod dir holds is refused as no role',
          async () => {
            const error = await withCwd({
              cwd: scene.repo,
              run: () =>
                getError(
                  getRoleBriefs({
                    by: {
                      role: { name: 'surfer' },
                      briefs: { glob: '**/*.md' },
                    },
                  }),
                ),
            });
            expect(error).toBeInstanceOf(ConstraintError);
            expect(error.message).toContain('role "surfer" not found');
          },
        );
      });

      when('[t4] the role keyracks are discovered', () => {
        const found = useBeforeAll(async () => ({
          paths: await discoverRoleKeyracks(
            { roles: ['surfer', 'lifeguard'] },
            { gitroot: scene.repo },
          ),
        }));

        then(
          'the native keyrack is found, and no keyrack of the mod dir',
          () => {
            expect(found.paths).toEqual([
              '.agent/repo=.this/role=lifeguard/keyrack.yml',
            ]);
          },
        );
      });

      when('[t5] the linked package roles are discovered', () => {
        const found = useBeforeAll(async () => ({
          roles: await discoverLinkedRoles(
            {},
            new ContextCli({ cwd: scene.repo, gitroot: scene.repo }),
          ),
        }));

        then('the mod dir is no package role', () => {
          expect(found.roles).toEqual([]);
        });
      });

      when('[t6] the linked roles with hooks are loaded', () => {
        const result = useBeforeAll(async () =>
          getLinkedRolesWithHooks(
            new ContextCli({ cwd: scene.repo, gitroot: scene.repo }),
          ),
        );

        then('no package load is tried for the mod dir: no load error', () => {
          expect(result.errors).toEqual([]);
        });

        then('the mod dir yields no role and arms no hook', () => {
          expect(result.roles).toEqual([]);
        });
      });
    },
  );
});
