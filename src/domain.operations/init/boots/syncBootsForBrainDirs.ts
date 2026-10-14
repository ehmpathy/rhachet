import type { ContextCli } from '@src/domain.objects/ContextCli';
import type { BrainDirSyncSymlink } from '@src/domain.operations/boot/asBrainDirSyncReportLines';
import type {
  BrainDirBootFailure,
  BrainDirBootRender,
} from '@src/domain.operations/boot/BrainDirBootRender';
import { setDeltaActorsOndisk } from '@src/domain.operations/enroll/setDeltaActorsOndisk';
import { getAllLinkedRoleRefs } from '@src/domain.operations/init/roles/link/getAllLinkedRoleRefs';

import { asBrainDirSyncResult } from './asBrainDirSyncResult';
import { asRepoActorBrainDirOutcome } from './asRepoActorBrainDirOutcome';
import { asRoleSlugsOfRefs } from './asRoleSlugsOfRefs';
import { setRepoActorBrainDir } from './setRepoActorBrainDir';
import { syncActiveActorBrainDirs } from './syncActiveActorBrainDirs';

/**
 * .what = render the repo actor's brain dir, then each active actor's brain dir
 * .why = init, upgrade and roles link each change the linked set or its content, so each
 *        re-renders every corpus that set feeds
 *
 * .note = the linked set is read once, so the repo actor and the others see one set
 * .note = a repo actor failure is collected and the actor sweep still runs; a broken repo
 *         actor never skips a healthy actor
 * .note = `symlink` names what this sync did to `<repo>/.claude` — the effect, and what it
 *         moved and dropped. it is null on a repo actor failure, where no link was made
 * .note = `settings` names what the repo actor's settings layout findsert did; null on a
 *         repo actor failure
 * .note = `symlinkPrior` is what an earlier layout step of this same run did to the link
 *         (`setRepoActorBrainDirLayout`, before the role inits). this sync then finds the
 *         link in place, so the earlier effect is the one the report names
 */
export const syncBootsForBrainDirs = async (
  input: { repoPath: string; symlinkPrior?: BrainDirSyncSymlink | null },
  context: ContextCli,
): Promise<{
  renders: BrainDirBootRender[];
  failures: BrainDirBootFailure[];
  symlink: BrainDirSyncSymlink | null;
  settings: ReturnType<typeof asRepoActorBrainDirOutcome>['settings'];
}> => {
  const refsLinked = getAllLinkedRoleRefs({}, context);

  // the repo actor's brain dir; a throw is collected under the repo scope
  const [repoActorSettled] = await Promise.allSettled([
    setRepoActorBrainDir({ repoPath: input.repoPath, refsLinked }),
  ]);
  const repoActorOutcome = asRepoActorBrainDirOutcome({
    settled: repoActorSettled,
  });

  // each delta actor re-derives its roles from the linked set it stands over, so the sweep
  //   below renders it from its fresh roles (`inventory.of=requirements.case=2`)
  const deltaOutcome = await setDeltaActorsOndisk({
    repoPath: input.repoPath,
    rolesLinked: asRoleSlugsOfRefs({ refs: refsLinked }),
  });

  // each active actor; its own failures are already collected per scope
  const actorOutcome = await syncActiveActorBrainDirs({
    repoPath: input.repoPath,
    refsLinked,
  });

  // the repo actor leads, then each actor in order
  const repoActorResult = asBrainDirSyncResult({
    outcomes: [repoActorOutcome],
  });
  return {
    renders: [...repoActorResult.renders, ...actorOutcome.renders],
    failures: asFailuresWithEnumerationOnce({
      failures: [
        ...repoActorResult.failures,
        ...deltaOutcome.failures,
        ...actorOutcome.failures,
      ],
    }),
    symlink: asSymlinkOfRun({
      prior: input.symlinkPrior ?? null,
      now: repoActorOutcome.symlink,
    }),
    settings: repoActorOutcome.settings,
  };
};

/**
 * .what = what this run did to `<repo>/.claude`, across its two layout steps
 * .why = when the step before the role inits made or moved the link, the sync after them
 *   finds it in place; the report must still say what the run did
 * .note = a failed sync (null) stays null: the failure is what the report names
 */
const asSymlinkOfRun = (input: {
  prior: BrainDirSyncSymlink | null;
  now: BrainDirSyncSymlink | null;
}): BrainDirSyncSymlink | null => {
  if (input.now === null) return null;
  if (input.prior === null) return input.now;
  if (input.prior.effect === 'FOUND') return input.now;
  if (input.now.effect !== 'FOUND') return input.now;
  return input.prior;
};

/**
 * .what = the failures, with at most one under the `actors` scope
 * .why = the delta sync and the actor sweep each enumerate the same actors dir, so one
 *   unreadable dir would otherwise report twice. the first report is kept
 */
const asFailuresWithEnumerationOnce = (input: {
  failures: BrainDirBootFailure[];
}): BrainDirBootFailure[] => {
  const enumeration = input.failures.find(
    (failure) => failure.scope.kind === 'actors',
  );
  return input.failures.filter(
    (failure) => failure.scope.kind !== 'actors' || failure === enumeration,
  );
};
