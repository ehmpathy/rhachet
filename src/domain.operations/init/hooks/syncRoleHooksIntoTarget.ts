import type { BrainSpecifier } from '@src/domain.objects/BrainSpecifier';
import type { ContextCli } from '@src/domain.objects/ContextCli';
import type { HasRepo } from '@src/domain.objects/HasRepo';
import type { Role } from '@src/domain.objects/Role';
import {
  type HookDispatchSwap,
  setHookDispatchersForTarget,
} from '@src/domain.operations/brains/dispatch/setHookDispatchersForTarget';
import {
  type HookDispatchManifestRepair,
  setHookDispatchManifestsRepairedForTarget,
} from '@src/domain.operations/brains/dispatch/setHookDispatchManifestsRepairedForTarget';
import { pruneOrphanedRoleHooksFromAllBrains } from '@src/domain.operations/brains/pruneOrphanedRoleHooksFromAllBrains';
import { syncAllRoleHooksIntoEachBrainRepl } from '@src/domain.operations/brains/syncAllRoleHooksIntoEachBrainRepl';

import { isActorHookSyncFault } from './isActorHookSyncFault';

/**
 * .what = repairs each corrupt manifest, prunes orphan role hooks, then syncs every role's hooks,
 *   into one brain config target
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
  repairs: HookDispatchManifestRepair[];
  pruneResult: Awaited<ReturnType<typeof pruneOrphanedRoleHooksFromAllBrains>>;
  syncResult: Awaited<ReturnType<typeof syncAllRoleHooksIntoEachBrainRepl>>;
  swaps: HookDispatchSwap[];
  faults: Array<{ error: Error }>;
}> => {
  const brains = input.brains ?? undefined;
  const configTargetDir = input.configTargetDir ?? undefined;

  // first, repair each manifest that holds a corrupt row: the prune, the sync and the swap each
  //   read it, and a dispatcher that met it names this very sync as the fix
  const repairResult = await withActorHookSyncFaultCaught(() =>
    setHookDispatchManifestsRepairedForTarget(
      { brains: input.brains, configTargetDir: input.configTargetDir },
      context,
    ),
  );
  if ('error' in repairResult)
    return {
      repairs: [],
      pruneResult: { removed: [] },
      syncResult: { applied: [], errors: [] },
      swaps: [],
      faults: [{ error: repairResult.error }],
    };
  const { repairs } = repairResult;

  // prune; a classified or fs fault is the target's, reported by the caller; all else rethrows
  const pruneResult = await withActorHookSyncFaultCaught(() =>
    pruneOrphanedRoleHooksFromAllBrains(
      { authorsDesired: input.authorsDesired, brains, configTargetDir },
      context,
    ),
  );
  if ('error' in pruneResult)
    return {
      repairs,
      pruneResult: { removed: [] },
      syncResult: { applied: [], errors: [] },
      swaps: [],
      faults: [{ error: pruneResult.error }],
    };

  // sync; a fault here keeps the prune's real removals in the report
  const syncResult = await withActorHookSyncFaultCaught(() =>
    syncAllRoleHooksIntoEachBrainRepl(
      { roles: input.roles, brains, configTargetDir },
      context,
    ),
  );
  if ('error' in syncResult)
    return {
      repairs,
      pruneResult,
      syncResult: { applied: [], errors: [] },
      swaps: [],
      faults: [{ error: syncResult.error }],
    };

  // then, with every manifest whole, swap each brain's per-rule hooks for its dispatchers;
  //   a fault here keeps the rules the sync already wrote in the report
  const swapResult = await withActorHookSyncFaultCaught(() =>
    setHookDispatchersForTarget(
      { brains: input.brains, configTargetDir: input.configTargetDir },
      context,
    ),
  );
  if ('error' in swapResult)
    return {
      repairs,
      pruneResult,
      syncResult,
      swaps: [],
      faults: [{ error: swapResult.error }],
    };

  // a brain that refused its dispatchers runs none of its rules, so each role synced into it
  //   reports that refusal, as the per-rule sync reported a refused write per role × brain
  return {
    repairs,
    pruneResult,
    syncResult: asSyncResultWithSwapErrors({
      syncResult,
      swapErrors: swapResult.errors,
    }),
    swaps: swapResult.swaps,
    faults: asFaultsOfBrainsUnsynced({
      syncResult,
      swapErrors: swapResult.errors,
    }),
  };
};

/**
 * .what = run one step; an allowlisted fault comes back as `{ error }`, all else rethrows
 * .why = prune, sync and swap each catch the same faults, by the one allowlist
 *   (`isActorHookSyncFault`)
 */
const withActorHookSyncFaultCaught = async <T>(
  step: () => Promise<T>,
): Promise<T | { error: Error }> => {
  try {
    return await step();
  } catch (error) {
    if (!isActorHookSyncFault(error)) throw error;
    return { error };
  }
};

/**
 * .what = the faults of each refused brain that no role was synced into
 * .why = with no role to name the refusal, it still reports, as a fault of the target
 */
const asFaultsOfBrainsUnsynced = (input: {
  syncResult: Awaited<ReturnType<typeof syncAllRoleHooksIntoEachBrainRepl>>;
  swapErrors: Array<{ brain: BrainSpecifier; error: Error }>;
}): Array<{ error: Error }> => {
  const brainsSynced = new Set(
    input.syncResult.applied.map((applied) => applied.brain),
  );
  return input.swapErrors
    .filter(({ brain }) => !brainsSynced.has(brain))
    .map(({ error }) => ({ error }));
};

/**
 * .what = the sync result with each role applied into a refused brain moved to its errors
 * .why = the rules of a brain whose dispatchers did not land never run, so the report must not
 *   count them as created; it names the refusal per role, the row a human already reads
 */
const asSyncResultWithSwapErrors = (input: {
  syncResult: Awaited<ReturnType<typeof syncAllRoleHooksIntoEachBrainRepl>>;
  swapErrors: Array<{ brain: BrainSpecifier; error: Error }>;
}): Awaited<ReturnType<typeof syncAllRoleHooksIntoEachBrainRepl>> => {
  const errorOfBrain = new Map(
    input.swapErrors.map(({ brain, error }) => [brain, error]),
  );
  const appliedKept = input.syncResult.applied.filter(
    (applied) => !errorOfBrain.has(applied.brain),
  );
  const appliedRefused = input.syncResult.applied.flatMap((applied) => {
    const error = errorOfBrain.get(applied.brain);
    return error ? [{ role: applied.role, brain: applied.brain, error }] : [];
  });
  return {
    applied: appliedKept,
    errors: [...input.syncResult.errors, ...appliedRefused],
  };
};
