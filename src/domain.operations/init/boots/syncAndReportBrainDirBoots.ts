import type { BrainSlug } from '@src/domain.objects/BrainSlug';
import type { ContextCli } from '@src/domain.objects/ContextCli';
import { getBrainOndiskDir } from '@src/domain.operations/actor/enrolled/getBrainOndiskDir';
import { getDefaultActorOndiskDir } from '@src/domain.operations/actor/enrolled/getDefaultActorOndiskDir';
import { asBrainDirBootFailureLines } from '@src/domain.operations/boot/asBrainDirBootFailureLines';
import { asBrainDirSyncReportLines } from '@src/domain.operations/boot/asBrainDirSyncReportLines';
import { getSupportedBrainCommand } from '@src/domain.operations/brain/getSupportedBrainCommand';
import { assertBrainCliVersionFloor } from '@src/domain.operations/enroll/assertBrainCliVersionFloor';

import { relative } from 'node:path';
import { asExitCodeForBrainDirSyncFailures } from './asExitCodeForBrainDirSyncFailures';
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
 * .note = `defaultRendered` gates the hook sync: a repo whose default render failed keeps
 *         its role boot hooks, so it never holds neither
 */
export const syncAndReportBrainDirBoots = async (
  input: { repoPath: string; env: NodeJS.ProcessEnv },
  context: ContextCli,
): Promise<{ exitCode: 0 | 1 | 2; defaultRendered: boolean }> => {
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

  const { renders, failures, symlink } = await syncBootsForBrainDirs(
    { repoPath: input.repoPath },
    context,
  );

  // one treestruct per brain dir this run CHANGED, on stdout. only the default render has a
  //   `<repo>/.claude` link beneath it; an actor's brain dir is reached by its own path
  const defaultBrainDirRel = relative(
    input.repoPath,
    getBrainOndiskDir({
      actorDir: getDefaultActorOndiskDir({ repoPath: input.repoPath }),
    }),
  );
  //
  // 🌊 each tree closes on its own blank line, as every other block of this pipeline does
  //   (`execRoleLink`, the role delta, `🔭` hooks, `✨` summary). the next root then opens
  //   clean whether it is a second brain dir, the `🔭` hook sweep, or a `💡` tip — and a
  //   no-op tree prints naught, blank included, so silence stays silent
  for (const render of renders) {
    const lines = asBrainDirSyncReportLines({
      render,
      symlink: render.scope.kind === 'default' ? symlink : null,
      defaultBrainDirRel,
    });
    if (lines.length === 0) continue;
    for (const line of lines) console.log(line);
    console.log('');
  }

  // one named failure per corpus not written, on stderr
  for (const failure of failures)
    for (const line of asBrainDirBootFailureLines({ failure }))
      console.error(line);

  return {
    exitCode: asExitCodeForBrainDirSyncFailures({ failures }),
    defaultRendered: !failures.some(
      (failure) => failure.scope.kind === 'default',
    ),
  };
};
