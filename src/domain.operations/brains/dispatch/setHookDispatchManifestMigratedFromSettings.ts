import type { BrainHooksAdapter } from '@src/domain.objects/BrainHooksAdapter';
import { isHookAuthorOfRole } from '@src/domain.operations/brains/isHookAuthorOfRole';

import { getOneHookDispatchManifest } from './getOneHookDispatchManifest';
import { getOneHookDispatchRuleOfBrainHook } from './getOneHookDispatchRuleOfBrainHook';
import { setHookDispatchManifest } from './setHookDispatchManifest';

/**
 * .what = the one-time migration onto the dispatcher: where no manifest is, write one from each
 *   role hook the brain's settings still hold
 * .why = the first sync after the switch diffs against what claude ran until then, so a role hook
 *   no longer declared reports as deleted and one still declared reports unchanged. the
 *   dispatcher step then takes each one out of the settings
 *
 * .note = a findsert of the manifest itself: a manifest already in place is never touched, so it
 *   writes once per brain dir. it runs as an explicit step before the manifest adapter is used,
 *   so the adapter's reads stay pure
 * .note = `repoPath` is where each rule's file is looked up — the repo root
 */
export const setHookDispatchManifestMigratedFromSettings = async (input: {
  adapterOfBrain: BrainHooksAdapter;
  manifestPath: string;
  repoPath: string;
}): Promise<{ migrated: boolean }> => {
  // a manifest in place means the migration already ran
  const found = await getOneHookDispatchManifest({ path: input.manifestPath });
  if (found) return { migrated: false };

  // each role-authored settings hook becomes a rule; a hand-added hook stays out
  const hooks = await input.adapterOfBrain.dao.get.all();
  const rules = hooks
    .filter((hook) => isHookAuthorOfRole({ author: hook.author }))
    .map((hook) =>
      getOneHookDispatchRuleOfBrainHook({ hook, repoPath: input.repoPath }),
    );
  await setHookDispatchManifest({ path: input.manifestPath, rules });
  return { migrated: true };
};
