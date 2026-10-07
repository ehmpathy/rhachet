import { ConstraintError } from 'helpful-errors';

import type { HasRepo } from '@src/domain.objects/HasRepo';
import type { Role } from '@src/domain.objects/Role';
import type { RoleHooksOnBrain } from '@src/domain.objects/RoleHooksOnBrain';
import { getOneDeclaredBudgetForSpec } from '@src/domain.operations/boot/getOneDeclaredBudgetForSpec';

import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * .what = the rhachet args of the onStop hook that holds a stop once a `.this` boot exceeds
 *         its cap
 * .why = it names its caller (`rule.require.when-names-the-caller`), so the command can tell a
 *        hook run from a hand run
 */
export const REPO_THIS_BUDGET_HOOK_ARGS = 'roles cost --all --when hook.onStop';

/**
 * .what = the full command the budget hook runs
 * .why = the local bin, as every other hook in a brain dir runs, since a hook fires on every stop
 */
export const REPO_THIS_BUDGET_HOOK_COMMAND = `./node_modules/.bin/rhachet ${REPO_THIS_BUDGET_HOOK_ARGS}`;

/**
 * .what = the one framework-owned hook rhachet supports: the `.this` boot budget gate
 * .why = `.agent/repo=.this` dirs grow with no upkeep, and a cap no stop enforces is a cap no one
 *        notices. a repo opts in by a `budget.tokens` in a `.this` role's `boot.yml`; rhachet
 *        adds the gate automatically, so no human has to remember to wire it
 *        (`rule.forbid.framework-owned-hooks` names this as its sole exception)
 */
const REPO_THIS_BUDGET_HOOKS: RoleHooksOnBrain = {
  onStop: [{ command: REPO_THIS_BUDGET_HOOK_COMMAND, timeout: 'PT60S' }],
};

/**
 * .what = a `.this` role, as the hook sync sees it — its slug and the budget hook
 * .why = a repo-local role has no package and no registry, so it is built from its dir.
 *        the sync reads only `repo`, `slug`, and `hooks`; the rest are empty by truth
 */
const asRepoThisRole = (input: {
  roleSlug: string;
  roleDir: string;
}): HasRepo<Role> => ({
  slug: input.roleSlug,
  name: input.roleSlug,
  purpose: `the repo's own ${input.roleSlug} role`,
  readme: { uri: join(input.roleDir, 'readme.md') },
  traits: [],
  skills: { dirs: [], refs: [] },
  briefs: { dirs: [] },
  hooks: { onBrain: REPO_THIS_BUDGET_HOOKS },
  repo: '.this',
});

/**
 * .what = the `.this` role that carries the framework-owned budget hook, where any `.this`
 *         role's `boot.yml` declares a budget
 * .why = the hook sync relays it under `repo=.this/role=$slug`, as it relays a supplier's hooks
 *
 * .note = the gate is ONE repo-wide check (`roles cost --all` sweeps every owned spec), so the
 *   hook is attached once, to the first budgeted role in slug order, never once per role
 * .note = a `boot.yml` that fails to parse is returned as an error for that role, never thrown,
 *   so one bad file does not sink the sync of every other role
 */
export const getAllRepoThisRolesWithHooks = (input: {
  gitroot: string;
}): {
  roles: HasRepo<Role>[];
  errors: Array<{ repoSlug: string; roleSlug: string; error: Error }>;
} => {
  const repoThisDir = join(input.gitroot, '.agent', 'repo=.this');

  // list the role dirs; an absent `.this` dir declares no role
  //
  // .note = the read IS the check. a separate `existsSync` would open a window where a dir
  //   that vanished after the check escapes as a raw `ENOENT`; here the vanish lands on the
  //   same branch as an absent dir. every other errno throws unchanged
  const roleDirNames = ((): string[] => {
    try {
      return readdirSync(repoThisDir);
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') return [];
      throw error;
    }
  })()
    .filter((name) => name.startsWith('role='))
    .sort(); // the carrier is a function of the SET of dirs, never of readdir order

  // ⚠️ .note = deliberate mutation — two accumulators, scoped to this function
  const roles: HasRepo<Role>[] = [];
  const errors: Array<{ repoSlug: string; roleSlug: string; error: Error }> =
    [];

  for (const roleDirName of roleDirNames) {
    const roleSlug = roleDirName.replace('role=', '');
    const roleDir = join(repoThisDir, roleDirName);
    const pathToBoot = join(roleDir, 'boot.yml');

    // probe the closed absence set; an unreadable path raises, never drops the gate
    if (!statSync(pathToBoot, { throwIfNoEntry: false })) continue;

    // read the declared budget; a malformed spec is this role's error alone
    const budget = (() => {
      try {
        return getOneDeclaredBudgetForSpec({ pathToSpec: pathToBoot });
      } catch (error) {
        if (!(error instanceof ConstraintError)) throw error;
        errors.push({ repoSlug: '.this', roleSlug, error });
        return null;
      }
    })();
    if (budget === null) continue;

    // one carrier is enough; later budgeted roles are swept by the same `--all` check
    if (roles.length === 0) roles.push(asRepoThisRole({ roleSlug, roleDir }));
  }

  return { roles, errors };
};
