import { ACTORS_GITIGNORE_LINE } from '@src/domain.operations/actor/enrolled/constants';
import { findsertFileLine } from '@src/infra/findsertFileLine';
import { setFileAtomic } from '@src/infra/setFileAtomic';

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { asActorsGitignoreContent } from './asActorsGitignoreContent';

/**
 * .what = make the repo `.gitignore` spare the default actor dir (D10)
 * .why = the default dir holds the repo's tracked brain config; a root `.agent/.actors/`
 *        line would block any re-include beneath it, so it becomes `.agent/.actors/*`,
 *        and the negation for the default dir is findserted after it
 *
 * .note = the file is rewritten only when a line changed; every other line is kept byte
 *         for byte. never a whole-file converge — the repo `.gitignore` is the human's
 */
export const findsertDefaultActorGitignoreExclusion = (input: {
  repoPath: string;
}): { rewritten: boolean; negation: 'FOUND' | 'APPENDED' | 'CREATED' } => {
  const path = join(input.repoPath, '.gitignore');

  // rewrite a dir exclusion of `.actors` to its children form, only if one is present
  const contentBefore = existsSync(path) ? readFileSync(path, 'utf8') : null;
  const contentAfter =
    contentBefore === null
      ? null
      : asActorsGitignoreContent({ content: contentBefore });
  const rewritten = contentBefore !== contentAfter;
  if (rewritten && contentAfter !== null)
    setFileAtomic({ path, content: contentAfter });

  // findsert the negation after it
  const { effect } = findsertFileLine({
    path,
    line: ACTORS_GITIGNORE_LINE.repoDefaultNegation,
  });
  return { rewritten, negation: effect };
};
