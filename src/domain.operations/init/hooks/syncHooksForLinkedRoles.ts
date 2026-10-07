import type { BrainSpecifier } from '@src/domain.objects/BrainSpecifier';
import type { ContextCli } from '@src/domain.objects/ContextCli';
import { getActorOndiskDir } from '@src/domain.operations/actor/enrolled/getActorOndiskDir';
import { getAllActorsOndisk } from '@src/domain.operations/actor/enrolled/getAllActorsOndisk';
import { getLinkedRolesWithHooks } from '@src/domain.operations/brains/getLinkedRolesWithHooks';
import { asErrorClassText } from '@src/utils/asErrorClassText';
import { asTreeBranchLines } from '@src/utils/asTreeBranchLines';
import { getOneTreeElbow } from '@src/utils/getOneTreeElbow';
import { getOneTreeSpine } from '@src/utils/getOneTreeSpine';

import { join } from 'node:path';
import { asHookChangeSummary } from './asHookChangeSummary';
import { asHookFaultRows } from './asHookFaultRows';
import { asHookSyncTotalRows } from './asHookSyncTotalRows';
import { getOneHookChangeTally } from './getOneHookChangeTally';
import { getOneHookOrphanCount } from './getOneHookOrphanCount';
import { syncRoleHooksIntoTarget } from './syncRoleHooksIntoTarget';

/**
 * .what = the one-line header printed below a hook-sync fault set
 *
 * 🔴 it names the CONSEQUENCE, never the operation: an unsynced role hook is what a fault
 *   costs the reader (`rule.require.errors-name-the-fix`).
 *
 * 🔴 `💥` rather than `✋`: a hook-sync fault set is of MIXED owner — a read-only actor dir is
 *   the caller's to fix, an absent brain adapter is ours — and a summary of mixed owners renders
 *   at the harsher one (`rule.forbid.stormcloud-for-errors`). each row still carries its own.
 */
const asHookSyncFailureHeader = (input: { count: number }): string =>
  `💥 MalfunctionError: ${input.count} hook sync ${input.count === 1 ? 'error' : 'errors'} — role hooks may be uninstalled`;

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
  //
  // 🟡 .note = DELIBERATE MUTATION — `errors` grows by `push` across each phase below
  //   (discover, per-brain sync, per-actor sync). a fault in one phase never stops the next,
  //   so the list collects across them all and is returned once at the end
  const errors: Array<{ source: string; error: Error }> = [];

  // get linked roles with hooks
  const { roles, errors: discoverErrors } =
    await getLinkedRolesWithHooks(context);

  // report discover errors loud and proud
  //
  // 🚨 the TALLY is a qualified header and each ROW carries its own class. a sweep that could
  //   not finish is ours to repair, exit 1, so the tally reads `💥 MalfunctionError:`
  //   (`rule.require.qualified-error-headers`); each row reads its class off its own error
  if (discoverErrors.length > 0) {
    console.log('');
    console.log(
      `💥 MalfunctionError: ${discoverErrors.length} hook discovery ${discoverErrors.length === 1 ? 'error' : 'errors'}:`,
    );
    for (const err of discoverErrors) {
      // surface the phase tag (load vs use) so the operator sees the true layer that faulted —
      // getLinkedRolesWithHooks computes it precisely so the caller can point at the right layer
      console.log(
        `   └─ ${err.repoSlug}/${err.roleSlug} [${err.phase}]: ${asErrorClassText({ error: err.error })}`,
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
  asTreeBranchLines({
    rows: roles.map((role) => `${role.repo}/${role.slug}`),
    indent: '   ',
  }).forEach((line) => console.log(line));

  // build set of linked authors for orphan detection
  const authorsDesired = new Set(
    roles.map((role) => `repo=${role.repo}/role=${role.slug}`),
  );

  console.log('');
  console.log('🪝 apply hooks to brains...');

  // prune orphans, then sync every role into the root brains. the root write meets the same
  // fs and classified faults an actor's does, so it takes the same allowlist: reported and
  // tallied, while the sweep continues to the actors (`isActorHookSyncFault`)
  const {
    pruneResult,
    syncResult,
    faults: faultsForRoot,
  } = await syncRoleHooksIntoTarget(
    { authorsDesired, roles, brains: brains ?? null, configTargetDir: null },
    context,
  );
  const errorsForRoot = faultsForRoot.map(({ error }) => ({
    source: 'root',
    error,
  }));
  for (const line of asTreeBranchLines({
    rows: asHookFaultRows({ faults: errorsForRoot }),
    indent: '   ',
  }))
    console.log(line);
  for (const err of errorsForRoot)
    errors.push({ source: `sync:${err.source}`, error: err.error });

  // tally results
  const totalOrphansRemoved = getOneHookOrphanCount({
    removed: pruneResult.removed,
  });
  const {
    created: totalCreated,
    updated: totalUpdated,
    deleted: totalDeleted,
  } = getOneHookChangeTally({ applied: syncResult.applied });

  // collect all output lines for tree structure
  //
  // 🟡 .note = DELIBERATE MUTATION — `outputLines` grows across two loops (applied, then
  //   failed), whose rows interleave a push to `errors`; the tree renders once both are done
  const outputLines: string[] = [];

  for (const applied of syncResult.applied) {
    // report each application with changes
    const changes = asHookChangeSummary(
      getOneHookChangeTally({ applied: [applied] }),
    );
    if (changes) {
      outputLines.push(
        `${applied.role.repo}/${applied.role.slug} → ${applied.brain}: ${changes}`,
      );
    }
  }

  // collect sync errors
  for (const err of syncResult.errors) {
    // the CLASS rides the row, never a lone glyph — a glyph cannot be grepped and the class is
    // the actionable token (`rule.require.unabridged-error-prefix`). `asErrorClassText` reads it
    // off the error rather than asserts one, so a caller-fixable adapter fault is not relabelled
    outputLines.push(
      `✗ ${err.role.repo}/${err.role.slug} → ${err.brain}: ${asErrorClassText({ error: err.error })}`,
    );
    errors.push({
      source: `sync:${err.role.repo}/${err.role.slug}→${err.brain}`,
      error: err.error,
    });
  }

  // output with tree structure
  asTreeBranchLines({ rows: outputLines, indent: '   ' }).forEach((line) =>
    console.log(line),
  );

  // summary
  const hasChanges =
    totalCreated > 0 ||
    totalUpdated > 0 ||
    totalDeleted > 0 ||
    totalOrphansRemoved > 0;
  console.log('');
  if (hasChanges) {
    const summaryLines = asHookSyncTotalRows({
      created: totalCreated,
      updated: totalUpdated,
      deleted: totalDeleted,
      orphansRemoved: totalOrphansRemoved,
    });
    console.log('✨ hooks');
    for (const line of asTreeBranchLines({ rows: summaryLines, indent: '   ' }))
      console.log(line);
  }
  const countRootFaults = syncResult.errors.length + errorsForRoot.length;
  if (!hasChanges && countRootFaults === 0)
    console.log('✨ hooks: no changes needed');
  // close the summary only where one printed, so a fault-only run leaves one blank, not two
  if (hasChanges || countRootFaults === 0) console.log('');

  // apply the SAME hooks into every enrolled actor's brain dir, so an
  // actor's own brain/.claude/settings.json never drifts from the repo root
  // (usecase.9 — one boot/link keeps root AND all actors in sync)
  const actorsEnrolled = getAllActorsOndisk({ repoPath: context.cwd });
  if (actorsEnrolled.length > 0) {
    console.log('🧢 apply hooks to enrolled actors...');
    // .note = a classified fault (`isActorHookSyncFault`) stays scoped to its actor's row and
    //   the sweep continues. an unclassified throw is our own defect, so it exits the sweep
    //   loud, and the actors after it are not synced this run. each write is idempotent, so
    //   the next init or upgrade re-converges every actor once the defect is fixed
    // .note = deliberate mutation — `i` is a loop induction index; the tree render
    //   needs the position to know which actor is last (└─ vs ├─); bounded to the loop
    for (let i = 0; i < actorsEnrolled.length; i++) {
      const actor = actorsEnrolled[i]!;
      const prefix = getOneTreeElbow({
        index: i,
        length: actorsEnrolled.length,
      });

      // the config write path is the actor's brain dir; package discovery + brain
      // detection still root at context.cwd (only the write target moves)
      const configTargetDir = join(
        getActorOndiskDir({ repoPath: context.cwd, hash: actor.hash }),
        'brain',
      );

      // 🔴 the three fault sources below land HERE first, never straight into `errors`.
      //   they are reported beneath this actor's own row and THEN aggregated, so the
      //   render and the tally read the same set. a push straight to `errors` is what
      //   made them unprintable: the shared array carries every actor's faults at once,
      //   so this loop could no longer tell which of them were its own to report
      // 🟡 .note = deliberate mutation — a per-actor accumulator, scoped to this loop turn and
      //   read only after the try settles, so no shared reference ever observes a partial set
      const errorsForActor: { source: string; error: Error }[] = [];

      // 🔴 narrow to the actor's OWN roleset. an actor enrolled `-driver` must never carry the
      //   driver's hooks: its clones read this brain dir at user scope, so a foreign Stop hook
      //   fires inside them — a reviewer clone loops on `route.drive` and never ends its turn.
      //   the prune takes the same narrowed set, so a hook this sync once wrote is removed.
      //   the match is by slug, as the actor model records it: two linked suppliers that ship
      //   one slug would both match
      const rolesForActor = roles.filter((role) =>
        actor.roles.includes(role.slug),
      );
      const authorsForActor = new Set(
        rolesForActor.map((role) => `repo=${role.repo}/role=${role.slug}`),
      );
      const { syncResult: actorSync, faults: faultsForActor } =
        await syncRoleHooksIntoTarget(
          {
            authorsDesired: authorsForActor,
            roles: rolesForActor,
            brains: brains ?? null,
            configTargetDir,
          },
          context,
        );

      // tally created/updated/deleted across every role→brain apply, so the actor
      // row carries the SAME +N/~N/-N summary the brain rows do — never a bare hash
      // (rule.forbid.snapshot-visual-blemishes: the two rows share a shape)
      const changes = asHookChangeSummary(
        getOneHookChangeTally({ applied: actorSync.applied }),
      );
      for (const err of actorSync.errors) {
        errorsForActor.push({
          source: `${err.role.repo}/${err.role.slug}→${err.brain}`,
          error: err.error,
        });
      }
      for (const fault of faultsForActor)
        errorsForActor.push({ source: 'actor', error: fault.error });

      // aggregate, with the actor coordinate restored — the render below sits UNDER this
      // actor's row so it needs no prefix, while `errors` is read by a caller with no such
      // context (`invokeInit.ts`, `execUpgrade.ts`), so its `source` must stand alone
      for (const err of errorsForActor) {
        errors.push({
          source: `sync:actor=${actor.hash}:${err.source}`,
          error: err.error,
        });
      }

      // the actor hash is rendered WHOLE — it is already the actor's entire name
      // (genEnrollmentHash mints 8 chars), so an elision here would hide one char,
      // spend a glyph on the ellipsis, and cost the reader a copyable `@<hash>`
      // address (define.address-sigils). the change summary mirrors the brain row
      // so the reader sees WHAT changed per actor
      console.log(`   ${prefix} ${actor.hash}${changes ? `: ${changes}` : ''}`);

      // 🔴 a per-actor fault is REPORTED, never merely tallied. `invokeInit.ts:166` counts
      //   `errors.length` to set the exit code and prints none of them, so an unprinted one
      //   here is an `init --hooks` that exits 1 and tells nobody why — while the root-level
      //   loop three screens up prints its own faults with this exact `✗` row. one operation,
      //   two grades of the same fault, and only the quieter half reaches an actor's hooks
      //   (`rule.require.failloud`)
      //
      // ⚠️ and the actor half is the half that matters most: a role's hooks are installed
      //   into each actor's own brain config, so a silent fault here leaves that actor with a
      //   role whose guards, boots, and permission checks are absent — while the command
      //   reports success
      const spine = getOneTreeSpine({
        index: i,
        length: actorsEnrolled.length,
      });
      for (const line of asTreeBranchLines({
        rows: asHookFaultRows({ faults: errorsForActor }),
        indent: `   ${spine}`,
      }))
        console.log(line);
    }
    console.log('');
  }

  // the ONE header a fault set gets, owned here and printed once, after every phase has
  //   reported its own rows in place. a caller (`invokeInit`, `execUpgrade`) reads `errors`
  //   for its exit code and prints no second header (`rule.forbid.friction-hazards`)
  if (errors.length > 0)
    console.log(asHookSyncFailureHeader({ count: errors.length }));

  return { errors };
};
