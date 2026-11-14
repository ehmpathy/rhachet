import type { BrainCliEnrollmentManifest } from '@src/domain.objects/BrainCliEnrollmentManifest';
import { getActorOndiskDir } from '@src/domain.operations/actor/enrolled/getActorOndiskDir';
import { getBrainOndiskDir } from '@src/domain.operations/actor/enrolled/getBrainOndiskDir';
import { getOneRepoActorExid } from '@src/domain.operations/actor/enrolled/getOneRepoActorExid';
import { getOneRepoActorOndiskDir } from '@src/domain.operations/actor/enrolled/getOneRepoActorOndiskDir';
import { getActorsManifest } from '@src/domain.operations/actor/manifest/getActorsManifest';
import {
  CLAUDE_SETTINGS_FILENAMES,
  type ClaudeCodeSettings,
  readClaudeCodeSettings,
  writeClaudeCodeSettings,
} from '@src/domain.operations/brains/claudeCodeSettings';
import { getAllHooksOfLinkedRolesForClaudeCode } from '@src/domain.operations/init/hooks/getAllHooksOfLinkedRolesForClaudeCode';
import { getHomeDir } from '@src/infra/getHomeDir';
import { withRepoMutex } from '@src/infra/lock/withRepoMutex';

import { dirname, join } from 'node:path';
import { getSupportedBrainCommand } from '../brain/getSupportedBrainCommand';
import { asClaudeMdExcludesOutsideDirs } from './asClaudeMdExcludesOutsideDirs';
import { asSettingsWithoutCloneEnv } from './asSettingsWithoutCloneEnv';
import { getClaudeMdExcludesList } from './getClaudeMdExcludesList';
import { getSettingsForRoles } from './getSettingsForRoles';

/**
 * .what = writes an actor's `settings.of.repo.json`: the repo actor's settings, narrowed to
 *         the actor's own roles, plus the claudeMdExcludes a clone carries
 * .why = the one settings file a clone reads at the `--settings` rank
 *        (define.brain-dir-layout-is-one-for-every-actor). the same function serves enroll
 *        and init, so an actor's settings derive one way, from one source
 *
 * .note = the source is the repo actor's `settings.of.repo.json` — a role init that writes it by
 *   name adds its own keys there, and with no manifest the hook sync writes every linked role's
 *   hooks there too
 * .note = drops every clone identity key from the `env` map — a spawn mints a depth, a config
 *   never does
 * .note = with no manifest the repo actor is the source itself: its hooks are never narrowed (a
 *   narrow would drop any hook with no author), only its claudeMdExcludes are set. under a
 *   manifest every actor narrows from the linked roles' hooks (`asSettingsNarrowedForActor`)
 * .note = the excludes never name the actor's own doors — for the repo actor, those are its
 *   own boot, so an exclude there would hide the clone's corpus
 * .note = the read of the source and the write of the target hold both files' mutexes, the
 *   source's first. a hook sync (the shield) or a layout findsert on the same file waits its
 *   turn, so a whole-file write here never drops a hook another `rhx` wrote between the read
 *   and the write. the write itself stays atomic (temp + rename) for a reader with no lock
 * .note = for the repo actor the source and the target are one file, so it holds one mutex,
 *   never the same one twice — the mutex is not reentrant
 */
export const genBrainCliConfigArtifact = async (input: {
  enrollment: BrainCliEnrollmentManifest;
  exid: string;
  repoPath: string;
}): Promise<{ configPath: string }> => {
  const { enrollment, repoPath } = input;

  // validate brain is supported (shared transformer — throws ConstraintError if not)
  getSupportedBrainCommand({ brain: enrollment.brain });

  // the source (the repo actor) and the target (this actor)
  const repoActorBrainDir = getBrainOndiskDir({
    actorDir: getOneRepoActorOndiskDir({ repoPath }),
  });
  const actorBrainDir = getBrainOndiskDir({
    actorDir: getActorOndiskDir({ repoPath, exid: input.exid }),
  });
  const isRepoActor = input.exid === getOneRepoActorExid({ repoPath });

  // under a manifest, the hooks come from the linked roles, never the repo actor's file: the
  //   repo actor there is narrowed to its own roles, so its file cannot serve a peer
  //   (inventory.of=requirements.case=9). with no manifest the repo actor's file holds the
  //   whole union, as on main
  const hooksOfLinkedRoles = getActorsManifest({ repoPath })
    ? await getAllHooksOfLinkedRolesForClaudeCode({ repoPath })
    : null;

  // read the source and write the target as one critical section: the source mutex first,
  //   then the target's. every writer of `settings.of.repo.json` takes them in this order, the
  //   source before any actor's, so two never wait on each other
  const withinLocks = () =>
    setActorSettingsRepoWithinLock({
      enrollment,
      repoPath,
      repoActorBrainDir,
      actorBrainDir,
      isRepoActor,
      hooksOfLinkedRoles,
    });
  const withSourceHeld = () =>
    isRepoActor
      ? withinLocks()
      : withRepoMutex(
          {
            repoPath,
            path: join(actorBrainDir, CLAUDE_SETTINGS_FILENAMES.repo),
          },
          withinLocks,
        );
  return withRepoMutex(
    {
      repoPath,
      path: join(repoActorBrainDir, CLAUDE_SETTINGS_FILENAMES.repo),
    },
    withSourceHeld,
  );
};

/**
 * .what = the read of the source settings, the narrow, and the write of the actor's file;
 *         the caller holds both mutexes (one, for the repo actor)
 */
const setActorSettingsRepoWithinLock = async (input: {
  enrollment: BrainCliEnrollmentManifest;
  repoPath: string;
  repoActorBrainDir: string;
  actorBrainDir: string;
  isRepoActor: boolean;
  hooksOfLinkedRoles: NonNullable<ClaudeCodeSettings['hooks']> | null;
}): Promise<{ configPath: string }> => {
  const {
    enrollment,
    repoPath,
    repoActorBrainDir,
    actorBrainDir,
    isRepoActor,
    hooksOfLinkedRoles,
  } = input;

  // read the repo actor's settings; narrow the hooks to this actor's roles
  const settingsSource = await readClaudeCodeSettings({
    from: dirname(repoActorBrainDir),
  });
  const settingsNarrowed = asSettingsNarrowedForActor({
    settingsSource,
    hooksOfLinkedRoles,
    roles: enrollment.roles,
    isRepoActor,
  });

  // drop any clone identity key from the env map, so the spawn alone sets the depth
  const settings = asSettingsWithoutCloneEnv({
    settings: settingsNarrowed,
  });

  // exclude every door but the actor's own, so the clone reads its brain dir alone (D5, D12).
  //   the repo actor's doors have two paths — its real dir, and `<repo>/.claude`, a
  //   symlink to it — so neither path may be excluded for it
  const ownDirs = isRepoActor
    ? [actorBrainDir, join(repoPath, '.claude')]
    : [actorBrainDir];
  const claudeMdExcludes = asClaudeMdExcludesOutsideDirs({
    excludes: getClaudeMdExcludesList({
      repoPath,
      repoActorBrainDir,
      home: getHomeDir(),
    }),
    dirs: ownDirs,
  });

  // write the actor's settings.of.repo.json
  await writeClaudeCodeSettings({
    settings: { ...settings, claudeMdExcludes },
    to: dirname(actorBrainDir),
  });

  return {
    configPath: join(actorBrainDir, CLAUDE_SETTINGS_FILENAMES.repo),
  };
};

/**
 * .what = the settings an actor's clone reads: the repo actor's non-hook keys, and the hooks of
 *         this actor's own roles
 * .why = one place decides the hook source and the narrow, for both layouts
 *
 * .note = no manifest → the repo actor's file is the union; the repo actor keeps it whole (a
 *   narrow would drop any hook with no author), every other actor narrows from it — main's path
 * .note = a manifest → the linked roles' hooks are the union, and EVERY actor narrows from it,
 *   the repo actor too. the repo actor keeps its own authorless hooks — a hand edit is never lost
 */
const asSettingsNarrowedForActor = (input: {
  settingsSource: ClaudeCodeSettings;
  hooksOfLinkedRoles: NonNullable<ClaudeCodeSettings['hooks']> | null;
  roles: string[];
  isRepoActor: boolean;
}): ClaudeCodeSettings => {
  // no manifest: main's path, byte for byte
  if (input.hooksOfLinkedRoles === null)
    return input.isRepoActor
      ? input.settingsSource
      : getSettingsForRoles({
          settings: input.settingsSource,
          roles: input.roles,
        });

  // a manifest: narrow the linked roles' union to this actor's roles
  const narrowed = getSettingsForRoles({
    settings: { ...input.settingsSource, hooks: input.hooksOfLinkedRoles },
    roles: input.roles,
  });
  if (!input.isRepoActor) return narrowed;

  // the repo actor keeps the hooks a human added by hand to its own file
  return {
    ...narrowed,
    hooks: asHooksMerged({
      base: narrowed.hooks ?? {},
      extra: asHooksAuthorless({ hooks: input.settingsSource.hooks ?? {} }),
    }),
  };
};

/**
 * .what = only the hook entries whose inner hooks carry no author
 */
const asHooksAuthorless = (input: {
  hooks: NonNullable<ClaudeCodeSettings['hooks']>;
}): NonNullable<ClaudeCodeSettings['hooks']> =>
  Object.fromEntries(
    Object.entries(input.hooks)
      .map(
        ([event, entries]) =>
          [
            event,
            (entries ?? [])
              .map((entry) => ({
                ...entry,
                hooks: entry.hooks.filter((hook) => !hook.author),
              }))
              .filter((entry) => entry.hooks.length > 0),
          ] as const,
      )
      .filter(([, entries]) => entries.length > 0),
  );

/**
 * .what = two hook maps joined, event by event, base entries first
 */
const asHooksMerged = (input: {
  base: NonNullable<ClaudeCodeSettings['hooks']>;
  extra: NonNullable<ClaudeCodeSettings['hooks']>;
}): NonNullable<ClaudeCodeSettings['hooks']> => {
  const events = [
    ...new Set([...Object.keys(input.base), ...Object.keys(input.extra)]),
  ] as Array<keyof NonNullable<ClaudeCodeSettings['hooks']>>;
  return Object.fromEntries(
    events.map((event) => [
      event,
      [...(input.base[event] ?? []), ...(input.extra[event] ?? [])],
    ]),
  );
};
