import type { BrainSpecifier } from '@src/domain.objects/BrainSpecifier';
import { syncAllRoleHooksIntoEachBrainRepl } from '@src/domain.operations/brains/syncAllRoleHooksIntoEachBrainRepl';
import { pruneOrphanedRoleHooksFromAllBrains } from '@src/domain.operations/brains/pruneOrphanedRoleHooksFromAllBrains';
import { getLinkedRolesWithHooks } from '@src/domain.operations/brains/getLinkedRolesWithHooks';

/**
 * .what = syncs brain hooks for linked roles
 * .why = syncs role hook declarations to brain configs (e.g., .claude/settings.json)
 */
export const syncHooksForLinkedRoles = async (input: {
  from: string;
  brains?: BrainSpecifier[];
}): Promise<void> => {
  const { from, brains } = input;

  console.log('');
  console.log('🔭 search for linked roles with hooks...');

  // get linked roles with hooks
  const { roles, errors: discoverErrors } = await getLinkedRolesWithHooks({
    from,
  });

  // report discover errors
  for (const err of discoverErrors) {
    console.log(`   ⚠️  ${err.repoSlug}/${err.roleSlug}: ${err.error.message}`);
  }

  if (roles.length === 0) {
    console.log('   [no roles with hooks found]');
    console.log('');
    return;
  }

  for (const role of roles) {
    console.log(`   - [found] ${role.repo}/${role.slug}`);
  }

  // build set of linked authors for orphan detection
  const authorsDesired = new Set(
    roles.map((role) => `repo=${role.repo}/role=${role.slug}`),
  );

  console.log('');
  console.log('🧹 prune orphaned hooks...');

  // prune orphans from all brains
  const pruneResult = await pruneOrphanedRoleHooksFromAllBrains({
    authorsDesired,
    repoPath: from,
    brains,
  });

  const totalOrphansRemoved = pruneResult.removed.reduce(
    (sum, r) => sum + r.hooks.length,
    0,
  );

  if (totalOrphansRemoved > 0) {
    console.log(`   ${totalOrphansRemoved} orphaned hook(s) removed`);
  } else {
    console.log('   [none found]');
  }

  console.log('');
  console.log('🪝 apply hooks to brains...');

  // sync all roles to all brains
  const syncResult = await syncAllRoleHooksIntoEachBrainRepl({
    roles,
    repoPath: from,
    brains,
  });

  // tally and report results
  let totalCreated = 0;
  let totalUpdated = 0;
  let totalDeleted = 0;

  for (const applied of syncResult.applied) {
    totalCreated += applied.hooks.created.length;
    totalUpdated += applied.hooks.updated.length;
    totalDeleted += applied.hooks.deleted.length;

    // report each application with changes
    const changes = [
      applied.hooks.created.length > 0
        ? `+${applied.hooks.created.length}`
        : null,
      applied.hooks.updated.length > 0
        ? `~${applied.hooks.updated.length}`
        : null,
      applied.hooks.deleted.length > 0
        ? `-${applied.hooks.deleted.length}`
        : null,
    ]
      .filter(Boolean)
      .join(', ');
    if (changes) {
      console.log(
        `   ${applied.role.repo}/${applied.role.slug} → ${applied.brain}: ${changes}`,
      );
    }
  }

  // report errors
  for (const err of syncResult.errors) {
    console.log(
      `   ⚠️  ${err.role.repo}/${err.role.slug} → ${err.brain}: ${err.error.message}`,
    );
  }

  // summary
  console.log('');
  if (totalCreated > 0 || totalUpdated > 0 || totalDeleted > 0) {
    const parts = [
      totalCreated > 0 ? `${totalCreated} created` : null,
      totalUpdated > 0 ? `${totalUpdated} updated` : null,
      totalDeleted > 0 ? `${totalDeleted} deleted` : null,
    ]
      .filter(Boolean)
      .join(', ');
    console.log(`✨ Hooks: ${parts}`);
  } else if (syncResult.errors.length === 0) {
    console.log('✨ Hooks: no changes needed');
  }
  if (syncResult.errors.length > 0) {
    console.log(`⚠️  ${syncResult.errors.length} hook error(s) occurred`);
  }
  console.log('');
};
