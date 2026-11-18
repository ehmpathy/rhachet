import type { HookDispatchRule } from '@src/domain.objects/HookDispatchRule';
import { withAbsentAsNull } from '@src/infra/withAbsentAsNull';

import { readFileSync } from 'node:fs';
import { asHookDispatchRulesFromManifestText } from './asHookDispatchRulesFromManifestText';

/**
 * .what = the rules of the manifest at a path, or null when no manifest is there
 * .why = the sync and the per-actor derive both read it; absence is the one expected fault
 */
export const getOneHookDispatchManifest = async (input: {
  path: string;
}): Promise<{ rules: HookDispatchRule[] } | null> => {
  const text = withAbsentAsNull({
    read: () => readFileSync(input.path, 'utf-8'),
  });
  if (text === null) return null;
  return {
    rules: asHookDispatchRulesFromManifestText({ text, path: input.path }),
  };
};
