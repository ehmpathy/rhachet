import type { BrainHooksAdapter } from '@src/domain.objects/BrainHooksAdapter';
import type { BrainSpecifier } from '@src/domain.objects/BrainSpecifier';
import type { ContextCli } from '@src/domain.objects/ContextCli';
import { isBrainClaudeCode } from '@src/domain.operations/brains/isBrainClaudeCode';
import { getBrainHooksAdapterByConfigImplicit } from '@src/domain.operations/config/getBrainHooksAdapterByConfigImplicit';

import { join } from 'node:path';
import { genBrainHooksAdapterViaDispatchManifest } from './genBrainHooksAdapterViaDispatchManifest';
import { getHookDispatchManifestPathOfBrainDir } from './getHookDispatchManifestPathOfBrainDir';
import { setHookDispatchManifestMigratedFromSettings } from './setHookDispatchManifestMigratedFromSettings';

/**
 * .what = the hooks adapter the role hook sync writes through, for one brain
 * .why = for claude code, role hooks are rules in the dispatch manifest, one dispatcher hook per
 *   event is all claude sees; every other brain keeps its own adapter as is
 *
 * .note = also returns the brain's own adapter and the manifest path, so the caller can hand
 *   the brain its dispatcher hooks once the rules are written
 */
export const getOneBrainHooksAdapterForSync = async (
  input: { brain: BrainSpecifier; configTargetDir: string | null },
  context: ContextCli,
): Promise<{
  adapter: BrainHooksAdapter;
  dispatch: { adapterOfBrain: BrainHooksAdapter; manifestPath: string } | null;
} | null> => {
  // .note = the config lookup keeps its extant optional input; null crosses to it as absent
  const adapterOfBrain = await getBrainHooksAdapterByConfigImplicit(
    { brain: input.brain, configTargetDir: input.configTargetDir ?? undefined },
    context,
  );
  if (!adapterOfBrain) return null;
  if (!isBrainClaudeCode({ brain: input.brain }))
    return { adapter: adapterOfBrain, dispatch: null };

  // claude code: the rules live in the manifest beside the settings the adapter writes
  const manifestPath = getHookDispatchManifestPathOfBrainDir({
    brainDir: join(input.configTargetDir ?? context.cwd, '.claude'),
  });

  // the one-time migration: a brain dir with no manifest yet gets one from its settings' role hooks
  await setHookDispatchManifestMigratedFromSettings({
    adapterOfBrain,
    manifestPath,
    repoPath: context.cwd,
  });

  return {
    adapter: genBrainHooksAdapterViaDispatchManifest({
      adapter: adapterOfBrain,
      manifestPath,
      repoPath: context.cwd,
    }),
    dispatch: { adapterOfBrain, manifestPath },
  };
};
