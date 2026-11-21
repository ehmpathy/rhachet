import type { HookDispatchRule } from '@src/domain.objects/HookDispatchRule';
import { setFileAtomic } from '@src/infra/setFileAtomic';

import { asHookDispatchManifestText } from './asHookDispatchManifestText';

/**
 * .what = write the manifest at a path, whole, via temp + rename
 * .why = a dispatcher that starts mid-write reads the prior manifest or the next one, never half
 */
export const setHookDispatchManifest = async (input: {
  path: string;
  rules: HookDispatchRule[];
}): Promise<void> =>
  setFileAtomic({
    path: input.path,
    content: asHookDispatchManifestText({ rules: input.rules }),
  });
