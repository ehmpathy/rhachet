import type { BrainCliEnrollmentManifest } from '@src/domain.objects/BrainCliEnrollmentManifest';
import { REPO_ACTOR_EXID } from '@src/domain.operations/actor/enrolled/constants';
import { getActorOndiskDir } from '@src/domain.operations/actor/enrolled/getActorOndiskDir';
import { getBrainOndiskDir } from '@src/domain.operations/actor/enrolled/getBrainOndiskDir';
import { getOneRepoActorOndiskDir } from '@src/domain.operations/actor/enrolled/getOneRepoActorOndiskDir';
import {
  CLAUDE_SETTINGS_FILENAMES,
  readClaudeCodeSettings,
  writeClaudeCodeSettings,
} from '@src/domain.operations/brains/claudeCodeSettings';
import { withRepoMutex } from '@src/infra/lock/withRepoMutex';

import { dirname, join } from 'node:path';
import { getSupportedBrainCommand } from '../brain/getSupportedBrainCommand';
import { asClaudeMdExcludesOutsideDirs } from './asClaudeMdExcludesOutsideDirs';
import { asClaudeMdExcludesPortable } from './asClaudeMdExcludesPortable';
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
 * .note = the source is the repo actor's `settings.of.repo.json` — the hook sync writes every
 *   ambient role's hooks there, and a role init that writes it by name adds its own keys
 * .note = drops every clone identity key from the `env` map — a spawn mints a depth, a config
 *   never does
 * .note = the repo actor is the source itself: its hooks are never narrowed (a narrow would
 *   drop any hook with no author), only its claudeMdExcludes are set
 * .note = the excludes never hide the actor's own boot: a clone reads its door as user memory,
 *   at the real `brain/.claude` path, which no entry matches. the home glob does match the
 *   repo actor's link path `<repo>/.claude/CLAUDE.md`, but that path only loads as project
 *   memory, a source no clone loads (`--setting-sources user`, pinned in
 *   `asBrainCliSpawnArgs.test.ts`)
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
  const isRepoActor = input.exid === REPO_ACTOR_EXID;

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
}): Promise<{ configPath: string }> => {
  const {
    enrollment,
    repoPath,
    repoActorBrainDir,
    actorBrainDir,
    isRepoActor,
  } = input;

  // read the repo actor's settings; narrow the hooks to this actor's roles
  const settingsSource = await readClaudeCodeSettings({
    from: dirname(repoActorBrainDir),
  });
  const settingsNarrowed = isRepoActor
    ? settingsSource
    : getSettingsForRoles({
        settings: settingsSource,
        roles: enrollment.roles,
      });

  // drop any clone identity key from the env map, so the spawn alone sets the depth
  const settings = asSettingsWithoutCloneEnv({
    settings: settingsNarrowed,
  });

  // exclude every door but the actor's own, so the clone reads its brain dir alone (D5, D12)
  const excludesAll = getClaudeMdExcludesList({ repoPath, repoActorBrainDir });

  // the repo actor's file is committed, so it carries only the portable entries — the globs —
  //   by construction: every absolute entry names this checkout, and its doors besides. the
  //   home glob still matches the link path `<repo>/.claude/CLAUDE.md`, harmless since a clone
  //   reads its boot by the real path. any other actor keeps each entry outside its own dir
  const claudeMdExcludes = isRepoActor
    ? asClaudeMdExcludesPortable({ excludes: excludesAll })
    : asClaudeMdExcludesOutsideDirs({
        excludes: excludesAll,
        dirs: [actorBrainDir],
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
