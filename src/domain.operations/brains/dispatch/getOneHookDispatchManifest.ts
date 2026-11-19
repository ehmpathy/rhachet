import type { HookDispatchRule } from '@src/domain.objects/HookDispatchRule';
import { withAbsentAsNull } from '@src/infra/withAbsentAsNull';

import { readFileSync } from 'node:fs';
import { asHookDispatchRulesFromManifestText } from './asHookDispatchRulesFromManifestText';

/**
 * .what = the rules of the manifest at a path, or null when no manifest is there
 * .why = the sync and the per-actor derive both read it; absence is the one expected fault
 * .note = the text comes back as read, so a writer can tell a manifest of an older text shape
 *   (no label lines, an older head) from one that already reads as it would write it
 */
export const getOneHookDispatchManifest = async (input: {
  path: string;
}): Promise<{ rules: HookDispatchRule[]; text: string } | null> => {
  const text = withAbsentAsNull({
    read: () => readFileSync(input.path, 'utf-8'),
  });
  if (text === null) return null;
  return {
    rules: asHookDispatchRulesFromManifestText({ text, path: input.path }),
    text,
  };
};
