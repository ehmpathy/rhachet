import type { ClaudeCodeSettings } from '@src/_topublish/rhachet-brains-anthropic/src/hooks/config.dao';
import { CLONE_ENV_KEYS } from '@src/utils/cloneEnvKeys';

/**
 * .what = the settings with every clone identity key dropped from its `env` map
 * .why =
 *   - claude hands a settings `env` map to every tool shell it opens. the repo actor's
 *     `settings.of.repo.json` is the source of each actor's `settings.of.repo.json`, the
 *     file a clone reads at the `--settings` rank, so a `RHACHET_CLONE_DEPTH` there would
 *     overwrite the depth the spawn injected and let a depth-1 clone read as top-level —
 *     the reset the limit forbids
 *   - a clone's identity is minted by its spawn, never by a config file. so the
 *     artifact carries none of the keys, whoever wrote them into the repo settings
 *
 * .note = an `env` map left empty is dropped, so a repo with no such key renders
 *   the same artifact as before
 */
export const asSettingsWithoutCloneIdentityEnv = (input: {
  settings: ClaudeCodeSettings;
}): ClaudeCodeSettings => {
  // a settings file with no env map has naught to strip
  const env = input.settings.env;
  if (!isEnvMap(env)) return input.settings;

  // keep each key that is not a clone identity key
  const identityKeys: string[] = Object.values(CLONE_ENV_KEYS);
  const envKept = Object.fromEntries(
    Object.entries(env).filter(([key]) => !identityKeys.includes(key)),
  );

  // drop the map once it is empty, else keep what is left
  const { env: _envPrior, ...settingsRest } = input.settings;
  if (Object.keys(envKept).length === 0) return settingsRest;
  return { ...settingsRest, env: envKept };
};

/**
 * .what = whether a settings value is an `env` map — a plain object of values
 * .why = `ClaudeCodeSettings` types every non-hook key as `unknown`
 */
const isEnvMap = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
