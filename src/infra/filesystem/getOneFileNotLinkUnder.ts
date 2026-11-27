import { lstatSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * .what = the first regular file at or under a path that holds links only, or null where none
 * .why = a linked role's kind dir holds links alone; a regular file there is content no link
 *        made, which a human placed, so no swap or relink may remove it
 *
 * .note = an absent path, a link, or a dir of links all yield null; a regular file at the path
 *   itself is yielded, as one inside it is
 */
export const getOneFileNotLinkUnder = (input: {
  path: string;
}): string | null => {
  const stats = lstatSync(input.path, { throwIfNoEntry: false });
  if (!stats || stats.isSymbolicLink()) return null;
  if (!stats.isDirectory()) return input.path;
  for (const entry of readdirSync(input.path).sort()) {
    const found = getOneFileNotLinkUnder({ path: join(input.path, entry) });
    if (found) return found;
  }
  return null;
};
