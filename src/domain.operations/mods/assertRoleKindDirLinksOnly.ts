import { ConstraintError } from 'helpful-errors';

import { lstatSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * .what = the first regular file in a dir tree of links, or null where it holds only links
 * .why = a linked role's kind dir is all links; a regular file there is content no render made
 */
const getOneFileNotLink = (input: { dir: string }): string | null => {
  for (const entry of readdirSync(input.dir).sort()) {
    const path = join(input.dir, entry);
    const stats = lstatSync(path);
    if (stats.isSymbolicLink()) continue;
    if (!stats.isDirectory()) return path;
    const found = getOneFileNotLink({ dir: path });
    if (found) return found;
  }
  return null;
};

/**
 * .what = refuse a kind dir that holds a regular file, before a view swap touches it
 * .why = a swap removes the kind dir whole; a file no link made is real content, and a swap
 *        must never destroy it. the check runs over both kinds before any write, so a refusal
 *        leaves the role dir exactly as it was
 *
 * .note = a ConstraintError: the human placed the file, and the human moves it; the sync
 *   catches it per role, so only the actors that carry this role fail (usecase 12)
 * .note = an absent kind dir, a dir link, or a dir of links all pass; a regular file at the
 *   kind path itself is refused, as a file inside it is
 */
export const assertRoleKindDirLinksOnly = (input: {
  kindDir: string;
}): void => {
  const stats = lstatSync(input.kindDir, { throwIfNoEntry: false });
  if (!stats || stats.isSymbolicLink()) return;

  // a regular file where the kind dir belongs is real content too, and the swap would drop it
  const file = stats.isDirectory()
    ? getOneFileNotLink({ dir: input.kindDir })
    : input.kindDir;
  if (!file) return;
  throw new ConstraintError('a linked role dir holds a file no link made', {
    kindDir: input.kindDir,
    file,
    fix: 'move the file out (to .agent/repo=.mods/ if it is a mod), then run rhx init --hooks',
  });
};
