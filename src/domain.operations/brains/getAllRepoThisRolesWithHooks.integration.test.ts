import { ConstraintError } from 'helpful-errors';
import {
  genTempDir,
  getError,
  given,
  then,
  useBeforeAll,
  when,
} from 'test-fns';

import { genSampleFileTree } from '@src/.test/assets/genSampleFileTree';

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  getAllRepoThisRolesWithHooks,
  REPO_THIS_BUDGET_HOOK_COMMAND,
} from './getAllRepoThisRolesWithHooks';

/**
 * .what = a temp repo with one boot.yml per `.agent/repo=.this/role=$slug` given
 * .note = a null spec makes the role dir with no boot.yml at all
 */
const genRepoWithRoleBoots = (input: {
  slug: string;
  roles: Record<string, string | null>;
}): string => {
  const repo = genTempDir({ slug: input.slug });
  Object.entries(input.roles).forEach(([roleSlug, bootYml]) =>
    genSampleFileTree({
      dir: join(repo, '.agent', 'repo=.this', `role=${roleSlug}`),
      files: bootYml === null ? {} : { 'boot.yml': bootYml },
    }),
  );
  return repo;
};

const BOOT_YML_BUDGETED = 'budget:\n  tokens: 5_000\nbriefs:\n  say: []\n';
const BOOT_YML_UNBUDGETED = 'briefs:\n  say: []\n';

/**
 * .what = clamps when rhachet arms its one framework-owned hook, the `.this` budget gate
 * .why = the gate is the opt-in a `boot.yml` budget buys; a reader that drops it leaves a cap
 *        no stop enforces, and one that installs it per role runs the repo-wide sweep N times
 *
 * .note = INTEGRATION grain: it reads the filesystem
 */
describe('getAllRepoThisRolesWithHooks', () => {
  given('[case1] a repo with no .agent/repo=.this dir', () => {
    const scene = useBeforeAll(async () => ({
      result: getAllRepoThisRolesWithHooks({
        gitroot: genTempDir({ slug: 'repo-this-hooks-absent' }),
      }),
    }));

    when('[t0] the roles are read', () => {
      then('it returns no roles and no errors', () => {
        expect(scene.result).toEqual({ roles: [], errors: [] });
      });
    });
  });

  given('[case2] .this roles, none of which declares a budget', () => {
    const scene = useBeforeAll(async () => ({
      result: getAllRepoThisRolesWithHooks({
        gitroot: genRepoWithRoleBoots({
          slug: 'repo-this-hooks-unbudgeted',
          roles: { any: BOOT_YML_UNBUDGETED, notes: null },
        }),
      }),
    }));

    when('[t0] the roles are read', () => {
      then('no gate is armed, since no role opted in', () => {
        expect(scene.result).toEqual({ roles: [], errors: [] });
      });
    });
  });

  given('[case3] one budgeted role beside an unbudgeted one', () => {
    const scene = useBeforeAll(async () => ({
      result: getAllRepoThisRolesWithHooks({
        gitroot: genRepoWithRoleBoots({
          slug: 'repo-this-hooks-one',
          roles: { any: BOOT_YML_UNBUDGETED, tuner: BOOT_YML_BUDGETED },
        }),
      }),
    }));

    when('[t0] the roles are read', () => {
      then('the budgeted role carries the gate, under repo=.this', () => {
        expect(scene.result.errors).toEqual([]);
        expect(
          scene.result.roles.map((role) => [role.repo, role.slug]),
        ).toEqual([['.this', 'tuner']]);
      });

      then('the gate is the repo-wide onStop budget sweep', () => {
        expect(scene.result.roles[0]?.hooks?.onBrain).toEqual({
          onStop: [
            { command: REPO_THIS_BUDGET_HOOK_COMMAND, timeout: 'PT60S' },
          ],
        });
        expect(REPO_THIS_BUDGET_HOOK_COMMAND).toEqual(
          './node_modules/.bin/rhachet roles cost --all --when hook.onStop',
        );
      });
    });
  });

  given('[case4] several budgeted roles', () => {
    const scene = useBeforeAll(async () => ({
      result: getAllRepoThisRolesWithHooks({
        gitroot: genRepoWithRoleBoots({
          slug: 'repo-this-hooks-several',
          roles: {
            tuner: BOOT_YML_BUDGETED,
            any: BOOT_YML_BUDGETED,
            keyrack: BOOT_YML_BUDGETED,
          },
        }),
      }),
    }));

    when('[t0] the roles are read', () => {
      then(
        'the gate is armed once, on the first budgeted role in slug order',
        () => {
          expect(scene.result.roles.map((role) => role.slug)).toEqual(['any']);
        },
      );
    });
  });

  given('[case5] a malformed boot.yml beside a budgeted one', () => {
    const scene = useBeforeAll(async () => ({
      result: getAllRepoThisRolesWithHooks({
        gitroot: genRepoWithRoleBoots({
          slug: 'repo-this-hooks-malformed',
          roles: {
            any: BOOT_YML_BUDGETED,
            broken: 'budget:\n  tokens: lots\n',
          },
        }),
      }),
    }));

    when('[t0] the roles are read', () => {
      then('the gate is still armed by the healthy role', () => {
        expect(scene.result.roles.map((role) => role.slug)).toEqual(['any']);
      });

      then(
        'the malformed role is returned as a ConstraintError, never a throw',
        () => {
          expect(scene.result.errors).toHaveLength(1);
          expect(scene.result.errors[0]?.roleSlug).toEqual('broken');
          expect(scene.result.errors[0]?.error).toBeInstanceOf(ConstraintError);
        },
      );
    });
  });

  given('[case6] a boot.yml that is not valid yaml', () => {
    const scene = useBeforeAll(async () => ({
      result: getAllRepoThisRolesWithHooks({
        gitroot: genRepoWithRoleBoots({
          slug: 'repo-this-hooks-badyaml',
          roles: { any: 'budget: [unclosed\n' },
        }),
      }),
    }));

    when('[t0] the roles are read', () => {
      then('it returns a yaml error for that role, never a throw', () => {
        expect(scene.result.roles).toEqual([]);
        expect(scene.result.errors[0]?.error.message).toContain(
          'boot.yml has invalid yaml',
        );
      });
    });
  });

  given('[case7] a boot.yml path that is a directory, not a file', () => {
    const gitroot = useBeforeAll(async () => {
      const repo = genRepoWithRoleBoots({
        slug: 'repo-this-hooks-isdir',
        roles: { any: null },
      });
      mkdirSync(join(repo, '.agent', 'repo=.this', 'role=any', 'boot.yml'));
      return { path: repo };
    });

    when('[t0] the roles are read', () => {
      then(
        'the read fault throws, never returned as a spec error',
        async () => {
          const error = await getError(() =>
            getAllRepoThisRolesWithHooks({ gitroot: gitroot.path }),
          );
          expect((error as NodeJS.ErrnoException).code).toEqual('EISDIR');
        },
      );
    });
  });
});
