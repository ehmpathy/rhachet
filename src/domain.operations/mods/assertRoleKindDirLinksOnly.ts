import { ConstraintError } from 'helpful-errors';

import { getOneFileNotLinkUnder } from '@src/infra/filesystem/getOneFileNotLinkUnder';

import { asRepoRelPathOfAgentPath } from './asRepoRelPathOfAgentPath';

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
  const file = getOneFileNotLinkUnder({ path: input.kindDir });
  if (!file) return;
  throw new ConstraintError(
    `a linked role dir holds a file no link made (${asRepoRelPathOfAgentPath({ path: file })})`,
    {
      kindDir: input.kindDir,
      file,
      fix: 'move the file out (to .agent/repo=.mods/ if it is a mod), then run rhx init --hooks',
    },
  );
};
