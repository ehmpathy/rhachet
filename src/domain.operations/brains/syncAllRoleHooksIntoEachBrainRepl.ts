import type { BrainHook } from '@src/domain.objects/BrainHook';
import type { BrainHooksAdapter } from '@src/domain.objects/BrainHooksAdapter';
import type { BrainSpecifier } from '@src/domain.objects/BrainSpecifier';
import type { ContextCli } from '@src/domain.objects/ContextCli';
import type { HasRepo } from '@src/domain.objects/HasRepo';
import type { Role } from '@src/domain.objects/Role';
import { getBrainHooksAdapterByConfigImplicit } from '@src/domain.operations/config/getBrainHooksAdapterByConfigImplicit';

import { detectBrainReplsInRepo } from './detectBrainReplsInRepo';
import { getOneBrainHooksAdapterForSync } from './dispatch/getOneBrainHooksAdapterForSync';
import { syncOneRoleHooksIntoOneBrainRepl } from './syncOneRoleHooksIntoOneBrainRepl';

/**
 * .what = syncs all role hooks into each detected brain repl
 * .why = orchestrates hook sync across multiple brains and roles
 *
 * .note = `hooksVia: 'brain'` renders each role hook as its own brain hook, for a caller that
 *   reads the hooks back in-mem (`getAllHooksOfLinkedRolesForClaudeCode`); a dispatch render
 *   there would park the rules in a manifest the caller never reads
 */
export const syncAllRoleHooksIntoEachBrainRepl = async (
  input: {
    roles: HasRepo<Role>[];
    brains?: BrainSpecifier[];
    configTargetDir?: string;
    hooksVia?: 'dispatch' | 'brain';
  },
  context: ContextCli,
): Promise<{
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
  // resolve brain slugs
  const brainSlugs = input.brains ?? (await detectBrainReplsInRepo(context));

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

  // derive each brain's adapter once (the config write path may be an actor dir); a lookup
  //   that throws is kept as that brain's fault, recorded per role below as before
  //   .note = sequential, so an adapter's own console output stays in brain order
  //   .note = only when a role exists: no role, no lookup, as before
  // .note = deliberate mutation — the list grows one brain at a time, in order
  const adapters: Array<{
    adapter: BrainHooksAdapter | null;
    fault: unknown;
  }> = [];
  if (input.roles.length > 0)
    for (const brain of brainSlugs) {
      try {
        // via dispatch (the default), claude code's role hooks land as rules in the dispatch
        //   manifest; via brain, every brain writes its own per-rule hooks, as before dispatch
        const adapter =
          input.hooksVia === 'brain'
            ? await getBrainHooksAdapterByConfigImplicit(
                { brain, configTargetDir: input.configTargetDir },
                context,
              )
            : ((
                await getOneBrainHooksAdapterForSync(
                  { brain, configTargetDir: input.configTargetDir ?? null },
                  context,
                )
              )?.adapter ?? null);
        adapters.push({ adapter, fault: null });
      } catch (error) {
        adapters.push({ adapter: null, fault: error });
      }
    }

  // sync each role × brain combination
  for (const role of input.roles) {
    for (const [index, brain] of brainSlugs.entries()) {
      try {
        const { adapter, fault } = adapters[index] ?? {
          adapter: null,
          fault: null,
        };
        if (fault) throw fault;

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
