import type { ActorOndisk } from '@src/domain.objects/ActorOndisk';
import { BrainCliEnrollmentManifest } from '@src/domain.objects/BrainCliEnrollmentManifest';
import { getActorOndiskDir } from '@src/domain.operations/actor/enrolled/getActorOndiskDir';
import { getBrainOndiskDir } from '@src/domain.operations/actor/enrolled/getBrainOndiskDir';
import { setBrainDirSettingsLayout } from '@src/domain.operations/actor/enrolled/setBrainDirSettingsLayout';
import { readClaudeCodeSettings } from '@src/domain.operations/brains/claudeCodeSettings';
import { asHookUniqueKey } from '@src/domain.operations/brains/dispatch/asHookUniqueKey';
import { HOOK_DISPATCH } from '@src/domain.operations/brains/dispatch/constants';
import { getHookDispatchManifestPathOfBrainDir } from '@src/domain.operations/brains/dispatch/getHookDispatchManifestPathOfBrainDir';
import { getOneHookDispatchManifest } from '@src/domain.operations/brains/dispatch/getOneHookDispatchManifest';
import { getHomeDir } from '@src/infra/getHomeDir';

import { dirname } from 'node:path';
import { genBrainCliConfigArtifact } from './genBrainCliConfigArtifact';

/**
 * .what = derive one enrolled actor's `settings.of.repo.json` from the repo actor's, and report
 *         its hooks before and after
 * .why = the same derivation enroll runs at spawn, so an actor's settings never drift from the
 *        repo actor's (usecase.9). it lives with enroll, whose derivation it re-runs, so a sweep
 *        over actors (init's hook sync) calls ONE operation here rather than compose the layout,
 *        the brain dir paths and the derivation itself. enroll reads actor, never the reverse
 *
 * .note = the hooks come back as two maps, keyed by identity (`asHookUniqueKey`) and valued by the
 *   whole hook body (matcher included); the caller tallies them in its own report vocabulary
 */
export const setActorSettingsDerived = async (input: {
  actor: ActorOndisk;
  repoPath: string;
}): Promise<{
  hooks: { before: Map<string, string>; after: Map<string, string> };
}> => {
  const brainDir = getBrainOndiskDir({
    actorDir: getActorOndiskDir({
      repoPath: input.repoPath,
      exid: input.actor.exid,
    }),
  });
  const before = await getAllHooksByKeyOfBrainDir({ brainDir });
  await setBrainDirSettingsLayout({
    repoPath: input.repoPath,
    brainDir,
    home: getHomeDir(),
  });
  await genBrainCliConfigArtifact({
    enrollment: new BrainCliEnrollmentManifest({
      brain: input.actor.brain,
      roles: input.actor.roles,
    }),
    exid: input.actor.exid,
    repoPath: input.repoPath,
  });
  const after = await getAllHooksByKeyOfBrainDir({ brainDir });
  return { hooks: { before, after } };
};

/**
 * .what = every hook that runs for a brain dir, keyed by identity (`asHookUniqueKey`), valued by its
 *         body (matcher and timeout): each settings hook but the dispatcher, plus each rule of
 *         the dispatch manifest beside it
 * .why = a before/after pair of these tallies what one derivation added, changed, and
 *        removed — a changed timeout or matcher keeps the key and moves the body. a role hook
 *        that moved from the settings into the manifest keeps its key and its body, so the
 *        move itself reads as no change
 * .note = a settings hook's timeout is in claude's unit, seconds, as the published claude
 *   adapter writes it; the manifest holds seconds too, so both read as written
 */
const getAllHooksByKeyOfBrainDir = async (input: {
  brainDir: string;
}): Promise<Map<string, string>> => {
  const settings = await readClaudeCodeSettings({
    from: dirname(input.brainDir),
  });
  const manifest = await getOneHookDispatchManifest({
    path: getHookDispatchManifestPathOfBrainDir({ brainDir: input.brainDir }),
  });
  const asBody = (body: { matcher: string | undefined; timeout: unknown }) =>
    JSON.stringify({ matcher: body.matcher || '*', timeout: body.timeout });
  return new Map([
    ...Object.entries(settings.hooks ?? {}).flatMap(([event, entries]) =>
      (entries ?? []).flatMap((entry) =>
        entry.hooks
          .filter((hook) => hook.author !== HOOK_DISPATCH.author)
          .map(
            (hook) =>
              [
                asHookUniqueKey({
                  hook: {
                    author: hook.author ?? '',
                    event,
                    command: hook.command,
                  },
                }),
                asBody({ matcher: entry.matcher, timeout: hook.timeout }),
              ] as const,
          ),
      ),
    ),
    ...(manifest?.rules ?? []).map(
      (rule) =>
        [
          asHookUniqueKey({ hook: rule }),
          asBody({ matcher: rule.matcher, timeout: rule.timeoutSeconds }),
        ] as const,
    ),
  ]);
};
