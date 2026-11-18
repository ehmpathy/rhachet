import type { BrainSpecifier } from '@src/domain.objects/BrainSpecifier';
import type { ContextCli } from '@src/domain.objects/ContextCli';
import { detectBrainReplsInRepo } from '@src/domain.operations/brains/detectBrainReplsInRepo';

import { relative } from 'node:path';
import { getOneBrainHooksAdapterForSync } from './getOneBrainHooksAdapterForSync';
import { getOneHookDispatchManifest } from './getOneHookDispatchManifest';
import { setHookDispatchersViaAdapter } from './setHookDispatchersViaAdapter';

/**
 * .what = after the rules are synced into each manifest, hand each brain its dispatcher hooks
 * .why = the swap from one hook per rule to one hook per event lands in this one step, after
 *   the manifest it names is whole
 *
 * .note = a brain with no dispatch (any brain but claude code) is left to its own adapter
 * .note = a brain whose adapter refuses the write is returned in `errors`, as the per-rule sync
 *   returns a refused write per role × brain; the caller reports it, and the other brains still
 *   get their dispatchers
 */
export const setHookDispatchersForTarget = async (
  input: { brains: BrainSpecifier[] | null; configTargetDir: string | null },
  context: ContextCli,
): Promise<{ errors: Array<{ brain: BrainSpecifier; error: Error }> }> => {
  const brains = input.brains ?? (await detectBrainReplsInRepo(context));
  const errors: Array<{ brain: BrainSpecifier; error: Error }> = [];
  for (const brain of brains) {
    const found = await getOneBrainHooksAdapterForSync(
      { brain, configTargetDir: input.configTargetDir },
      context,
    );
    if (!found?.dispatch) continue;
    const rules =
      (await getOneHookDispatchManifest({ path: found.dispatch.manifestPath }))
        ?.rules ?? [];

    // hand the brain its dispatchers; a refused write is this brain's, reported by the caller
    try {
      await setHookDispatchersViaAdapter({
        adapter: found.dispatch.adapterOfBrain,
        rules,
        manifestPathRel: relative(context.cwd, found.dispatch.manifestPath),
      });
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      errors.push({ brain, error });
    }
  }
  return { errors };
};
