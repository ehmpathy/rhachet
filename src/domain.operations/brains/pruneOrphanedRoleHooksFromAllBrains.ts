import type { BrainHook } from '@src/domain.objects/BrainHook';
import type { BrainSpecifier } from '@src/domain.objects/BrainSpecifier';
import type { ContextCli } from '@src/domain.objects/ContextCli';

import { getBrainHooksAdapterByConfigImplicit } from '../config/getBrainHooksAdapterByConfigImplicit';
import { detectBrainReplsInRepo } from './detectBrainReplsInRepo';
import { pruneOrphanedRoleHooksFromOneBrain } from './pruneOrphanedRoleHooksFromOneBrain';

/**
 * .what = prunes orphaned role hooks from all detected brain repls
 * .why = orchestrates orphan cleanup across multiple brains
 */
export const pruneOrphanedRoleHooksFromAllBrains = async (
  input: {
    authorsDesired: Set<string>;
    brains?: BrainSpecifier[];
  },
  context: ContextCli,
): Promise<{
  removed: Array<{
    brain: BrainSpecifier;
    hooks: BrainHook[];
  }>;
}> => {
  // resolve brain slugs
  const brainSlugs = input.brains ?? (await detectBrainReplsInRepo(context));

  const removed: Array<{
    brain: BrainSpecifier;
    hooks: BrainHook[];
  }> = [];

  // prune from each brain
  for (const brain of brainSlugs) {
    const adapter = await getBrainHooksAdapterByConfigImplicit(
      { brain },
      context,
    );

    // skip if no adapter for this brain
    if (!adapter) continue;

    const result = await pruneOrphanedRoleHooksFromOneBrain({
      adapter,
      authorsDesired: input.authorsDesired,
    });

    if (result.removed.length > 0) {
      removed.push({
        brain,
        hooks: result.removed,
      });
    }
  }

  return { removed };
};
