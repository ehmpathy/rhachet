import type { ContextCli } from '@src/domain.objects/ContextCli';
import type { BrainDirSyncSymlink } from '@src/domain.operations/boot/asBrainDirSyncReportLines';

import { syncBootsThenHooks } from './syncBootsThenHooks';

/**
 * .what = the boot + hook resync after a part-way fault; a fault of the resync itself is returned
 *   as a value, never thrown
 * .why = the caller rethrows the part-way fault, which names the failed role and the linked sets.
 *   a resync fault thrown here would replace it, so the human would lose the diagnosis exactly
 *   when it matters most; returned, the caller prints both, and the part-way fault sets the exit
 * .note = the fault is boxed as `{ error }`, so even a thrown `null` reads as a fault, never as
 *   a clean resync
 */
export const syncBootsThenHooksAfterPartWayFault = async (
  input: {
    repoPath: string;
    hooks: boolean | string[] | undefined;
    symlinkPrior: BrainDirSyncSymlink | null;
  },
  context: ContextCli,
): Promise<{ resyncFault: { error: unknown } | null }> => {
  // every resync fault is kept as a value: the caller prints it beside the part-way fault it rethrows
  try {
    await syncBootsThenHooks(input, context);
    return { resyncFault: null };
  } catch (error: unknown) {
    return { resyncFault: { error } };
  }
};
