import { ConstraintError } from 'helpful-errors';

/**
 * .what = the refusal for a file at `<repo>/.claude`: only a dir can migrate, and a file is neither
 *   a dir nor a link
 * .why = the preflight and the layout step both meet this state; one text serves both, so a human
 *   reads the same cause and the same fix from either site
 */
export const asRepoBrainDirIsFileError = (input: { linkPath: string }) =>
  new ConstraintError('<repo>/.claude is a file, not a dir', {
    path: input.linkPath,
    hint: `move ${input.linkPath} aside, then rerun \`rhx init\``,
  });
