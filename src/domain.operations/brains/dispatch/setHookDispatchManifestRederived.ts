import type { HookDispatchRule } from '@src/domain.objects/HookDispatchRule';

import { asBrainHookOfHookDispatchRule } from './asBrainHookOfHookDispatchRule';
import { asHookDispatchManifestText } from './asHookDispatchManifestText';
import { getOneHookDispatchManifest } from './getOneHookDispatchManifest';
import { getOneHookDispatchRuleOfBrainHook } from './getOneHookDispatchRuleOfBrainHook';
import { setHookDispatchManifest } from './setHookDispatchManifest';

/**
 * .what = derive each manifest rule's file fields (kind, path, frame, args) again from its
 *   declared command, and rewrite the manifest only where one changed
 * .why = the sync diffs declared hooks, and a declared hook is unchanged when only its file moved
 *   or its shebang changed; its row would keep a stale kind or path, and a bash rule turned node
 *   would be sourced as bash. a fresh derive after every sync keeps each row true to its file
 *
 * .note = an absent manifest holds no rules; naught is written
 * .note = a manifest whose bytes already match is not rewritten, so a re-sync writes naught
 */
export const setHookDispatchManifestRederived = async (input: {
  manifestPath: string;
  repoPath: string;
}): Promise<{ rules: HookDispatchRule[] }> => {
  // read the rules as last written
  const manifest = await getOneHookDispatchManifest({
    path: input.manifestPath,
  });
  if (!manifest) return { rules: [] };

  // derive each one again, from the hook it was declared as
  const rules = manifest.rules.map((rule) =>
    getOneHookDispatchRuleOfBrainHook({
      hook: asBrainHookOfHookDispatchRule({ rule }),
      repoPath: input.repoPath,
    }),
  );

  // rewrite where a row changed, or where the file is of an older text shape (no label lines, an
  //   older head): the bytes on disk are compared, so a manifest always converges to what a sync writes
  const isChanged = asHookDispatchManifestText({ rules }) !== manifest.text;
  if (isChanged)
    await setHookDispatchManifest({ path: input.manifestPath, rules });
  return { rules };
};
