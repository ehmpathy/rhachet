import type { BrainSpecifier } from '@src/domain.objects/BrainSpecifier';
import type { ContextCli } from '@src/domain.objects/ContextCli';
import {
  type HookDispatchSwap,
  setHookDispatchersForTarget,
} from '@src/domain.operations/brains/dispatch/setHookDispatchersForTarget';
import {
  type HookDispatchManifestRepair,
  setHookDispatchManifestsRepairedForTarget,
} from '@src/domain.operations/brains/dispatch/setHookDispatchManifestsRepairedForTarget';

import { isActorHookSyncFault } from './isActorHookSyncFault';

/**
 * .what = repair each corrupt manifest, then settle each brain's dispatchers, into one target, for a
 *   sync whose linked roles hold no hook
 * .why = each event is wired whole (`*`), so a wire left at an absent or corrupt manifest refuses
 *   every tool; the sync that refusal names must settle it even when no role holds a hook
 *
 * .note = no manifest is written where none is, so a repo that never held a hook stays wire-less
 * .note = a stale role row in a manifest that reads is left as is: its prune is the role sync's
 * .note = each step is caught by the one allowlist the role sync uses (`isActorHookSyncFault`)
 */
export const syncHookDispatchersIntoTarget = async (
  input: { brains: BrainSpecifier[] | null; configTargetDir: string | null },
  context: ContextCli,
): Promise<{
  repairs: HookDispatchManifestRepair[];
  swaps: HookDispatchSwap[];
  faults: Array<{ error: Error }>;
}> => {
  // repair first, so the dispatcher step reads every manifest it meets
  const repairResult = await withActorHookSyncFaultCaught(() =>
    setHookDispatchManifestsRepairedForTarget(input, context),
  );
  if ('error' in repairResult)
    return { repairs: [], swaps: [], faults: [{ error: repairResult.error }] };

  // then settle the dispatchers: an absent manifest takes back its wires, a readable one keeps them
  const swapResult = await withActorHookSyncFaultCaught(() =>
    setHookDispatchersForTarget(input, context),
  );
  if ('error' in swapResult)
    return {
      repairs: repairResult.repairs,
      swaps: [],
      faults: [{ error: swapResult.error }],
    };
  return {
    repairs: repairResult.repairs,
    swaps: swapResult.swaps,
    faults: swapResult.errors.map(({ error }) => ({ error })),
  };
};

/**
 * .what = run one step; an allowlisted fault comes back as `{ error }`, all else rethrows
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
