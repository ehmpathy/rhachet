import type { ClaudeCodeSettings } from '@src/domain.operations/brains/claudeCodeSettings';

import { HOOK_DISPATCH } from './constants';

/**
 * .what = whether claude settings hold at least one hook dispatcher
 * .why = settings that name a dispatcher run no rule without its manifest; a reader that finds
 *   one with no manifest beside it must refuse, never pass the settings through hook-less
 */
export const isSettingsWithHookDispatchers = (input: {
  settings: ClaudeCodeSettings;
}): boolean =>
  Object.values(input.settings.hooks ?? {}).some((entries) =>
    (entries ?? []).some((entry) =>
      entry.hooks.some((hook) => hook.author === HOOK_DISPATCH.author),
    ),
  );
