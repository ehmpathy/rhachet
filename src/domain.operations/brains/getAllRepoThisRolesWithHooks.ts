import { ConstraintError } from 'helpful-errors';

import type { HasRepo } from '@src/domain.objects/HasRepo';
import type { Role } from '@src/domain.objects/Role';
import type { RoleHooksOnBrain } from '@src/domain.objects/RoleHooksOnBrain';
import { getOneDeclaredBudgetForSpec } from '@src/domain.operations/boot/getOneDeclaredBudgetForSpec';
import { isRepoSweepArmedByMods } from '@src/domain.operations/mods/isRepoSweepArmedByMods';
import { PREFIX_ROLE_DIR } from '@src/domain.operations/role/constants';
import { isErrnoEnoent } from '@src/infra/filesystem/isErrnoEnoent';

import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * .what = the rhachet args of the onStop hook that holds a stop once a `.this` boot exceeds
 *         its cap, or a mod's `of:` pin no longer names the installed role
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
 * .what = the one framework-owned hook rhachet supports: the repo-wide onStop sweep
 * .why = two repo-owned facts drift with no upkeep, and a drift no stop names is a drift no clone
 *        learns of: a `.this` boot past its `budget.tokens`, and a mod whose `of:` pin no longer
 *        names the installed role. a repo opts in by a budget in a `.this` role's `boot.yml`, or
 *        by a mod dir under `.agent/repo=.mods`; rhachet adds the sweep, so no human has to wire
 *        it (`rule.forbid.framework-owned-hooks` names these as its two exceptions)
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
 * .what = the slug of the `.this` role that carries the sweep where only a mod arms it
 * .why = a mod is no `.this` role, so the carrier takes the repo-wide role's slug, the one
 *        `rhx init` findserts a budget for
 */
const REPO_THIS_CARRIER_SLUG_FOR_MODS = 'any';

/**
 * .what = the `role=*` dir names under a dir, sorted; none where the dir is absent
 * .why = the carrier is a function of the SET of dirs, never of readdir order
 *
 * .note = the read IS the check. a separate `existsSync` would open a window where a dir that
 *   vanished after the check escapes as a raw `ENOENT`; here the vanish lands on the same
 *   branch as an absent dir. every other errno throws unchanged
 */
const getAllRoleDirNames = (input: { dir: string }): string[] => {
  const names = ((): string[] => {
    try {
      return readdirSync(input.dir);
    } catch (error) {
      if (isErrnoEnoent(error)) return [];
      throw error;
    }
  })();
  return names.filter((name) => name.startsWith(PREFIX_ROLE_DIR)).sort();
};

/**
 * .what = the role slug a `role=<slug>` dir name holds
 */
const asRoleSlugOfDirName = (input: { name: string }): string =>
  input.name.slice(PREFIX_ROLE_DIR.length);

/**
 * .what = the `.this` role that carries the framework-owned stop sweep, where any `.this`
 *         role's `boot.yml` declares a budget, or any role is modded
 * .why = the hook sync relays it under `repo=.this/role=$slug`, as it relays a supplier's hooks
 *
 * .note = the sweep is ONE repo-wide check (`roles cost --all` sweeps every owned spec and every
 *   mod pin), so the hook is attached once, never once per role or per mod: to the first
 *   budgeted role in slug order, else to `role=any` where a mod dir alone arms it
 * .note = a `boot.yml` that fails to parse is returned as an error for that role, never thrown,
 *   so one bad file does not sink the sync of every other role
 */
export const getAllRepoThisRolesWithHooks = (input: {
  gitroot: string;
}): {
  roles: HasRepo<Role>[];
  errors: Array<{ repoSlug: string; roleSlug: string; error: Error }>;

  /**
   * whether the mods dir arms the sweep; a mod fault is the repo's, so the caller relays the
   *   sweep to every actor, not only to the holders of its carrier role
   */
  isArmedByMods: boolean;
} => {
  const repoThisDir = join(input.gitroot, '.agent', 'repo=.this');

  // list the role dirs; an absent `.this` dir declares no role
  const roleDirNames = getAllRoleDirNames({ dir: repoThisDir });

  // ⚠️ .note = deliberate mutation — two accumulators, scoped to this function
  const roles: HasRepo<Role>[] = [];
  const errors: Array<{ repoSlug: string; roleSlug: string; error: Error }> =
    [];

  for (const roleDirName of roleDirNames) {
    const roleSlug = asRoleSlugOfDirName({ name: roleDirName });
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

  // a mod pin drifts like a budget, so a mod dir arms the same one sweep where no budget did. a
  //   stray entry or an unreadable mods path arms it too: the sweep names every mod fault, and
  //   a fault no role carries has no other surface that repeats it
  const isModded = isRepoSweepArmedByMods({ gitroot: input.gitroot });
  if (roles.length === 0 && isModded)
    roles.push(
      asRepoThisRole({
        roleSlug: REPO_THIS_CARRIER_SLUG_FOR_MODS,
        roleDir: join(repoThisDir, `role=${REPO_THIS_CARRIER_SLUG_FOR_MODS}`),
      }),
    );

  return { roles, errors, isArmedByMods: isModded };
};
