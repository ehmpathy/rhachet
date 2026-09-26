import { ConstraintError, MalfunctionError } from 'helpful-errors';

import { getAllPathsGitCannotRestore } from '@src/infra/git/getAllPathsGitCannotRestore';

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
  unlinkSync,
} from 'node:fs';
import { isAbsolute, join, relative } from 'node:path';
import { asRepoBrainDirMigrationPlan } from './asRepoBrainDirMigrationPlan';

type RepoBrainDirSymlinkEffect = 'CREATED' | 'FOUND' | 'REWRITTEN' | 'MIGRATED';

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
 * .what = make `<repo>/.claude` a relative symlink to the default brain dir (D10)
 * .why = an unenrolled `claude` reads `<repo>/.claude`; the link makes it read the
 *        default actor's brain dir, so the repo and the default actor share one config
 *
 * .note = a real dir is migrated: its boot files drop (S11), every other entry moves.
 *         a name in BOTH dirs moves too — the repo-side copy is the live one a human and a
 *         role's init have just written, so it replaces the default dir's copy and the
 *         replacement is reported as an `overwrites` row. rhachet owns this dir, so it
 *         overwrites rather than refuse. a migration cut short leaves a real dir with fewer
 *         entries, and a re-run converges from there
 * .note = the link is relative — it is tracked, so an absolute one breaks in any other clone
 */
export const setRepoBrainDirSymlink = (input: {
  repoPath: string;
  defaultBrainDir: string;
}): {
  effect: RepoBrainDirSymlinkEffect;
  drops: string[];
  moves: string[];
  overwrites: string[];
} => {
  const linkPath = join(input.repoPath, '.claude');
  const linkTarget = relative(input.repoPath, input.defaultBrainDir);
  mkdirSync(input.defaultBrainDir, { recursive: true });
  const stat = getOneLstatOrNull({ path: linkPath });

  // absent → create the link
  if (!stat) {
    symlinkSync(linkTarget, linkPath);
    return { effect: 'CREATED', drops: [], moves: [], overwrites: [] };
  }

  // a symlink to the default brain dir → keep it, or rewrite an absolute one relative
  if (stat.isSymbolicLink()) {
    const realpathFound = getOneRealpathOrNull({ path: linkPath });
    const realpathWanted = realpathSync(input.defaultBrainDir);
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
    unlinkSync(linkPath);
    symlinkSync(linkTarget, linkPath);
    return { effect: 'REWRITTEN', drops: [], moves: [], overwrites: [] };
  }

  // a file → refuse; only a dir can migrate
  if (!stat.isDirectory())
    throw new ConstraintError('<repo>/.claude is a file, not a dir', {
      path: linkPath,
      hint: `move ${linkPath} aside, then rerun \`rhx init\``,
    });

  // a real dir → plan the migration. a name the default dir already holds is NOT a refusal:
  // rhachet owns this dir, and `<repo>/.claude` is the live copy, so the move replaces it
  const plan = asRepoBrainDirMigrationPlan({
    entriesInSrc: readdirSync(linkPath).sort(),
    entriesInDst: readdirSync(input.defaultBrainDir),
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
  try {
    for (const name of plan.drops)
      rmSync(join(linkPath, name), { recursive: true });
    for (const name of plan.moves) {
      rmSync(join(input.defaultBrainDir, name), {
        recursive: true,
        force: true,
      });
      renameSync(join(linkPath, name), join(input.defaultBrainDir, name));
    }
    rmdirSync(linkPath);
    symlinkSync(linkTarget, linkPath);
  } catch (error) {
    throw new MalfunctionError('<repo>/.claude could not be migrated', {
      path: linkPath,
      defaultBrainDir: input.defaultBrainDir,
      hint: 'rerun `rhx init`; the migration resumes from what is left',
      cause: error instanceof Error ? error : new Error(String(error)),
    });
  }
  return {
    effect: 'MIGRATED',
    drops: plan.drops,
    moves: plan.moves,
    overwrites: plan.overwrites,
  };
};
