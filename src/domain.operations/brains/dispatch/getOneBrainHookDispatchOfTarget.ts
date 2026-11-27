import type { BrainHooksAdapter } from '@src/domain.objects/BrainHooksAdapter';
import type { BrainSpecifier } from '@src/domain.objects/BrainSpecifier';
import type { ContextCli } from '@src/domain.objects/ContextCli';
import { isBrainClaudeCode } from '@src/domain.operations/brains/isBrainClaudeCode';
import { getBrainHooksAdapterByConfigImplicit } from '@src/domain.operations/config/getBrainHooksAdapterByConfigImplicit';

import { join } from 'node:path';
import { getHookDispatchManifestPathOfBrainDir } from './getHookDispatchManifestPathOfBrainDir';

/**
 * .what = one brain's own hooks adapter, and the path of its dispatch manifest (null for a brain
 *   with no dispatch)
 * .why = the dispatcher step and the manifest repair need the brain's settings and manifest path,
 *   never the one-time migration: a read here writes naught, so a repo with no manifest stays so
 *
 * .note = `getOneBrainHooksAdapterForSync` composes this with the migration, for the role hook sync
 */
export const getOneBrainHookDispatchOfTarget = async (
  input: { brain: BrainSpecifier; configTargetDir: string | null },
  context: ContextCli,
): Promise<{
  adapterOfBrain: BrainHooksAdapter;
  manifestPath: string | null;
} | null> => {
  // .note = the config lookup keeps its extant optional input; null crosses to it as absent
  const adapterOfBrain = await getBrainHooksAdapterByConfigImplicit(
    { brain: input.brain, configTargetDir: input.configTargetDir ?? undefined },
    context,
  );
  if (!adapterOfBrain) return null;
  if (!isBrainClaudeCode({ brain: input.brain }))
    return { adapterOfBrain, manifestPath: null };

  // claude code: the rules live in the manifest beside the settings the adapter writes
  const manifestPath = getHookDispatchManifestPathOfBrainDir({
    brainDir: join(input.configTargetDir ?? context.cwd, '.claude'),
  });
  return { adapterOfBrain, manifestPath };
};
