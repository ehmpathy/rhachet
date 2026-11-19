import type { BrainSpecifier } from '@src/domain.objects/BrainSpecifier';
import type { ContextCli } from '@src/domain.objects/ContextCli';
import { detectBrainReplsInRepo } from '@src/domain.operations/brains/detectBrainReplsInRepo';

import { relative } from 'node:path';
import { asRuleCountsByEvent } from './asRuleCountsByEvent';
import { getOneBrainHooksAdapterForSync } from './getOneBrainHooksAdapterForSync';
import { setHookDispatchersViaAdapter } from './setHookDispatchersViaAdapter';
import { setHookDispatchManifestRederived } from './setHookDispatchManifestRederived';

/**
 * .what = after the rules are synced into each manifest, hand each brain its dispatcher hooks
 * .why = the swap from one hook per rule to one hook per event lands in this one step, after
 *   the manifest it names is whole
 *
 * .note = each rule's file fields derive again first (`setHookDispatchManifestRederived`), so
 *   a moved file or a changed shebang reaches the row even when its declared hook is unchanged
 * .note = a brain with no dispatch (any brain but claude code) is left to its own adapter
 * .note = a brain whose adapter refuses the write is returned in `errors`, as the per-rule sync
 *   returns a refused write per role × brain; the caller reports it, and the other brains still
 *   get their dispatchers
 */
export const setHookDispatchersForTarget = async (
  input: { brains: BrainSpecifier[] | null; configTargetDir: string | null },
  context: ContextCli,
): Promise<{
  errors: Array<{ brain: BrainSpecifier; error: Error }>;
  swaps: HookDispatchSwap[];
}> => {
  const brains = input.brains ?? (await detectBrainReplsInRepo(context));
  // .note = deliberate mutation — one brain at a time, in order; both lists are local
  const errors: Array<{ brain: BrainSpecifier; error: Error }> = [];
  const swaps: HookDispatchSwap[] = [];
  for (const brain of brains) {
    const found = await getOneBrainHooksAdapterForSync(
      { brain, configTargetDir: input.configTargetDir },
      context,
    );
    if (!found?.dispatch) continue;
    const dispatch = found.dispatch;

    // derive each rule's file fields again, then hand the brain its dispatchers; a refused
    //   write is this brain's, reported by the caller
    try {
      const { rules } = await setHookDispatchManifestRederived({
        manifestPath: dispatch.manifestPath,
        repoPath: context.cwd,
      });
      const manifestPathRel = relative(context.cwd, dispatch.manifestPath);
      const swap = await setHookDispatchersViaAdapter({
        adapter: dispatch.adapterOfBrain,
        rules,
        manifestPathRel,
      });
      swaps.push({
        brain,
        rules: rules.length,
        rulesByEvent: asRuleCountsByEvent({ rules }),
        manifestPathRel,
        ...swap,
      });
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      errors.push({ brain, error });
    }
  }
  return { errors, swaps };
};

/**
 * .what = what one brain's swap wrote: its rule count, its dispatcher count, and what moved
 * .why = the sync reports the shape it wrote, so a human sees `N rules → M dispatchers` and the
 *   role hooks that left the settings, never a silent `no changes needed`
 */
export interface HookDispatchSwap {
  brain: BrainSpecifier;
  rules: number;
  /** each claude event's rule count, in the order the manifest first names the event */
  rulesByEvent: Array<{ event: string; rules: number }>;
  manifestPathRel: string;
  dispatchers: number;
  dispatchersSet: number;
  roleHooksTakenBack: number;
}
