import type { ContextCli } from '@src/domain.objects/ContextCli';
import type { BrainDirSettingsLayout } from '@src/domain.operations/actor/enrolled/setBrainDirSettingsLayout';
import type {
  BrainDirBootFailure,
  BrainDirBootRender,
} from '@src/domain.operations/boot/BrainDirBootRender';
import type {
  BrainDirSyncSettingsReplaced,
  BrainDirSyncSymlink,
} from '@src/domain.operations/boot/BrainDirLayoutOutcome';
import { setDeltaActorsOndisk } from '@src/domain.operations/enroll/setDeltaActorsOndisk';
import { getAllLinkedRoleRefs } from '@src/domain.operations/init/roles/link/getAllLinkedRoleRefs';

import { asBrainDirSyncResult } from './asBrainDirSyncResult';
import { asRepoActorBrainDirOutcome } from './asRepoActorBrainDirOutcome';
import { asRoleSlugsOfRefs } from './asRoleSlugsOfRefs';
import { asSettingsReplacedOfLayout } from './asSettingsReplacedOfLayout';
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
 * .note = `symlink` and `settingsReplaced` name what THIS sync's layout step did. a layout step
 *         that ran before the role inits reports its own change at once
 *         (`setRepoActorBrainDirLayoutBeforeInits`), so this sync finds it in place and names
 *         naught twice
 */
export const syncBootsForBrainDirs = async (
  input: {
    repoPath: string;
  },
  context: ContextCli,
): Promise<{
  renders: BrainDirBootRender[];
  failures: BrainDirBootFailure[];
  symlink: BrainDirSyncSymlink | null;
  settings: BrainDirSettingsLayout | null;
  settingsReplaced: BrainDirSyncSettingsReplaced[];
  excludesDropped: string[];
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
    symlink: repoActorOutcome.symlink,
    settings: repoActorOutcome.settings,
    settingsReplaced: asSettingsReplacedOfLayout({
      settings: repoActorOutcome.settings,
    }),
    excludesDropped: repoActorOutcome.excludesDropped,
  };
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
