import type { BrainSlug } from '@src/domain.objects/BrainSlug';
import type { ContextCli } from '@src/domain.objects/ContextCli';
import { emitBrainDirOutsideRepoWarns } from '@src/domain.operations/actor/enrolled/emitBrainDirOutsideRepoWarns';
import { getBrainOndiskDir } from '@src/domain.operations/actor/enrolled/getBrainOndiskDir';
import { getOneRepoActorOndiskDir } from '@src/domain.operations/actor/enrolled/getOneRepoActorOndiskDir';
import type { BrainDirSyncSymlink } from '@src/domain.operations/boot/asBrainDirSyncReportLines';
import { getSupportedBrainCommand } from '@src/domain.operations/brain/getSupportedBrainCommand';
import { assertBrainCliVersionFloor } from '@src/domain.operations/enroll/assertBrainCliVersionFloor';

import { relative } from 'node:path';
import { asBootGuardReportLines } from './asBootGuardReportLines';
import { asBrainDirSyncFailuresSplit } from './asBrainDirSyncFailuresSplit';
import { asExitCodeForBrainDirSyncFailures } from './asExitCodeForBrainDirSyncFailures';
import { emitBootGuardReportLines } from './emitBootGuardReportLines';
import { emitBrainDirBootFailureLines } from './emitBrainDirBootFailureLines';
import { emitBrainDirSyncReports } from './emitBrainDirSyncReports';
import { findsertRepoThisRoleAnyBootGuard } from './findsertRepoThisRoleAnyBootGuard';
import { isRepoActorRendered } from './isRepoActorRendered';
import { syncBootsForBrainDirs } from './syncBootsForBrainDirs';

/**
 * .what = the brain whose cli reads `<repo>/.claude`
 * .why = the repo brain dir is the config dir an UNENROLLED cli loads, and that cli is
 *   the reader of every corpus this sweep writes. so the floor this sweep holds is that
 *   reader's floor — a distinct fact from the brain an `enroll` falls back to, which is
 *   the enrolled clone's (`define.brain-dir-repo-vs-actor`)
 */
const REPO_BRAIN_DIR_READER: BrainSlug = 'claude';

/**
 * .what = sync every brain dir, print one treestruct per brain dir this run CHANGED and one
 *         named failure per corpus not written, and return the exit code the caller owes
 * .why = init, upgrade and roles link each end the same way; one call keeps their output
 *        and their exit codes identical
 *
 * .note = a sync that changed naught prints naught. success is not news — either it halts,
 *   or it is silent — and every line here sits between two adjacent treestructs, so a
 *   census nobody acts on reads as debug chatter (`rule.require.treestruct-output`)
 *
 * .note = `repoActorRendered` gates the hook sync: a repo whose repo actor render failed keeps
 *         its role boot hooks, so it always holds one of the two: the old boot hooks, or a fresh
 *         boot.md with the hooks derived from it
 */
export const syncAndReportBrainDirBoots = async (
  input: {
    repoPath: string;
    env: NodeJS.ProcessEnv;
    symlinkPrior?: BrainDirSyncSymlink | null;
  },
  context: ContextCli,
): Promise<{ exitCode: 0 | 1 | 2; repoActorRendered: boolean }> => {
  // a cli below the floor lacks the claudeMdExcludes and dynamic-section flags the boot
  // rests on, so it would load the WRONG corpus in silence. refuse before the write, in
  // the same shape an enroll refuses before the spawn (F2)
  //
  // an ABSENT cli is permitted here, and only here: this sweep writes a corpus for a LATER
  // reader, so with no cli on this host there is no reader, the floor binds nobody, and a
  // refusal would block an otherwise-correct write (a ci box that installs no cli, above all)
  assertBrainCliVersionFloor({
    bin: getSupportedBrainCommand({ brain: REPO_BRAIN_DIR_READER }).command,
    env: input.env,
    onAbsent: 'permit',
  });

  // findsert the repo's own boot guards BEFORE the render, so the render reads the budget.
  //   one treestruct, printed only where a guard was created
  const guard = findsertRepoThisRoleAnyBootGuard({ repoPath: input.repoPath });
  emitBootGuardReportLines({ lines: asBootGuardReportLines({ guard }) });

  const {
    renders,
    failures: failuresAll,
    symlink,
  } = await syncBootsForBrainDirs(
    { repoPath: input.repoPath, symlinkPrior: input.symlinkPrior },
    context,
  );

  // a brain dir that lands outside the repo was skipped, never written: a `⚠️` block, not
  //   a failure, so it sets no exit code (`assertBrainDirInsideRepo`)
  const { failures, skips } = asBrainDirSyncFailuresSplit({
    failures: failuresAll,
  });
  emitBrainDirOutsideRepoWarns({ skips });

  // one treestruct per brain dir this run CHANGED, on stdout
  emitBrainDirSyncReports({
    renders,
    symlink,
    repoActorBrainDirRel: relative(
      input.repoPath,
      getBrainOndiskDir({
        actorDir: getOneRepoActorOndiskDir({ repoPath: input.repoPath }),
      }),
    ),
  });

  // one named failure per corpus not written, on stderr
  emitBrainDirBootFailureLines({ failures });

  // .note = the two read different lists on purpose: a skip sets no exit code, yet a skipped
  //   repo actor did not render, so the hook sync must still keep its role boot hooks
  return {
    exitCode: asExitCodeForBrainDirSyncFailures({ failures }),
    repoActorRendered: isRepoActorRendered({ failures: failuresAll }),
  };
};
