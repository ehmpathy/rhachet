import { ConstraintError } from 'helpful-errors';

import { getOneRealpathOrNull } from '@src/infra/getOneRealpathOrNull';
import { withAbsentAsNull } from '@src/infra/withAbsentAsNull';

import { lstatSync, readlinkSync } from 'node:fs';
import { join, relative } from 'node:path';
import { asRepoBrainDirIsFileError } from './asRepoBrainDirIsFileError';
import { isRepoBrainDirSymlinkLegacy } from './isRepoBrainDirSymlinkLegacy';

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
  const stat = withAbsentAsNull({ read: () => lstatSync(linkPath) });

  // absent → the layout step creates the link
  if (!stat) return;

  // a real dir → the layout step migrates it
  if (stat.isDirectory()) return;

  // a file → refuse; only a dir can migrate
  if (!stat.isSymbolicLink()) throw asRepoBrainDirIsFileError({ linkPath });

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
