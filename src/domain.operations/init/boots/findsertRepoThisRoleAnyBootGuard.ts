import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { findsertBudgetIntoBootYml } from './findsertBudgetIntoBootYml';

/**
 * .what = findserts the budget a repo's own role=any boot owes
 * .why = `.agent/repo=.this` dirs grow without upkeep. a budget in `boot.yml` is the opt-in
 *        that both boots the role and arms rhachet's built-in onStop gate
 *        (`getAllRepoThisRolesWithHooks`); it is created where absent and never changed
 *        where present
 */
export const findsertRepoThisRoleAnyBootGuard = (input: {
  repoPath: string;
}): {
  budget: 'created' | 'extant' | 'absent';
} => {
  const roleDir = join(input.repoPath, '.agent', 'repo=.this', 'role=any');
  if (!existsSync(roleDir)) return { budget: 'absent' };

  return {
    budget: findsertBudgetIntoBootYml({
      pathToBoot: join(roleDir, 'boot.yml'),
    }),
  };
};
