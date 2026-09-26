import type { ContextCli } from '@src/domain.objects/ContextCli';
import type { BrainDirSyncSymlink } from '@src/domain.operations/boot/asBrainDirSyncReportLines';
import type {
  BrainDirBootFailure,
  BrainDirBootRender,
} from '@src/domain.operations/boot/BrainDirBootRender';
import { getAllLinkedRoleRefs } from '@src/domain.operations/init/roles/link/getAllLinkedRoleRefs';

import { asBrainDirSyncResult } from './asBrainDirSyncResult';
import { asDefaultBrainDirOutcome } from './asDefaultBrainDirOutcome';
import { syncActiveActorBrainDirs } from './syncActiveActorBrainDirs';
import { syncDefaultBrainDir } from './syncDefaultBrainDir';

/**
 * .what = render the repo's default brain dir, then each active actor's brain dir
 * .why = init, upgrade and roles link each change the linked set or its content, so each
 *        re-renders every corpus that set feeds
 *
 * .note = the linked set is read once, so the default and the actors see one set
 * .note = a default failure is collected and the actor sweep still runs; a broken default
 *         never skips a healthy actor
 * .note = `symlink` names what this sync did to `<repo>/.claude` — the effect, and what it
 *         moved and dropped. it is null on a default failure, where no link was made
 */
export const syncBootsForBrainDirs = async (
  input: { repoPath: string },
  context: ContextCli,
): Promise<{
  renders: BrainDirBootRender[];
  failures: BrainDirBootFailure[];
  symlink: BrainDirSyncSymlink | null;
}> => {
  const refsLinked = getAllLinkedRoleRefs({}, context);

  // the default brain dir; a throw is collected under the default scope
  const [defaultSettled] = await Promise.allSettled([
    syncDefaultBrainDir({ repoPath: input.repoPath, refsLinked }),
  ]);
  const defaultOutcome = asDefaultBrainDirOutcome({ settled: defaultSettled });

  // each active actor; its own failures are already collected per scope
  const actorOutcome = await syncActiveActorBrainDirs({
    repoPath: input.repoPath,
    refsLinked,
  });

  // the default leads, then each actor in order
  const defaultResult = asBrainDirSyncResult({ outcomes: [defaultOutcome] });
  return {
    renders: [...defaultResult.renders, ...actorOutcome.renders],
    failures: [...defaultResult.failures, ...actorOutcome.failures],
    symlink: defaultOutcome.symlink,
  };
};
