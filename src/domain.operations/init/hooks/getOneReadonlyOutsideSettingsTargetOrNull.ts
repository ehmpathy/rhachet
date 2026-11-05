import { CLAUDE_SETTINGS_FILENAMES } from '@src/domain.operations/brains/claudeCodeSettings';
import { isErrnoOfDenial } from '@src/infra/filesystem/isErrnoOfDenial';
import { withAbsentAsNull } from '@src/infra/withAbsentAsNull';
import { isPathOutsideDir } from '@src/utils/isPathOutsideDir';

import { accessSync, constants, lstatSync, realpathSync } from 'node:fs';
import { join } from 'node:path';

/**
 * .what = where a brain dir's `settings.json` arrow lands, when that is a read-only file outside
 *   the repo; else null
 * .why = a human who locks their home settings (0444) wants to know init reached that file and
 *   left it alone. a probe only — lstat, realpath, an access check — never an open for write
 *
 * .note = a writable target, an absent target, a real file at the name, or a target inside the
 *   repo all yield null: a line on every healthy run would teach the human to skim `⚠️`
 * .note = only the errnos of absence and denial are read as a verdict; every other errno
 *   surfaces (failhide)
 */
export const getOneReadonlyOutsideSettingsTargetOrNull = (input: {
  repoPath: string;
  brainDir: string;
}): { path: string; landsAt: string } | null => {
  const path = join(input.brainDir, CLAUDE_SETTINGS_FILENAMES.claude);
  if (!lstatSync(path, { throwIfNoEntry: false })?.isSymbolicLink())
    return null;

  // follow the arrow to the file it lands at; a broken arrow lands nowhere
  const landsAt = withAbsentAsNull({ read: () => realpathSync(path) });
  if (!landsAt) return null;

  // a target inside the repo is the repo's own file, never the human's
  if (!isPathOutsideDir({ path: landsAt, dir: realpathSync(input.repoPath) }))
    return null;

  // a writable target is untouched with no line
  if (isWritable({ path: landsAt })) return null;
  return { path, landsAt };
};

/**
 * .what = whether this process may write a path; a denial reads as no
 */
const isWritable = (input: { path: string }): boolean => {
  try {
    accessSync(input.path, constants.W_OK);
    return true;
  } catch (error) {
    if (isErrnoOfDenial(error)) return false;
    throw error;
  }
};
