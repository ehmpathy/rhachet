import type { BrainHooksAdapter } from '@src/domain.objects/BrainHooksAdapter';
import type { BrainSpecifier } from '@src/domain.objects/BrainSpecifier';
import type { ContextCli } from '@src/domain.objects/ContextCli';

import { genBrainHooksAdapterViaDispatchManifest } from './genBrainHooksAdapterViaDispatchManifest';
import { getOneBrainHookDispatchOfTarget } from './getOneBrainHookDispatchOfTarget';
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
  const found = await getOneBrainHookDispatchOfTarget(input, context);
  if (!found) return null;
  const { adapterOfBrain, manifestPath } = found;
  if (!manifestPath) return { adapter: adapterOfBrain, dispatch: null };

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
