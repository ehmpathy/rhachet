import type { BrainSpecifier } from '@src/domain.objects/BrainSpecifier';
import type { ContextCli } from '@src/domain.objects/ContextCli';
import { getLinkedRolesWithHooks } from '@src/domain.operations/brains/getLinkedRolesWithHooks';
import { pruneOrphanedRoleHooksFromAllBrains } from '@src/domain.operations/brains/pruneOrphanedRoleHooksFromAllBrains';
import { syncAllRoleHooksIntoEachBrainRepl } from '@src/domain.operations/brains/syncAllRoleHooksIntoEachBrainRepl';

/**
 * .what = syncs brain hooks for linked roles
 * .why = syncs role hook declarations to brain configs (e.g., .claude/settings.json)
 */
export const syncHooksForLinkedRoles = async (
  input: { brains?: BrainSpecifier[] },
  context: ContextCli,
): Promise<void> => {
  const { brains } = input;

  console.log('');
  console.log('🔭 search for linked roles with hooks...');

  // get linked roles with hooks
  const { roles, errors: discoverErrors } =
    await getLinkedRolesWithHooks(context);

  // report discover errors
  for (const err of discoverErrors) {
    console.log(`   ⚠️  ${err.repoSlug}/${err.roleSlug}: ${err.error.message}`);
  }

  if (roles.length === 0) {
    console.log('');
    console.log('🫧 no roles with hooks found');
    console.log('');
    return;
  }

  // report found roles with tree structure
  for (let i = 0; i < roles.length; i++) {
    const role = roles[i]!;
    const isLast = i === roles.length - 1;
    const prefix = isLast ? '└──' : '├──';
    console.log(`   ${prefix} ${role.repo}/${role.slug}`);
  }

  // build set of linked authors for orphan detection
  const authorsDesired = new Set(
    roles.map((role) => `repo=${role.repo}/role=${role.slug}`),
  );

  console.log('');
  console.log('🪝 apply hooks to brains...');

  // prune orphans from all brains
  const pruneResult = await pruneOrphanedRoleHooksFromAllBrains(
    { authorsDesired, brains },
    context,
  );

  // sync all roles to all brains
  const syncResult = await syncAllRoleHooksIntoEachBrainRepl(
    { roles, brains },
    context,
  );

  // tally results
  const totalOrphansRemoved = pruneResult.removed.reduce(
    (sum, r) => sum + r.hooks.length,
    0,
  );
  let totalCreated = 0;
  let totalUpdated = 0;
  let totalDeleted = 0;

  // collect all output lines for tree structure
  const outputLines: string[] = [];

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
      outputLines.push(
        `${applied.role.repo}/${applied.role.slug} → ${applied.brain}: ${changes}`,
      );
    }
  }

  // collect errors
  for (const err of syncResult.errors) {
    outputLines.push(
      `⚠️  ${err.role.repo}/${err.role.slug} → ${err.brain}: ${err.error.message}`,
    );
  }

  // output with tree structure
  for (let i = 0; i < outputLines.length; i++) {
    const isLast = i === outputLines.length - 1;
    const prefix = isLast ? '└──' : '├──';
    console.log(`   ${prefix} ${outputLines[i]}`);
  }

  // summary
  const hasChanges =
    totalCreated > 0 ||
    totalUpdated > 0 ||
    totalDeleted > 0 ||
    totalOrphansRemoved > 0;
  console.log('');
  if (hasChanges) {
    const summaryLines = [
      totalCreated > 0 ? `${totalCreated} created` : null,
      totalUpdated > 0 ? `${totalUpdated} updated` : null,
      totalDeleted > 0 ? `${totalDeleted} deleted` : null,
      totalOrphansRemoved > 0 ? `${totalOrphansRemoved} orphans removed` : null,
    ].filter(Boolean) as string[];
    console.log('✨ hooks');
    for (let i = 0; i < summaryLines.length; i++) {
      const isLast = i === summaryLines.length - 1;
      const prefix = isLast ? '└──' : '├──';
      console.log(`   ${prefix} ${summaryLines[i]}`);
    }
  } else if (syncResult.errors.length === 0) {
    console.log('✨ hooks: no changes needed');
  }
  if (syncResult.errors.length > 0) {
    console.log(`⚠️  ${syncResult.errors.length} hook error(s) occurred`);
  }
  console.log('');
};
