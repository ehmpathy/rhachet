import type { BrainHook } from '@src/domain.objects/BrainHook';
import type { BrainSpecifier } from '@src/domain.objects/BrainSpecifier';
import type { ContextCli } from '@src/domain.objects/ContextCli';

import { detectBrainReplsInRepo } from './detectBrainReplsInRepo';
import { getOneBrainHooksAdapterForSync } from './dispatch/getOneBrainHooksAdapterForSync';
import { pruneOrphanedRoleHooksFromOneBrain } from './pruneOrphanedRoleHooksFromOneBrain';

/**
 * .what = prunes orphaned role hooks from all detected brain repls
 * .why = orchestrates orphan cleanup across multiple brains
 */
export const pruneOrphanedRoleHooksFromAllBrains = async (
  input: {
    authorsDesired: Set<string>;
    brains?: BrainSpecifier[];
    configTargetDir?: string;
  },
  context: ContextCli,
): Promise<{
  removed: Array<{
    brain: BrainSpecifier;
    hooks: BrainHook[];
  }>;
}> => {
  // derive brain slugs
  const brainSlugs = input.brains ?? (await detectBrainReplsInRepo(context));

  const removed: Array<{
    brain: BrainSpecifier;
    hooks: BrainHook[];
  }> = [];

  // prune from each brain (the config write path may be an actor dir)
  for (const brain of brainSlugs) {
    //   for claude code, the role hooks live as rules in the dispatch manifest
    const adapter = (
      await getOneBrainHooksAdapterForSync(
        { brain, configTargetDir: input.configTargetDir ?? null },
        context,
      )
    )?.adapter;

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
