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
 */
export const setHookDispatchersForTarget = async (
  input: { brains: BrainSpecifier[] | null; configTargetDir: string | null },
  context: ContextCli,
): Promise<void> => {
  const brains = input.brains ?? (await detectBrainReplsInRepo(context));
  for (const brain of brains) {
    const found = await getOneBrainHooksAdapterForSync(
      { brain, configTargetDir: input.configTargetDir },
      context,
    );
    if (!found?.dispatch) continue;
    const rules =
      (await getOneHookDispatchManifest({ path: found.dispatch.manifestPath }))
        ?.rules ?? [];
    await setHookDispatchersViaAdapter({
      adapter: found.dispatch.adapterOfBrain,
      rules,
      manifestPathRel: relative(context.cwd, found.dispatch.manifestPath),
    });
  }
};
