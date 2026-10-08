import type { BrainSpecifier } from '@src/domain.objects/BrainSpecifier';
import type { ContextCli } from '@src/domain.objects/ContextCli';
import type { HasRepo } from '@src/domain.objects/HasRepo';
import type { Role } from '@src/domain.objects/Role';
import { pruneOrphanedRoleHooksFromAllBrains } from '@src/domain.operations/brains/pruneOrphanedRoleHooksFromAllBrains';
import { syncAllRoleHooksIntoEachBrainRepl } from '@src/domain.operations/brains/syncAllRoleHooksIntoEachBrainRepl';

import { isActorHookSyncFault } from './isActorHookSyncFault';

/**
 * .what = prunes orphan role hooks, then syncs every role's hooks, into one brain config target
 * .why = the root brain dir and each actor's brain dir take the identical prune + sync + catch,
 *   so the allowlist of faults a sweep survives is declared once (`isActorHookSyncFault`)
 * .note = `configTargetDir: null` targets the repo root; a path targets an actor's brain dir
 * .note = each step is caught on its own, so a sync fault keeps the removals the prune already
 *   wrote — the report states what landed beside what failed
 */
export const syncRoleHooksIntoTarget = async (
  input: {
    authorsDesired: Set<string>;
    roles: HasRepo<Role>[];
    brains: BrainSpecifier[] | null;
    configTargetDir: string | null;
  },
  context: ContextCli,
): Promise<{
  pruneResult: Awaited<ReturnType<typeof pruneOrphanedRoleHooksFromAllBrains>>;
  syncResult: Awaited<ReturnType<typeof syncAllRoleHooksIntoEachBrainRepl>>;
  faults: Array<{ error: Error }>;
}> => {
  const brains = input.brains ?? undefined;
  const configTargetDir = input.configTargetDir ?? undefined;

  // prune; a classified or fs fault is the target's, reported by the caller; all else rethrows
  const pruneResult = await (async () => {
    try {
      return await pruneOrphanedRoleHooksFromAllBrains(
        { authorsDesired: input.authorsDesired, brains, configTargetDir },
        context,
      );
    } catch (error) {
      if (!isActorHookSyncFault(error)) throw error;
      return { error };
    }
  })();
  if ('error' in pruneResult)
    return {
      pruneResult: { removed: [] },
      syncResult: { applied: [], errors: [] },
      faults: [{ error: pruneResult.error }],
    };

  // sync; a fault here keeps the prune's real removals in the report
  try {
    const syncResult = await syncAllRoleHooksIntoEachBrainRepl(
      { roles: input.roles, brains, configTargetDir },
      context,
    );
    return { pruneResult, syncResult, faults: [] };
  } catch (error) {
    if (!isActorHookSyncFault(error)) throw error;
    return {
      pruneResult,
      syncResult: { applied: [], errors: [] },
      faults: [{ error }],
    };
  }
};
