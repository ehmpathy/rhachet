import type { BrainSpecifier } from '@src/domain.objects/BrainSpecifier';
import type { ContextCli } from '@src/domain.objects/ContextCli';
import { getActorOndiskDir } from '@src/domain.operations/actor/enrolled/getActorOndiskDir';
import { getAllActorsOndisk } from '@src/domain.operations/actor/enrolled/getAllActorsOndisk';
import { getLinkedRolesWithHooks } from '@src/domain.operations/brains/getLinkedRolesWithHooks';
import { pruneOrphanedRoleHooksFromAllBrains } from '@src/domain.operations/brains/pruneOrphanedRoleHooksFromAllBrains';
import { syncAllRoleHooksIntoEachBrainRepl } from '@src/domain.operations/brains/syncAllRoleHooksIntoEachBrainRepl';
import { abbreviate } from '@src/utils/abbreviate';

import { join } from 'node:path';

/**
 * .what = syncs brain hooks for linked roles
 * .why = syncs role hook declarations to brain configs (e.g., .claude/settings.json)
 */
export const syncHooksForLinkedRoles = async (
  input: { brains?: BrainSpecifier[] },
  context: ContextCli,
): Promise<{
  errors: Array<{ source: string; error: Error }>;
}> => {
  const { brains } = input;

  console.log('🔭 search for linked roles with hooks...');

  // track all errors for return
  const errors: Array<{ source: string; error: Error }> = [];

  // get linked roles with hooks
  const { roles, errors: discoverErrors } =
    await getLinkedRolesWithHooks(context);

  // report discover errors loud and proud
  if (discoverErrors.length > 0) {
    console.log('');
    console.log(`⛈️  ${discoverErrors.length} hook discovery error(s):`);
    for (const err of discoverErrors) {
      // surface the phase tag (load vs use) so the operator sees the true layer that faulted —
      // getLinkedRolesWithHooks computes it precisely so the caller can point at the right layer
      console.log(
        `   └─ ${err.repoSlug}/${err.roleSlug} [${err.phase}]: ${err.error.message}`,
      );
      errors.push({
        source: `discover:${err.repoSlug}/${err.roleSlug}`,
        error: err.error,
      });
    }
  }

  if (roles.length === 0) {
    console.log('');
    console.log('🫧 no roles with hooks found');
    console.log('');
    return { errors };
  }

  // report found roles with tree structure
  for (let i = 0; i < roles.length; i++) {
    const role = roles[i]!;
    const isLast = i === roles.length - 1;
    const prefix = isLast ? '└─' : '├─';
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

  // collect sync errors
  for (const err of syncResult.errors) {
    outputLines.push(
      `⛈️  ${err.role.repo}/${err.role.slug} → ${err.brain}: ${err.error.message}`,
    );
    errors.push({
      source: `sync:${err.role.repo}/${err.role.slug}→${err.brain}`,
      error: err.error,
    });
  }

  // output with tree structure
  for (let i = 0; i < outputLines.length; i++) {
    const isLast = i === outputLines.length - 1;
    const prefix = isLast ? '└─' : '├─';
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
      const prefix = isLast ? '└─' : '├─';
      console.log(`   ${prefix} ${summaryLines[i]}`);
    }
  } else if (syncResult.errors.length === 0) {
    console.log('✨ hooks: no changes needed');
  }
  if (syncResult.errors.length > 0) {
    console.log(`⛈️  ${syncResult.errors.length} hook sync error(s) occurred`);
  }
  console.log('');

  // apply the SAME hooks into every enrolled actor's brain config dir, so an
  // actor's own brain/.claude/settings.json never drifts from the repo root
  // (usecase.9 — one boot/link keeps root AND all actors in sync)
  const actorsEnrolled = getAllActorsOndisk({ repoPath: context.cwd });
  if (actorsEnrolled.length > 0) {
    console.log('🧢 apply hooks to enrolled actors...');
    // .note = deliberate mutation — `i` is a loop induction index; the tree render
    //   needs the position to know which actor is last (└─ vs ├─); bounded to the loop
    for (let i = 0; i < actorsEnrolled.length; i++) {
      const actor = actorsEnrolled[i]!;
      const isLast = i === actorsEnrolled.length - 1;
      const prefix = isLast ? '└─' : '├─';

      // the config write path is the actor's brain dir; package discovery + brain
      // detection still root at context.cwd (only the write target moves)
      const configTargetDir = join(
        getActorOndiskDir({ repoPath: context.cwd, hash: actor.hash }),
        'brain',
      );

      // .note = deliberate mutation — a per-actor change summary, rendered on this
      //   actor's log row below; scoped to the loop iteration, never escapes
      let changes = '';
      try {
        await pruneOrphanedRoleHooksFromAllBrains(
          { authorsDesired, brains, configTargetDir },
          context,
        );
        const actorSync = await syncAllRoleHooksIntoEachBrainRepl(
          { roles, brains, configTargetDir },
          context,
        );
        // tally created/updated/deleted across every role→brain apply, so the actor
        // row carries the SAME +N/~N/-N summary the brain rows do — never a bare hash
        // (rule.forbid.snapshot-visual-blemishes: the two rows share a shape)
        const created = actorSync.applied.reduce(
          (sum, a) => sum + a.hooks.created.length,
          0,
        );
        const updated = actorSync.applied.reduce(
          (sum, a) => sum + a.hooks.updated.length,
          0,
        );
        const deleted = actorSync.applied.reduce(
          (sum, a) => sum + a.hooks.deleted.length,
          0,
        );
        changes = [
          created > 0 ? `+${created}` : null,
          updated > 0 ? `~${updated}` : null,
          deleted > 0 ? `-${deleted}` : null,
        ]
          .filter(Boolean)
          .join(', ');
        for (const err of actorSync.errors) {
          errors.push({
            source: `sync:actor=${actor.hash.slice(0, 7)}:${err.role.repo}/${err.role.slug}→${err.brain}`,
            error: err.error,
          });
        }
      } catch (error) {
        errors.push({
          source: `sync:actor=${actor.hash.slice(0, 7)}`,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }

      // a decorative short handle for the log row (NOT a real path) — the same
      // abbreviate the list views use, so this display never misuses the on-disk
      // dir-name token transformer (whose contract is a real path segment). the
      // change summary mirrors the brain row so the reader sees WHAT changed per actor
      console.log(
        `   ${prefix} ${abbreviate({ value: actor.hash, keep: 7 })}${changes ? `: ${changes}` : ''}`,
      );
    }
    console.log('');
  }

  return { errors };
};
