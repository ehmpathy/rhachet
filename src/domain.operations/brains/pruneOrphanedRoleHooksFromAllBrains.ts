import type { BrainHook } from '@src/domain.objects/BrainHook';
import type { BrainSpecifier } from '@src/domain.objects/BrainSpecifier';

import { getBrainHooksAdapterByConfigImplicit } from '../config/getBrainHooksAdapterByConfigImplicit';
import { detectBrainReplsInRepo } from './detectBrainReplsInRepo';
import { pruneOrphanedRoleHooksFromOneBrain } from './pruneOrphanedRoleHooksFromOneBrain';

/**
 * .what = prunes orphaned role hooks from all detected brain repls
 * .why = orchestrates orphan cleanup across multiple brains
 */
export const pruneOrphanedRoleHooksFromAllBrains = async (input: {
  authorsDesired: Set<string>;
  repoPath: string;
  brains?: BrainSpecifier[];
}): Promise<{
  removed: Array<{
    brain: BrainSpecifier;
    hooks: BrainHook[];
  }>;
}> => {
  const { authorsDesired, repoPath, brains } = input;

  // resolve brain slugs
  const brainSlugs = brains ?? (await detectBrainReplsInRepo({ repoPath }));

  const removed: Array<{
    brain: BrainSpecifier;
    hooks: BrainHook[];
  }> = [];

  // prune from each brain
  for (const brain of brainSlugs) {
    const adapter = await getBrainHooksAdapterByConfigImplicit({
      brain,
      repoPath,
    });

    // skip if no adapter for this brain
    if (!adapter) continue;

    const result = await pruneOrphanedRoleHooksFromOneBrain({
      adapter,
      authorsDesired,
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
