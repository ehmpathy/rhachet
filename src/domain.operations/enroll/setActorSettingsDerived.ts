import type { ActorOndisk } from '@src/domain.objects/ActorOndisk';
import { BrainCliEnrollmentManifest } from '@src/domain.objects/BrainCliEnrollmentManifest';
import { getActorOndiskDir } from '@src/domain.operations/actor/enrolled/getActorOndiskDir';
import { getBrainOndiskDir } from '@src/domain.operations/actor/enrolled/getBrainOndiskDir';
import { setBrainDirSettingsLayout } from '@src/domain.operations/actor/enrolled/setBrainDirSettingsLayout';
import {
  CLAUDE_SETTINGS_FILENAMES,
  readClaudeCodeSettings,
} from '@src/domain.operations/brains/claudeCodeSettings';
import { getHomeDir } from '@src/infra/getHomeDir';

import { lstatSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { genBrainCliConfigArtifact } from './genBrainCliConfigArtifact';

/**
 * .what = derive one enrolled actor's `settings.of.repo.json` from the repo actor's, and report
 *         its hooks before and after
 * .why = the same derivation enroll runs at spawn, so an actor's settings never drift from the
 *        repo actor's (usecase.9). it lives with enroll, whose derivation it re-runs, so a sweep
 *        over actors (init's hook sync) calls ONE operation here rather than compose the layout,
 *        the brain dir paths and the derivation itself. enroll reads actor, never the reverse
 *
 * .note = the hooks come back as two maps, keyed by `event|author|command` and valued by the
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
 * .what = every hook in a brain dir's settings.of.repo.json, keyed by `event|author|command`,
 *         valued by its whole body (matcher included)
 * .why = a before/after pair of these tallies what one derivation added, changed, and
 *        removed — a changed timeout or matcher keeps the key and moves the body
 * .note = a `settings.of.repo.json` that is not a real file (a dir, a symlink) yields no hooks
 *   here, so the layout findsert that follows refuses it with its own fix. a read first would
 *   throw a raw `EISDIR` errno, with no hint, and hide that refusal
 */
const getAllHooksByKeyOfBrainDir = async (input: {
  brainDir: string;
}): Promise<Map<string, string>> => {
  const statRepo = lstatSync(
    join(input.brainDir, CLAUDE_SETTINGS_FILENAMES.repo),
    {
      throwIfNoEntry: false,
    },
  );
  if (statRepo && !statRepo.isFile()) return new Map();
  const settings = await readClaudeCodeSettings({
    from: dirname(input.brainDir),
  });
  return new Map(
    Object.entries(settings.hooks ?? {}).flatMap(([event, entries]) =>
      (entries ?? []).flatMap((entry) =>
        entry.hooks.map(
          (hook) =>
            [
              `${event}|${hook.author ?? ''}|${hook.command}`,
              JSON.stringify({ matcher: entry.matcher, ...hook }),
            ] as const,
        ),
      ),
    ),
  );
};
