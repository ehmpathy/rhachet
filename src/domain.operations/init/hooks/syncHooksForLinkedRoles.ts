import { HelpfulError } from 'helpful-errors';

import type { ActorOndisk } from '@src/domain.objects/ActorOndisk';
import type { BrainSpecifier } from '@src/domain.objects/BrainSpecifier';
import type { ContextCli } from '@src/domain.objects/ContextCli';
import { BrainDirOutsideRepoError } from '@src/domain.operations/actor/enrolled/BrainDirOutsideRepoError';
import { REPO_ACTOR_EXID } from '@src/domain.operations/actor/enrolled/constants';
import { emitBrainDirOutsideRepoWarns } from '@src/domain.operations/actor/enrolled/emitBrainDirOutsideRepoWarns';
import { getActorOndiskDir } from '@src/domain.operations/actor/enrolled/getActorOndiskDir';
import { getAllActorsOndisk } from '@src/domain.operations/actor/enrolled/getAllActorsOndisk';
import { getBrainOndiskDir } from '@src/domain.operations/actor/enrolled/getBrainOndiskDir';
import { withBrainDirOutsideRepoAsSkip } from '@src/domain.operations/actor/enrolled/withBrainDirOutsideRepoAsSkip';
import { withBrainDirSettingsShield } from '@src/domain.operations/actor/enrolled/withBrainDirSettingsShield';
import { getBrainsDetectedAndSupplied } from '@src/domain.operations/brains/getBrainsDetectedAndSupplied';
import { getLinkedRolesWithHooks } from '@src/domain.operations/brains/getLinkedRolesWithHooks';
import { setActorSettingsDerived } from '@src/domain.operations/enroll/setActorSettingsDerived';
import { getHomeDir } from '@src/infra/getHomeDir';
import { asErrorClassText } from '@src/utils/asErrorClassText';
import { asTreeBranchLines } from '@src/utils/asTreeBranchLines';
import { isCodeDefectError } from '@src/utils/isCodeDefectError';
import { isPathOutsideDir } from '@src/utils/isPathOutsideDir';

import { lstatSync, realpathSync } from 'node:fs';
import { isAbsolute, join, relative } from 'node:path';
import { asActorSettingsFaultWrapped } from './asActorSettingsFaultWrapped';
import { asActorSettlementsSplit } from './asActorSettlementsSplit';
import { asHookChangeSummary } from './asHookChangeSummary';
import { asHookChangeTally } from './asHookChangeTally';
import { asHookFaultRows } from './asHookFaultRows';
import { asHookSyncTotalRows } from './asHookSyncTotalRows';
import { emitEnrolledActorsHookSyncLines } from './emitEnrolledActorsHookSyncLines';
import { emitReadonlyOutsideSettingsNotes } from './emitReadonlyOutsideSettingsNotes';
import { getOneHookChangeTally } from './getOneHookChangeTally';
import { getOneHookOrphanCount } from './getOneHookOrphanCount';
import { getOneReadonlyOutsideSettingsTargetOrNull } from './getOneReadonlyOutsideSettingsTargetOrNull';
import { getOneRepoActorReadonlyTargetSettled } from './getOneRepoActorReadonlyTargetSettled';
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
  const isClaudeCodeTargeted = brainsTarget.includes('anthropic/claude/code');
  const syncIntoRootReached = isClaudeCodeTargeted
    ? () => withRepoBrainDirShield({ repoPath: context.cwd }, syncIntoRoot)
    : syncIntoRoot;

  // a skip is no error: a brain dir that lands outside the repo is never written, and its
  //   `⚠️` block prints once the actors have reported (`assertBrainDirInsideRepo`). the skip
  //   rides beside the stand-in result, so it is never mistaken for a sync that changed no file
  const rootSync = await withBrainDirOutsideRepoAsSkip({
    logic: syncIntoRootReached,
    skipped: {
      pruneResult: { removed: [] },
      syncResult: { applied: [], errors: [] },
      faults: [],
    },
  });
  const { pruneResult, syncResult, faults: faultsForRoot } = rootSync.result;
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

  // a clean sync that moved no hook says so once, as a subbranch (rule.forbid.colons-in-stdout).
  //   a skipped sync is never clean: it moved no hook because it never ran, and its `⚠️`
  //   block below says so
  const countRootFaults = syncResult.errors.length + errorsForRoot.length;
  const isRootClean = countRootFaults === 0 && rootSync.skips.length === 0;
  if (!hasChanges && isRootClean) {
    console.log('✨ hooks');
    console.log('   └─ no changes needed');
  }
  // close the summary only where one printed, so a fault-only run leaves one blank, not two
  if (hasChanges || isRootClean) console.log('');

  // derive every enrolled actor's settings.of.repo.json from the repo actor's, narrowed
  // to THAT actor's own roles — the same derivation enroll runs at spawn, so an
  // actor's settings never drift from the repo actor's, and never carry a hook of a
  // role the actor was not enrolled in (usecase.9)
  //
  // 🔴 never a second sync into each actor's brain dir: there `settings.json` is the grove
  //   arrow into the human's home settings, so a write by that name would land the roles'
  //   hooks in `~/.claude/settings.json` (inventory.of=requirements.case=9)
  //
  // 🟡 .note = the repo actor is included once enrolled: this pass is init's one writer of its
  //   `claudeMdExcludes` (enroll writes them only at spawn). its hooks come back unchanged,
  //   since `genBrainCliConfigArtifact` never narrows the source
  const actorsEnrolled = getAllActorsOndisk({ repoPath: context.cwd });

  // derive each actor's settings; a fault is collected, so one broken actor never skips the
  //   rest. the actor row carries the same +N/~N/-N summary the brain rows do
  //   (rule.forbid.snapshot-visual-blemishes: the two rows share a shape)
  const actorPass = asActorSettlementsSplit({
    settlements: await setAllEnrolledActorSettlements({
      actors: actorsEnrolled,
      repoPath: context.cwd,
    }),
  });

  // the repo actor's arrow reaches the human's home settings too, and it is listed among the
  //   actors only once a clone was enrolled (it gains its actor.json then). so it is probed
  //   on its own, and a locked home file is noted on every init, enrolled or not. a probe
  //   fault renders as its own actor row and joins the errors, never a throw after the writes
  const probeOfRepoActor = getOneRepoActorReadonlyTargetSettled({
    repoPath: context.cwd,
    isSkipped: rootSync.skips.length > 0,
  });
  const rowsOfProbeFault = probeOfRepoActor.fault
    ? [
        {
          actorExid: REPO_ACTOR_EXID,
          outcome: { error: probeOfRepoActor.fault },
          details: [],
        },
      ]
    : [];
  errors.push(...actorPass.errors);
  if (probeOfRepoActor.fault)
    errors.push({
      source: `probe:actor=${REPO_ACTOR_EXID}`,
      error: probeOfRepoActor.fault,
    });
  emitEnrolledActorsHookSyncLines({
    actors: [...actorPass.rows, ...rowsOfProbeFault],
  });
  const targetReadonlyOfRepoActor = probeOfRepoActor.target;

  // each skipped brain dir names its path and its fix; each read-only home file, once
  const skips = [...rootSync.skips, ...actorPass.skips];
  emitBrainDirOutsideRepoWarns({ skips });
  emitReadonlyOutsideSettingsNotes({
    repoPath: context.cwd,
    targets: [
      ...(targetReadonlyOfRepoActor ? [targetReadonlyOfRepoActor] : []),
      ...actorPass.targetsReadonly,
    ],
  });

  // the ONE header a fault set gets, owned here and printed once, after every phase has
  //   reported its own rows in place. a caller (`invokeInit`, `execUpgrade`) reads `errors`
  //   for its exit code and prints no second header (`rule.forbid.friction-hazards`)
  if (errors.length > 0)
    console.log(asHookSyncFailureHeader({ count: errors.length }));

  return { errors };
};

/**
 * .what = settle every enrolled actor, one at a time and in order
 * .why = the actors derive in order, so the rows print in the order the actors were read; a
 *   parallel map would interleave their writes to the repo actor's source
 *
 * 🟡 .note = deliberate mutation — the list grows one settlement per actor, local to this call
 */
const setAllEnrolledActorSettlements = async (input: {
  actors: ActorOndisk[];
  repoPath: string;
}): Promise<
  Awaited<ReturnType<typeof setOneEnrolledActorSettingsOutcome>>[]
> => {
  const settlements: Awaited<
    ReturnType<typeof setOneEnrolledActorSettingsOutcome>
  >[] = [];
  for (const actor of input.actors)
    settlements.push(
      await setOneEnrolledActorSettingsOutcome({
        actor,
        repoPath: input.repoPath,
      }),
    );
  return settlements;
};

/**
 * .what = derive one enrolled actor's settings, and settle it into its report row, the fault
 *   itself (always an Error) for the caller's error list, its skip, and its read-only home file
 * .why = a fault is collected, never thrown, so one broken actor never skips the rest
 */
const setOneEnrolledActorSettingsOutcome = async (input: {
  actor: ActorOndisk;
  repoPath: string;
}): Promise<
  Parameters<typeof asActorSettlementsSplit>[0]['settlements'][number]
> => {
  const actorExid = input.actor.exid;
  try {
    const brainDir = getActorBrainDir(input);
    const derived = await setActorSettingsDerived(input);
    const tally = asHookChangeTally(derived.hooks);
    const changes = asHookChangeSummary({
      created: tally.created.length,
      updated: tally.updated.length,
      deleted: tally.deleted.length,
    });
    const targetReadonly = getOneReadonlyOutsideSettingsTargetOrNull({
      repoPath: input.repoPath,
      brainDir,
    });
    return {
      row: { actorExid, outcome: { changes }, details: [] },
      fault: null,
      skip: null,
      targetReadonly,
    };
  } catch (error) {
    // a brain dir that lands outside the repo is skipped, never an error row
    if (error instanceof BrainDirOutsideRepoError)
      return {
        row: {
          actorExid,
          outcome: { skipped: 'outside the repo' },
          details: [],
        },
        fault: null,
        skip: error,
        targetReadonly: null,
      };

    // an allowlist: a classed or fs fault is this actor's row; a code defect surfaces loud
    if (isCodeDefectError({ error })) throw error;
    const fault = asActorSettingsFaultWrapped({
      error,
      actorExid,
      roles: input.actor.roles,
      brainDirRel: relative(input.repoPath, getActorBrainDir(input)),
    });
    return {
      row: {
        actorExid,
        outcome: { error: fault },
        details: asActorFaultDetails({ error: fault, ...input }),
      },
      fault,
      skip: null,
      targetReadonly: null,
    };
  }
};

/**
 * .what = the brain dir of one enrolled actor
 * .why = a faulted row with no path of its own still names where it struck
 */
const getActorBrainDir = (input: {
  actor: ActorOndisk;
  repoPath: string;
}): string =>
  getBrainOndiskDir({
    actorDir: getActorOndiskDir({
      repoPath: input.repoPath,
      exid: input.actor.exid,
    }),
  });

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
 * .what = the `roles = …`, `path = …`, `found = …`, `lands at = …`, `hint = …` details beneath
 *   a faulted actor row
 * .why = every fault names which roles it costs and where it struck (the wish), whatever its
 *   class; what sits there, where it lands, and the hint follow where the error carries them.
 *   a clean row has no details
 * .note = the path is the fault's own, where it names one, else the actor's brain dir; an
 *   absolute path inside the repo reads relative to it, so every row's `path =` has one shape
 */
const asActorFaultDetails = (input: {
  error: Error;
  actor: ActorOndisk;
  repoPath: string;
}): { key: string; value: string }[] => {
  const metadata: Record<string, unknown> =
    input.error instanceof HelpfulError ? (input.error.metadata ?? {}) : {};
  const pathNamed =
    typeof metadata.path === 'string' ? metadata.path : getActorBrainDir(input);
  const path = asPathRelativeWhenInside({
    path: pathNamed,
    dir: input.repoPath,
  });
  return [
    { key: 'roles', value: input.actor.roles.join(', ') || null },
    { key: 'path', value: path },
    { key: 'found', value: metadata.found },
    { key: 'lands at', value: metadata.landsAt },
    { key: 'hint', value: metadata.hint },
  ].flatMap(({ key, value }) =>
    typeof value === 'string' ? [{ key, value }] : [],
  );
};

/**
 * .what = a path relative to a dir when it is absolute and inside it; else the path as named
 * .why = every row's `path =` reads in one shape, relative to the repo; a path outside it
 *   stays absolute, so the human sees it leave the repo
 */
const asPathRelativeWhenInside = (input: {
  path: string;
  dir: string;
}): string =>
  isAbsolute(input.path) && !isPathOutsideDir(input)
    ? relative(input.dir, input.path)
    : input.path;

/**
 * .what = whether a symlink sits at a path (absent reads as no)
 */
const isSymlinkAt = (input: { path: string }): boolean =>
  !!lstatSync(input.path, { throwIfNoEntry: false })?.isSymbolicLink();
