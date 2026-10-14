import { ACTORS_GITIGNORE_LINE } from '@src/domain.operations/actor/enrolled/constants';

import { asActorsGitignoreLine } from './asActorsGitignoreLine';

/**
 * .what = a whole repo `.gitignore` → the same file, with each `.actors` dir exclusion in
 *         its children form, and the legacy repo actor negation dropped
 * .why = the file-grain twin of `asActorsGitignoreLine`, so the findsert reads as one call.
 *        the legacy negation (`!.agent/.actors/actor.via.slug=.default/`) is dropped so the
 *        legacy dir is ignored again once the repo actor moves to `actor.via.repo=ambient`
 *
 * .note = every other line, and every line break, comes back byte for byte
 */
export const asActorsGitignoreContent = (input: { content: string }): string =>
  input.content
    .split('\n')
    .filter(
      (line) => line !== ACTORS_GITIGNORE_LINE.repoRepoActorNegationLegacy,
    )
    .map((line) => asActorsGitignoreLine({ line }))
    .join('\n');
