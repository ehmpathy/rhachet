import { HelpfulError, MalfunctionError } from 'helpful-errors';

import type { ActorOndisk } from '@src/domain.objects/ActorOndisk';
import type { BrainSpecifier } from '@src/domain.objects/BrainSpecifier';
import type { ContextCli } from '@src/domain.objects/ContextCli';
import { getAllActorsOndisk } from '@src/domain.operations/actor/enrolled/getAllActorsOndisk';
import { withBrainDirSettingsShield } from '@src/domain.operations/actor/enrolled/withBrainDirSettingsShield';
import { getBrainsDetectedAndSupplied } from '@src/domain.operations/brains/getBrainsDetectedAndSupplied';
import { getLinkedRolesWithHooks } from '@src/domain.operations/brains/getLinkedRolesWithHooks';
import { setActorSettingsDerived } from '@src/domain.operations/enroll/setActorSettingsDerived';
import { getHomeDir } from '@src/infra/getHomeDir';
import { asErrorClassText } from '@src/utils/asErrorClassText';
import { asTreeBranchLines } from '@src/utils/asTreeBranchLines';
import { isCodeDefectError } from '@src/utils/isCodeDefectError';

import { lstatSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { asEnrolledActorsHookSyncLines } from './asEnrolledActorsHookSyncLines';
import { asHookChangeSummary } from './asHookChangeSummary';
import { asHookChangeTally } from './asHookChangeTally';
import { asHookFaultRows } from './asHookFaultRows';
import { asHookSyncTotalRows } from './asHookSyncTotalRows';
import { getOneHookChangeTally } from './getOneHookChangeTally';
import { getOneHookOrphanCount } from './getOneHookOrphanCount';
import { isBrainClaudeCode } from './isBrainClaudeCode';
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

  // prune orphans, then sync every role into the repo actor's brains. the root write meets
  // the same fs and classified faults an actor's does, so it takes the same allowlist:
  // reported and tallied, while the sweep continues to the actors (`isActorHookSyncFault`)
  //
  // 🔴 an adapter that predates the layout writes `<repo>/.claude/settings.json` by name — an
  //   arrow to the human's home settings — so the pair runs inside the shield, which keeps
  //   that write in the repo
  //
  // .note = the brains are detected BEFORE the shield opens: the shield puts a real
  //   settings.json in claude's slot, which detection would read as a claude repo
  // .note = a detected brain no installed package supplies is skipped; a named one is not
  const brainsTarget = brains ?? (await getBrainsDetectedAndSupplied(context));
  const syncIntoRoot = () =>
    syncRoleHooksIntoTarget(
      { authorsDesired, roles, brains: brainsTarget, configTargetDir: null },
      context,
    );
  const isClaudeCodeTargeted = brainsTarget.some((brain) =>
    isBrainClaudeCode({ brain }),
  );
  const {
    pruneResult,
    syncResult,
    faults: faultsForRoot,
  } = isClaudeCodeTargeted
    ? await withRepoBrainDirShield({ repoPath: context.cwd }, syncIntoRoot)
    : await syncIntoRoot();
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

  // a clean sync that moved no hook says so once, as a subbranch (rule.forbid.colons-in-stdout)
  const countRootFaults = syncResult.errors.length + errorsForRoot.length;
  if (!hasChanges && countRootFaults === 0) {
    console.log('✨ hooks');
    console.log('   └─ no changes needed');
  }
  // close the summary only where one printed, so a fault-only run leaves one blank, not two
  if (hasChanges || countRootFaults === 0) console.log('');

  // derive every enrolled actor's settings.of.repo.json from the repo actor's, narrowed
  // to THAT actor's own roles — the same derivation enroll runs at spawn, so an
  // actor's settings never drift from the repo actor's, and never carry a hook of a
  // role the actor was not enrolled in (usecase.9)
  //
  // 🔴 never a second sync into each actor's brain dir: there `settings.json` is the grove
  //   arrow into the human's home settings, so a write by that name would land the roles'
  //   hooks in `~/.claude/settings.json` (inventory.of=requirements.case=9)
  //
  // 🟡 .note = the repo actor is included: this pass is init's one writer of its
  //   `claudeMdExcludes` (enroll writes them only at spawn). its hooks come back unchanged,
  //   since `genBrainCliConfigArtifact` never narrows the source
  const actorsEnrolled = getAllActorsOndisk({ repoPath: context.cwd });
  if (actorsEnrolled.length > 0) {
    // derive each actor's settings, one at a time and in order; a fault is collected, so one
    //   broken actor never skips the rest. the actor row carries the SAME +N/~N/-N summary
    //   the brain rows do (rule.forbid.snapshot-visual-blemishes: the two rows share a shape)
    const actorRows: Parameters<
      typeof asEnrolledActorsHookSyncLines
    >[0]['actors'] = [];
    // .note = deliberate mutation — the actors derive one at a time, in order, so the rows
    //   print in the order the actors were read; the list is local to this block
    for (const actor of actorsEnrolled) {
      const { outcome, fault } = await getOneEnrolledActorSettingsOutcome({
        actor,
        repoPath: context.cwd,
      });
      if (fault)
        errors.push({ source: `sync:actor=${actor.exid}`, error: fault });
      actorRows.push({
        actorExid: actor.exid,
        outcome,
        hint: asErrorHintOrNull({ error: fault }),
      });
    }
    asEnrolledActorsHookSyncLines({ actors: actorRows }).forEach((line) =>
      console.log(line),
    );
    console.log('');
  }

  // the ONE header a fault set gets, owned here and printed once, after every phase has
  //   reported its own rows in place. a caller (`invokeInit`, `execUpgrade`) reads `errors`
  //   for its exit code and prints no second header (`rule.forbid.friction-hazards`)
  if (errors.length > 0)
    console.log(asHookSyncFailureHeader({ count: errors.length }));

  return { errors };
};

/**
 * .what = derive one enrolled actor's settings, and settle it into the shape its report row
 *   reads: the change summary or the fault, and the fault itself (always an Error) for the
 *   caller's error list
 * .why = a fault is collected, never thrown, so one broken actor never skips the rest
 */
const getOneEnrolledActorSettingsOutcome = async (input: {
  actor: ActorOndisk;
  repoPath: string;
}): Promise<{
  outcome: { changes: string } | { error: Error };
  fault: Error | null;
}> => {
  try {
    const derived = await setActorSettingsDerived(input);
    const tally = asHookChangeTally(derived.hooks);
    const changes = asHookChangeSummary({
      created: tally.created.length,
      updated: tally.updated.length,
      deleted: tally.deleted.length,
    });
    return { outcome: { changes }, fault: null };
  } catch (error) {
    // an allowlist: a classed or fs fault is this actor's row; a code defect surfaces loud
    if (isCodeDefectError({ error })) throw error;
    const fault =
      error instanceof Error
        ? error
        : new MalfunctionError('actor settings derivation rejected', {
            actorExid: input.actor.exid,
            reason: error,
            hint: 'rerun `rhx init --hooks`; if it fails again, report this output as a rhachet bug',
          });
    return { outcome: { error: fault }, fault };
  }
};

/**
 * .what = run logic inside the settings shield of the brain dir `<repo>/.claude` reaches,
 *         when that dir is in the layout; else run it bare
 * .why = the arrow is the only way an adapter's write by name can reach the grove
 */
const withRepoBrainDirShield = async <T>(
  input: { repoPath: string },
  logic: () => Promise<T>,
): Promise<T> => {
  // resolve `<repo>/.claude` once, then probe and shield that one dir — so a swap of the
  //   reach path between the probe and the shield cannot point them at two different dirs
  const brainDir = getRealpathOrNull({
    path: join(input.repoPath, '.claude'),
  });
  // 🔴 the layout reach path is the signal, never the grove arrow: a box with no
  //   `~/.claude/settings.json` has no arrow, and there an old adapter's write by name
  //   would land in a real `settings.json` the clone never reads
  const isLayoutReach =
    isSymlinkAt({ path: join(input.repoPath, '.claude') }) ||
    (!!brainDir && isSymlinkAt({ path: join(brainDir, 'settings.json') }));
  if (!brainDir || !isLayoutReach) return logic();
  return withBrainDirSettingsShield(
    { repoPath: input.repoPath, brainDir, home: getHomeDir() },
    logic,
  );
};

/**
 * .what = a path's realpath, or null when it is absent
 * .note = only ENOENT means absent; every other errno surfaces (failhide)
 */
const getRealpathOrNull = (input: { path: string }): string | null => {
  try {
    return realpathSync(input.path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') return null;
    throw error;
  }
};

/**
 * .what = the `hint` a HelpfulError carries, or null
 * .why = an actor row names the fault's class; the hint beneath it names the fix
 */
const asErrorHintOrNull = (input: { error: Error | null }): string | null => {
  if (!(input.error instanceof HelpfulError)) return null;
  const hint: unknown = input.error.metadata?.hint;
  return typeof hint === 'string' ? hint : null;
};

/**
 * .what = whether a symlink sits at a path (absent reads as no)
 */
const isSymlinkAt = (input: { path: string }): boolean =>
  !!lstatSync(input.path, { throwIfNoEntry: false })?.isSymbolicLink();
