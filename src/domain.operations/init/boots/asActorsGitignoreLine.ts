import { ACTORS_GITIGNORE_LINE } from '@src/domain.operations/actor/enrolled/constants';

/**
 * .what = one repo `.gitignore` line → the children form, if it excludes the `.actors` dir
 * .why = git never re-includes a path beneath an excluded dir, so a `.agent/.actors/` line
 *        blocks the default dir's negation; `.agent/.actors/*` ignores the same actors and
 *        leaves room for the negation (D10)
 *
 * .note = a lead `/` is kept; every other line comes back as it was
 */
export const asActorsGitignoreLine = (input: { line: string }): string => {
  // the dir forms, with or without a final slash
  const dirForms = [
    ACTORS_GITIGNORE_LINE.repoChildren.replace(/\/\*$/, '/'),
    ACTORS_GITIGNORE_LINE.repoChildren.replace(/\/\*$/, ''),
  ];

  // a root-anchored line keeps its anchor
  const isAnchored = input.line.startsWith('/');
  const lineBare = isAnchored ? input.line.slice(1) : input.line;
  if (!dirForms.includes(lineBare)) return input.line;
  return `${isAnchored ? '/' : ''}${ACTORS_GITIGNORE_LINE.repoChildren}`;
};
