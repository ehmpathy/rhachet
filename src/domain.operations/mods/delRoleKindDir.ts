import { lstatSync, rmSync, unlinkSync } from 'node:fs';
import { assertRoleKindDirLinksOnly } from './assertRoleKindDirLinksOnly';

/**
 * .what = remove a linked role's kind dir — a dir link, or a dir of links
 * .why = a view swap replaces the kind dir whole; the links go, the files they name stay
 *
 * .note = a kind dir that holds a regular file is refused, never cleared: a link removal
 *   never follows the link, but a regular file is real content
 */
export const delRoleKindDir = (input: { kindDir: string }): void => {
  const stats = lstatSync(input.kindDir, { throwIfNoEntry: false });
  if (!stats) return;
  if (stats.isSymbolicLink()) {
    unlinkSync(input.kindDir);
    return;
  }

  // a regular file, at the kind path or inside it, is refused before any removal
  assertRoleKindDirLinksOnly({ kindDir: input.kindDir });
  rmSync(input.kindDir, { recursive: true });
};
