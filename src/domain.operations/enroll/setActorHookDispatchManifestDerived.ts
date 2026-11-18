import type { ClaudeCodeSettings } from '@src/domain.operations/brains/claudeCodeSettings';
import { asSettingsWithHookDispatchers } from '@src/domain.operations/brains/dispatch/asSettingsWithHookDispatchers';
import { HOOK_DISPATCH } from '@src/domain.operations/brains/dispatch/constants';
import { getOneHookDispatchManifest } from '@src/domain.operations/brains/dispatch/getOneHookDispatchManifest';
import { setHookDispatchManifest } from '@src/domain.operations/brains/dispatch/setHookDispatchManifest';
import { asHookDispatchRulesForRoles } from '@src/domain.operations/enroll/asHookDispatchRulesForRoles';

import { join, relative } from 'node:path';

/**
 * .what = write one actor's dispatch manifest — the repo actor's, narrowed to the actor's roles
 *   — and return its settings with dispatchers that name that manifest
 * .why = the per-role narrow cuts rules by author, and the rules live in the manifest, so the
 *   cut lands there. a `--roles -driver` clone's dispatcher runs no driver rule, because its
 *   manifest holds none
 *
 * .note = with no repo actor manifest (a repo not yet synced to the dispatcher), the settings
 *   pass through as the author narrow left them
 * .note = the repo actor reads its own manifest; naught is narrowed or rewritten
 * .note = the manifest lands before the settings that name it, so a clone that spawns between
 *   the two writes never meets a dispatcher with no rules
 */
export const setActorHookDispatchManifestDerived = async (input: {
  settings: ClaudeCodeSettings;
  roles: string[];
  repoPath: string;
  repoActorBrainDir: string;
  actorBrainDir: string;
  isRepoActor: boolean;
}): Promise<ClaudeCodeSettings> => {
  if (input.isRepoActor) return input.settings;

  // read the source rules; absent → no dispatch to derive
  const source = await getOneHookDispatchManifest({
    path: join(input.repoActorBrainDir, HOOK_DISPATCH.manifest),
  });
  if (!source) return input.settings;

  // narrow the rules, write them, then name them from the settings
  const rules = asHookDispatchRulesForRoles({
    rules: source.rules,
    roles: input.roles,
  });
  const manifestPath = join(input.actorBrainDir, HOOK_DISPATCH.manifest);
  await setHookDispatchManifest({ path: manifestPath, rules });
  return asSettingsWithHookDispatchers({
    settings: input.settings,
    rules,
    manifestPathRel: relative(input.repoPath, manifestPath),
  });
};
