import { genTempDir, given, then, when } from 'test-fns';

import { ContextCli } from '@src/domain.objects/ContextCli';

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getAllLinkedRoleRefs } from './getAllLinkedRoleRefs';

/**
 * .what = a temp repo with the given role dirs under `.agent/`
 * .note = a dir with `boot: true` also gets a `boot.yml`, the opt-in a native role needs
 */
const genRepoWithRoleDirs = (input: {
  slug: string;
  roleDirs: { repo: string; role: string; boot?: boolean }[];
}): ContextCli => {
  const repoPath = genTempDir({ slug: input.slug });
  for (const dir of input.roleDirs) {
    const roleDir = join(
      repoPath,
      '.agent',
      `repo=${dir.repo}`,
      `role=${dir.role}`,
    );
    mkdirSync(roleDir, { recursive: true });
    if (dir.boot)
      writeFileSync(join(roleDir, 'boot.yml'), 'briefs:\n  say: []\n');
  }
  return new ContextCli({ cwd: repoPath, gitroot: repoPath });
};

describe('getAllLinkedRoleRefs', () => {
  given('[case1] native and package roles', () => {
    when('[t0] the linked refs are read', () => {
      then(
        'every role is returned, native first, package repos in code-unit order',
        () => {
          const context = genRepoWithRoleDirs({
            slug: 'getAllLinkedRoleRefs-c1t0',
            roleDirs: [
              { repo: 'ehmpathy', role: 'mechanic' },
              { repo: 'bhrain', role: 'driver' },
              { repo: '.this', role: 'any', boot: true },
            ],
          });

          expect(getAllLinkedRoleRefs({}, context)).toEqual([
            { repo: '.this', role: 'any' },
            { repo: 'bhrain', role: 'driver' },
            { repo: 'ehmpathy', role: 'mechanic' },
          ]);
        },
      );
    });
  });

  given('[case2] no .agent/ dir', () => {
    when('[t0] the linked refs are read', () => {
      then('the result is empty', () => {
        const repoPath = genTempDir({ slug: 'getAllLinkedRoleRefs-c2t0' });
        const context = new ContextCli({ cwd: repoPath, gitroot: repoPath });

        expect(getAllLinkedRoleRefs({}, context)).toEqual([]);
      });
    });
  });

  given('[case3] no repo=.this', () => {
    when('[t0] the linked refs are read', () => {
      then('only the package roles are returned', () => {
        const context = genRepoWithRoleDirs({
          slug: 'getAllLinkedRoleRefs-c3t0',
          roleDirs: [{ repo: 'ehmpathy', role: 'mechanic' }],
        });

        expect(getAllLinkedRoleRefs({}, context)).toEqual([
          { repo: 'ehmpathy', role: 'mechanic' },
        ]);
      });
    });
  });

  given('[case4] one slug linked from two repos', () => {
    when('[t0] the linked refs are read', () => {
      then('the first seen ref is the one kept', () => {
        const context = genRepoWithRoleDirs({
          slug: 'getAllLinkedRoleRefs-c4t0',
          roleDirs: [
            { repo: 'zeta', role: 'reviewer' },
            { repo: 'bhrain', role: 'reviewer' },
          ],
        });

        expect(getAllLinkedRoleRefs({}, context)).toEqual([
          { repo: 'bhrain', role: 'reviewer' },
        ]);
      });
    });
  });

  given('[case5] native roles with and without a boot.yml', () => {
    when('[t0] the linked refs are read', () => {
      then('only the native roles that declare a boot.yml are returned', () => {
        const context = genRepoWithRoleDirs({
          slug: 'getAllLinkedRoleRefs-c5t0',
          roleDirs: [
            { repo: '.this', role: 'any', boot: true },
            { repo: '.this', role: 'notes' },
            { repo: '.this', role: 'tuner', boot: true },
          ],
        });

        expect(getAllLinkedRoleRefs({}, context)).toEqual([
          { repo: '.this', role: 'any' },
          { repo: '.this', role: 'tuner' },
        ]);
      });
    });
  });

  given(
    '[case6] a native role with no boot.yml shares a slug with a package role',
    () => {
      when('[t0] the linked refs are read', () => {
        then(
          'the package role is kept, since the native dir never opted in',
          () => {
            const context = genRepoWithRoleDirs({
              slug: 'getAllLinkedRoleRefs-c6t0',
              roleDirs: [
                { repo: '.this', role: 'reviewer' },
                { repo: 'bhrain', role: 'reviewer' },
              ],
            });

            expect(getAllLinkedRoleRefs({}, context)).toEqual([
              { repo: 'bhrain', role: 'reviewer' },
            ]);
          },
        );
      });
    },
  );
});
