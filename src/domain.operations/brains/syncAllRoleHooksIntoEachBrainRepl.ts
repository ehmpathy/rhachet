import type { BrainHook } from '@src/domain.objects/BrainHook';
import type { BrainSpecifier } from '@src/domain.objects/BrainSpecifier';
import type { HasRepo } from '@src/domain.objects/HasRepo';
import type { Role } from '@src/domain.objects/Role';

import { getBrainHooksAdapterByConfigImplicit } from '../config/getBrainHooksAdapterByConfigImplicit';
import { detectBrainReplsInRepo } from './detectBrainReplsInRepo';
import { syncOneRoleHooksIntoOneBrainRepl } from './syncOneRoleHooksIntoOneBrainRepl';

/**
 * .what = syncs all role hooks into each detected brain repl
 * .why = orchestrates hook sync across multiple brains and roles
 */
export const syncAllRoleHooksIntoEachBrainRepl = async (input: {
  roles: HasRepo<Role>[];
  repoPath: string;
  brains?: BrainSpecifier[];
}): Promise<{
  applied: Array<{
    role: HasRepo<Role>;
    brain: BrainSpecifier;
    hooks: {
      created: BrainHook[];
      updated: BrainHook[];
      deleted: BrainHook[];
      unchanged: BrainHook[];
    };
  }>;
  errors: Array<{
    role: HasRepo<Role>;
    brain: BrainSpecifier;
    error: Error;
  }>;
}> => {
  const { roles, repoPath, brains } = input;

  // resolve brain slugs
  const brainSlugs = brains ?? (await detectBrainReplsInRepo({ repoPath }));

  const applied: Array<{
    role: HasRepo<Role>;
    brain: BrainSpecifier;
    hooks: {
      created: BrainHook[];
      updated: BrainHook[];
      deleted: BrainHook[];
      unchanged: BrainHook[];
    };
  }> = [];
  const errors: Array<{
    role: HasRepo<Role>;
    brain: BrainSpecifier;
    error: Error;
  }> = [];

  // sync each role × brain combination
  for (const role of roles) {
    for (const brain of brainSlugs) {
      try {
        // resolve adapter for this brain
        const adapter = await getBrainHooksAdapterByConfigImplicit({
          brain,
          repoPath,
        });

        if (!adapter) {
          errors.push({
            role,
            brain,
            error: new Error(`no adapter found for brain '${brain}'`),
          });
          continue;
        }

        // sync role hooks
        const result = await syncOneRoleHooksIntoOneBrainRepl({
          role,
          adapter,
        });

        applied.push({
          role,
          brain,
          ...result,
        });
      } catch (error) {
        errors.push({
          role,
          brain,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    }
  }

  return { applied, errors };
};
