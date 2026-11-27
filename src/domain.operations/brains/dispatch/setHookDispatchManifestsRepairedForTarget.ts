import type { BrainSpecifier } from '@src/domain.objects/BrainSpecifier';
import type { ContextCli } from '@src/domain.objects/ContextCli';
import { detectBrainReplsInRepo } from '@src/domain.operations/brains/detectBrainReplsInRepo';

import { relative } from 'node:path';
import { getOneBrainHookDispatchOfTarget } from './getOneBrainHookDispatchOfTarget';
import { setHookDispatchManifestRepaired } from './setHookDispatchManifestRepaired';

/**
 * .what = before a sync reads any manifest, repair each brain's manifest that holds a corrupt row
 * .why = the prune, the sync and the dispatcher step each read the manifest; a corrupt row there
 *   would refuse the very sync the dispatcher names as its fix
 *
 * .note = a manifest is never written where none is; a brain with no dispatch is skipped
 */
export const setHookDispatchManifestsRepairedForTarget = async (
  input: { brains: BrainSpecifier[] | null; configTargetDir: string | null },
  context: ContextCli,
): Promise<{ repairs: HookDispatchManifestRepair[] }> => {
  const brains = input.brains ?? (await detectBrainReplsInRepo(context));
  // .note = deliberate mutation — one brain at a time, in order; the list is local
  const repairs: HookDispatchManifestRepair[] = [];
  for (const brain of brains) {
    const found = await getOneBrainHookDispatchOfTarget(
      { brain, configTargetDir: input.configTargetDir },
      context,
    );
    if (!found?.manifestPath) continue;
    const { linesDropped } = await setHookDispatchManifestRepaired({
      manifestPath: found.manifestPath,
    });
    if (linesDropped === 0) continue;
    repairs.push({
      brain,
      manifestPathRel: relative(context.cwd, found.manifestPath),
      linesDropped,
    });
  }
  return { repairs };
};

/**
 * .what = one manifest the repair rewrote, and how many corrupt rows it dropped
 * .why = the sync names the rewrite, so a human sees which rows a corrupt file cost
 */
export interface HookDispatchManifestRepair {
  brain: BrainSpecifier;
  manifestPathRel: string;
  linesDropped: number;
}
