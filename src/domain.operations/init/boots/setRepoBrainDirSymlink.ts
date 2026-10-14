import { ConstraintError, MalfunctionError } from 'helpful-errors';

import { REPO_ACTOR_DIR_NAME_LEGACY } from '@src/domain.operations/actor/enrolled/constants';
import { getActorsRootDir } from '@src/domain.operations/actor/enrolled/getActorsRootDir';
import { getBrainOndiskDir } from '@src/domain.operations/actor/enrolled/getBrainOndiskDir';
import { getAllPathsGitCannotRestore } from '@src/infra/git/getAllPathsGitCannotRestore';
import { withRepoMutex } from '@src/infra/lock/withRepoMutex';
import { setSymlinkSwapped } from '@src/infra/setSymlinkSwapped';

import {
  lstatSync,
  mkdirSync,
  readdirSync,
  readlinkSync,
  realpathSync,
  renameSync,
  rmdirSync,
  rmSync,
  symlinkSync,
} from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { asRepoBrainDirMigrationPlan } from './asRepoBrainDirMigrationPlan';

type RepoBrainDirSymlinkEffect = 'CREATED' | 'FOUND' | 'REWRITTEN' | 'MIGRATED';

/**
 * .what = the name the link's mutex is keyed on, in the actors root
 */
const REPO_BRAIN_DIR_LINK_LOCK_NAME = '.repo-brain-dir-link';

/**
 * .what = the lstat of a path, or null where it is absent
 */
const getOneLstatOrNull = (input: { path: string }) => {
  try {
    return lstatSync(input.path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
};

/**
 * .what = the realpath of a path, or null where it dangles
 * .note = only a dangle reads as null; any other fault (e.g. EACCES) is thrown, so it
 *         never masquerades as "a symlink to another place"
 */
const getOneRealpathOrNull = (input: { path: string }): string | null => {
  try {
    return realpathSync(input.path);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT' || code === 'ENOTDIR' || code === 'ELOOP')
      return null;
    throw error;
  }
};

/**
 * .what = make `<repo>/.claude` a relative symlink to the repo actor's brain dir (D10)
 * .why = `<repo>/.claude` holds no file of its own; the link makes it a reach path into
 *        the repo actor's brain dir, so there is one place its config lives
 *
 * .note = a link aimed at the legacy repo actor brain dir (`actor.via.slug=.default`) is
 *         repointed, not refused — it is rhachet's own prior link, dangled by the rename
 *
 * .note = a real dir is migrated: its boot files drop (S11), every other entry moves.
 *         a name in BOTH dirs moves too — the repo-side copy is the live one a human and a
 *         role's init have just written, so it replaces the repo actor dir's copy and the
 *         replacement is reported as an `overwrites` row. rhachet owns this dir, so it
 *         overwrites rather than refuse. a migration cut short leaves a real dir with fewer
 *         entries, and a re-run converges from there
 * .note = the link is relative — it is tracked, so an absolute one breaks in any other clone
 * .note = the whole check-then-act runs under the repo mutex, so two `rhx init`s that meet
 *   one real `<repo>/.claude` never interleave a migration (one drops and moves while the
 *   other plans from the half-moved dir). the key is a name in the actors root no actor dir
 *   can take (`actor.via.` is the actor prefix)
 */
export const setRepoBrainDirSymlink = async (input: {
  repoPath: string;
  repoActorBrainDir: string;
}): Promise<{
  effect: RepoBrainDirSymlinkEffect;
  drops: string[];
  moves: string[];
  overwrites: string[];
}> => {
  mkdirSync(input.repoActorBrainDir, { recursive: true });
  return withRepoMutex(
    {
      repoPath: input.repoPath,
      path: join(
        getActorsRootDir({ repoPath: input.repoPath }),
        REPO_BRAIN_DIR_LINK_LOCK_NAME,
      ),
    },
    async () => setRepoBrainDirSymlinkWithinLock(input),
  );
};

/**
 * .what = the link check, rewrite or migration itself; the caller holds its mutex
 */
const setRepoBrainDirSymlinkWithinLock = (input: {
  repoPath: string;
  repoActorBrainDir: string;
}): {
  effect: RepoBrainDirSymlinkEffect;
  drops: string[];
  moves: string[];
  overwrites: string[];
} => {
  const linkPath = join(input.repoPath, '.claude');
  const linkTarget = relative(input.repoPath, input.repoActorBrainDir);
  mkdirSync(input.repoActorBrainDir, { recursive: true });
  const stat = getOneLstatOrNull({ path: linkPath });

  // absent → create the link
  if (!stat) {
    symlinkSync(linkTarget, linkPath);
    return { effect: 'CREATED', drops: [], moves: [], overwrites: [] };
  }

  // a symlink to the repo actor brain dir → keep it, or rewrite an absolute one relative
  if (stat.isSymbolicLink()) {
    const realpathFound = getOneRealpathOrNull({ path: linkPath });
    const realpathWanted = realpathSync(input.repoActorBrainDir);

    // a symlink to the legacy repo actor brain dir → repoint it. after the legacy dir
    //   moves (`setRepoActorDirFromLegacy`), the old link dangles; it is ours to repoint
    const pathAimed = resolve(input.repoPath, readlinkSync(linkPath));
    const pathLegacy = getBrainOndiskDir({
      actorDir: join(
        getActorsRootDir({ repoPath: input.repoPath }),
        REPO_ACTOR_DIR_NAME_LEGACY,
      ),
    });
    if (realpathFound !== realpathWanted && pathAimed === pathLegacy) {
      setSymlinkSwapped({ path: linkPath, target: linkTarget });
      return { effect: 'REWRITTEN', drops: [], moves: [], overwrites: [] };
    }

    if (realpathFound !== realpathWanted)
      throw new ConstraintError(
        '<repo>/.claude is a symlink to another place',
        {
          path: linkPath,
          found: `a symlink to ${readlinkSync(linkPath)}`,
          wanted: `a symlink to ${linkTarget}`,
          hint: `remove ${linkPath}, then rerun \`rhx init\``,
        },
      );
    if (!isAbsolute(readlinkSync(linkPath)))
      return { effect: 'FOUND', drops: [], moves: [], overwrites: [] };
    setSymlinkSwapped({ path: linkPath, target: linkTarget });
    return { effect: 'REWRITTEN', drops: [], moves: [], overwrites: [] };
  }

  // a file → refuse; only a dir can migrate
  if (!stat.isDirectory())
    throw new ConstraintError('<repo>/.claude is a file, not a dir', {
      path: linkPath,
      hint: `move ${linkPath} aside, then rerun \`rhx init\``,
    });

  // a real dir → plan the migration. a name the repo actor dir already holds is NOT a refusal:
  // rhachet owns this dir, and `<repo>/.claude` is the live copy, so the move replaces it
  const plan = asRepoBrainDirMigrationPlan({
    entriesInSrc: readdirSync(linkPath).sort(),
    entriesInDst: readdirSync(input.repoActorBrainDir),
  });

  // a drop is safe ONLY where git holds a copy. S11 drops the boot names on the ground
  // that "a tracked drop is recoverable from git" — so a boot name git canNOT hand back
  // (untracked, dirty, or ignored) is hand-authored work, and its drop would be a silent
  // data loss. refuse before any mutation — the one refusal a migration still carries
  const dropsUnrestorable = getAllPathsGitCannotRestore({
    cwd: input.repoPath,
    paths: plan.drops.map((name) => join(linkPath, name)),
  });
  if (dropsUnrestorable.length)
    throw new ConstraintError(
      '<repo>/.claude holds boot files git could not hand back',
      {
        path: linkPath,
        unrestorable: dropsUnrestorable,
        hint: `commit or discard each, then rerun \`rhx init\` — an untracked boot file is dropped by the migration and git could not restore it`,
      },
    );

  // drop the boot files, move the rest, then swap the empty dir for the link
  //
  // .note = each move clears its destination first. `renameSync` replaces a destination FILE
  //   but throws on a destination DIR, so an overwrite of a dir entry (e.g. `rules/`) needs
  //   the `rmSync` — and the same call makes the file case explicit rather than implicit
  MalfunctionError.wrap(
    () => {
      for (const name of plan.drops)
        rmSync(join(linkPath, name), { recursive: true });
      for (const name of plan.moves) {
        rmSync(join(input.repoActorBrainDir, name), {
          recursive: true,
          force: true,
        });
        renameSync(join(linkPath, name), join(input.repoActorBrainDir, name));
      }
      rmdirSync(linkPath);
      symlinkSync(linkTarget, linkPath);
    },
    {
      message: '<repo>/.claude could not be migrated',
      metadata: {
        path: linkPath,
        repoActorBrainDir: input.repoActorBrainDir,
        hint: 'rerun `rhx init`; the migration resumes from what is left',
      },
    },
  )();
  return {
    effect: 'MIGRATED',
    drops: plan.drops,
    moves: plan.moves,
    overwrites: plan.overwrites,
  };
};
