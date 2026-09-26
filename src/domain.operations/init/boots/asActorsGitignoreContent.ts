import { asActorsGitignoreLine } from './asActorsGitignoreLine';

/**
 * .what = a whole repo `.gitignore` → the same file, with each `.actors` dir exclusion in
 *         its children form
 * .why = the file-grain twin of `asActorsGitignoreLine`, so the findsert reads as one call
 *
 * .note = every other line, and every line break, comes back byte for byte
 */
export const asActorsGitignoreContent = (input: { content: string }): string =>
  input.content
    .split('\n')
    .map((line) => asActorsGitignoreLine({ line }))
    .join('\n');
