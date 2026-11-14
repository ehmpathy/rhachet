import { ConstraintError, MalfunctionError } from 'helpful-errors';

import { asActorOndiskExidFromDirName } from '@src/domain.operations/actor/enrolled/asActorOndiskExidFromDirName';
import {
  REPO_ACTOR_DIR_NAME,
  REPO_ACTOR_DIR_NAME_LEGACY,
} from '@src/domain.operations/actor/enrolled/constants';
import { getActorsRootDir } from '@src/domain.operations/actor/enrolled/getActorsRootDir';
import { getBrainOndiskDir } from '@src/domain.operations/actor/enrolled/getBrainOndiskDir';
import { getAllPathsGitCannotRestore } from '@src/infra/git/getAllPathsGitCannotRestore';
import { withRepoMutex } from '@src/infra/lock/withRepoMutex';
import { setSymlinkSwapped } from '@src/infra/setSymlinkSwapped';

import {
  copyFileSync,
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
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
} from 'node:path';
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
 * .what = whether a path is the brain dir of an actor dir in this repo's actors root — the
 *         legacy `actor.via.slug=.default`, or any actor rhachet mints
 * .why = such a link is rhachet's own prior link to a former repo actor, so it may be
 *        repointed; a link to any other place is the human's, and is refused
 */
const isActorBrainDirOfRepo = (input: {
  repoPath: string;
  path: string;
}): boolean => {
  const actorDir = dirname(dirname(input.path));
  if (dirname(actorDir) !== getActorsRootDir({ repoPath: input.repoPath }))
    return false;
  if (getBrainOndiskDir({ actorDir }) !== input.path) return false;
  const dirName = basename(actorDir);
  return (
    dirName === REPO_ACTOR_DIR_NAME_LEGACY ||
    asActorOndiskExidFromDirName({ dirName }) !== null
  );
};

/**
 * .what = make `<repo>/.claude` a relative symlink to the repo actor's brain dir (D10)
 * .why = `<repo>/.claude` holds no file of its own; the link makes it a reach path into
 *        the repo actor's brain dir, so there is one place its config lives
 *
 * .note = a link aimed at a former repo actor brain dir — the legacy `actor.via.slug=.default`,
 *         dangled by the rename, or a prior repo actor before a change of `ambient:` — is
 *         repointed, not refused: it is rhachet's own prior link
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
  carries: string[];
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
  carries: string[];
} => {
  const linkPath = join(input.repoPath, '.claude');
  const linkTarget = relative(input.repoPath, input.repoActorBrainDir);
  mkdirSync(input.repoActorBrainDir, { recursive: true });
  const stat = getOneLstatOrNull({ path: linkPath });

  // absent → create the link
  if (!stat) {
    symlinkSync(linkTarget, linkPath);
    return {
      effect: 'CREATED',
      drops: [],
      moves: [],
      overwrites: [],
      carries: [],
    };
  }

  // a symlink to the repo actor brain dir → keep it, or rewrite an absolute one relative
  if (stat.isSymbolicLink()) {
    const realpathFound = getOneRealpathOrNull({ path: linkPath });
    const realpathWanted = realpathSync(input.repoActorBrainDir);

    // a symlink to a former repo actor brain dir → repoint it. the legacy dir dangles once
    //   it moves (`setRepoActorDirFromLegacy`), and a change of `ambient:` names another
    //   actor; either way the link is rhachet's own, so it is ours to repoint
    const pathAimed = resolve(input.repoPath, readlinkSync(linkPath));
    if (
      realpathFound !== realpathWanted &&
      isActorBrainDirOfRepo({ repoPath: input.repoPath, path: pathAimed })
    ) {
      // carry the former repo actor's own settings into the new one, before the swap — a hand
      //   edit there is the human's (F14), and the new dir would otherwise meet a blank `{}`
      const carries = setRepoActorSettingsCarried({
        repoPath: input.repoPath,
        brainDirFormer: pathAimed,
        brainDirLatter: input.repoActorBrainDir,
      });
      setSymlinkSwapped({ path: linkPath, target: linkTarget });
      return {
        effect: 'REWRITTEN',
        drops: [],
        moves: [],
        overwrites: [],
        carries,
      };
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
      return {
        effect: 'FOUND',
        drops: [],
        moves: [],
        overwrites: [],
        carries: [],
      };
    setSymlinkSwapped({ path: linkPath, target: linkTarget });
    return {
      effect: 'REWRITTEN',
      drops: [],
      moves: [],
      overwrites: [],
      carries: [],
    };
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
    carries: [],
  };
};

/**
 * .what = the brain dir files a former repo actor holds that are its own, never derived
 * .note = boot.md is derived from the roles and re-rendered; the arrows are re-findserted
 */
const REPO_ACTOR_SETTINGS_CARRIED = ['settings.of.repo.json'];

/**
 * .what = copy a former repo actor's own settings into the latter repo actor's brain dir,
 *         where the latter holds none yet; return each carried path, repo-relative
 * .why = a change of repo actor (a manifest adopted, or `ambient:` renamed) repoints
 *        `<repo>/.claude`. the layout findsert then writes `{}` where the file is absent, so a
 *        hand-added hook or permission in the former file would drop with no message
 *
 * .note = a copy, never a move: the former actor dir stays a whole actor, which a peer may
 *         still reach (e.g. `@a` after `ambient:` moves to `@b`)
 * .note = the latter's file, where present, is its own and is never overwritten
 * .note = a dangled former dir (the legacy `actor.via.slug=.default`, moved by
 *         `setRepoActorDirFromLegacy` this same run) is read at its current name
 * .note = the hook sync after the role inits re-narrows the carried file: role hooks follow
 *         the latter's roles, and an authorless (hand-added) hook stays (F14)
 */
const setRepoActorSettingsCarried = (input: {
  repoPath: string;
  brainDirFormer: string;
  brainDirLatter: string;
}): string[] => {
  const brainDirSource = asBrainDirFormerLive(input);
  return REPO_ACTOR_SETTINGS_CARRIED.filter((name) => {
    const pathSource = join(brainDirSource, name);
    const pathTarget = join(input.brainDirLatter, name);
    if (!getOneLstatOrNull({ path: pathSource })?.isFile()) return false;
    if (getOneLstatOrNull({ path: pathTarget })) return false;
    copyFileSync(pathSource, pathTarget);
    return true;
  }).map((name) => relative(input.repoPath, join(brainDirSource, name)));
};

/**
 * .what = the live location of a former repo actor brain dir — the legacy dir reads at the
 *         current repo actor name once it has moved
 */
const asBrainDirFormerLive = (input: {
  repoPath: string;
  brainDirFormer: string;
}): string => {
  const actorDirFormer = dirname(dirname(input.brainDirFormer));
  if (basename(actorDirFormer) !== REPO_ACTOR_DIR_NAME_LEGACY)
    return input.brainDirFormer;
  if (getOneLstatOrNull({ path: input.brainDirFormer }))
    return input.brainDirFormer;
  return getBrainOndiskDir({
    actorDir: join(
      getActorsRootDir({ repoPath: input.repoPath }),
      REPO_ACTOR_DIR_NAME,
    ),
  });
};
