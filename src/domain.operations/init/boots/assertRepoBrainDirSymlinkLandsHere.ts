import { ConstraintError } from 'helpful-errors';

import { REPO_ACTOR_DIR_NAME_LEGACY } from '@src/domain.operations/actor/enrolled/constants';
import { getActorsRootDir } from '@src/domain.operations/actor/enrolled/getActorsRootDir';
import { getBrainOndiskDir } from '@src/domain.operations/actor/enrolled/getBrainOndiskDir';

import { lstatSync, readlinkSync, realpathSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

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
export const getOneRealpathOrNull = (input: {
  path: string;
}): string | null => {
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
 * .what = whether `<repo>/.claude` is a link aimed at the legacy repo actor brain dir
 * .why = rhachet's own prior link, dangled by the rename; the layout step repoints it
 */
export const isRepoBrainDirSymlinkLegacy = (input: {
  repoPath: string;
  linkPath: string;
}): boolean =>
  resolve(input.repoPath, readlinkSync(input.linkPath)) ===
  getBrainOndiskDir({
    actorDir: join(
      getActorsRootDir({ repoPath: input.repoPath }),
      REPO_ACTOR_DIR_NAME_LEGACY,
    ),
  });

/**
 * .what = refuse a `<repo>/.claude` that no init may write through: a file, or a link whose
 *   realpath is not the repo actor's brain dir
 * .why = each role init writes through `<repo>/.claude`; a link that lands elsewhere would take
 *   those writes into another tree. checked before any role runs (vision case 4, F6), and by the
 *   layout step at its own refusal site, so one rule and one text hold both
 *
 * .note = absent, a real dir (it migrates), and the legacy link (it is repointed) all pass: the
 *   layout step owns each of them
 * .note = a link that lands on the brain dir passes however it is spelled — relative, absolute,
 *   or through a hop (vision case 6)
 * .note = the refusal names both realpaths, so a tree that meets it diagnoses itself (seed S2)
 * .note = read-only and lock-free: one read of one link, never a write
 */
export const assertRepoBrainDirSymlinkLandsHere = (input: {
  repoPath: string;
  repoActorBrainDir: string;
}): void => {
  const linkPath = join(input.repoPath, '.claude');
  const stat = getOneLstatOrNull({ path: linkPath });

  // absent → the layout step creates the link
  if (!stat) return;

  // a real dir → the layout step migrates it
  if (stat.isDirectory()) return;

  // a file → refuse; only a dir can migrate
  if (!stat.isSymbolicLink())
    throw new ConstraintError('<repo>/.claude is a file, not a dir', {
      path: linkPath,
      hint: `move ${linkPath} aside, then rerun \`rhx init\``,
    });

  // a link that lands on the brain dir, by any spelling → pass
  const realpathFound = getOneRealpathOrNull({ path: linkPath });
  const realpathWanted = getOneRealpathOrNull({
    path: input.repoActorBrainDir,
  });
  if (realpathFound !== null && realpathFound === realpathWanted) return;

  // the legacy link → the layout step repoints it
  if (isRepoBrainDirSymlinkLegacy({ repoPath: input.repoPath, linkPath }))
    return;

  // a link that aims elsewhere, or dangles → refuse, with both realpaths named
  throw new ConstraintError('<repo>/.claude is a symlink to another place', {
    path: linkPath,
    found: `a symlink to ${readlinkSync(linkPath)}`,
    realpathFound: realpathFound ?? '(dangles: its target is absent)',
    wanted: `a symlink to ${relative(input.repoPath, input.repoActorBrainDir)}`,
    realpathWanted: realpathWanted ?? input.repoActorBrainDir,
    hint: `remove ${linkPath}, then rerun \`rhx init\``,
  });
};
