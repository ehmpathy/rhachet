import type { ClaudeCodeSettings } from '@src/domain.operations/brains/claudeCodeSettings';

/**
 * .what = the settings with claude's commit and pr attribution set to empty
 * .why = claude builds its co-author trailer + pr footer reminder from `attribution`, and emits
 *   none when `commit` and `pr` are both empty; `--system-prompt ''` cannot reach that reminder
 * .note = the object form, never `attribution: false`, which would also set `sessionUrl`;
 *   `includeCoAuthoredBy` is deprecated and is not written
 * .note = other subkeys and the key's position are kept, so a rewrite of an off file is a no-op
 */
export const asSettingsWithAttributionOff = (input: {
  settings: ClaudeCodeSettings;
}): ClaudeCodeSettings => {
  // keep the subkeys of an object-form attribution; a boolean or absent value has none
  const attributionPrior = input.settings.attribution;
  const subkeysKept = isAttributionObject(attributionPrior)
    ? attributionPrior
    : {};

  // empty the two texts claude would otherwise inject
  return {
    ...input.settings,
    attribution: { ...subkeysKept, commit: '', pr: '' },
  };
};

/**
 * .what = whether a settings value is an object-form `attribution`
 * .why = `ClaudeCodeSettings` types every non-hook key as `unknown`
 */
const isAttributionObject = (
  value: unknown,
): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
