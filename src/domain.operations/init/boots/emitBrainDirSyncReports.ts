import {
  asBrainDirSyncReportLines,
  type BrainDirSyncSymlink,
} from '@src/domain.operations/boot/asBrainDirSyncReportLines';

import type { syncBootsForBrainDirs } from './syncBootsForBrainDirs';

/**
 * .what = print one treestruct per brain dir this run changed, each closed by its blank line
 * .why = each tree closes on its own blank line, as every other block of the init pipeline
 *   does, so the next root opens clean; a no-op tree prints naught, blank included
 * .note = only the repo actor's render has a `<repo>/.claude` link beneath it; an actor's
 *   brain dir is reached by its own path
 */
export const emitBrainDirSyncReports = (input: {
  renders: Awaited<ReturnType<typeof syncBootsForBrainDirs>>['renders'];
  symlink: BrainDirSyncSymlink | null;
  repoActorBrainDirRel: string;
}): void => {
  for (const render of input.renders) {
    const lines = asBrainDirSyncReportLines({
      render,
      symlink: render.scope.kind === 'repo' ? input.symlink : null,
      repoActorBrainDirRel: input.repoActorBrainDirRel,
    });
    if (lines.length === 0) continue;
    for (const line of lines) console.log(line);
    console.log('');
  }
};
