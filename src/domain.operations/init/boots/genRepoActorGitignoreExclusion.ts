import { asActorOndiskDirName } from '@src/domain.operations/actor/enrolled/asActorOndiskDirName';
import { getOneRepoActorExid } from '@src/domain.operations/actor/enrolled/getOneRepoActorExid';
import { asTextWithLinesConverged } from '@src/infra/asTextWithLinesConverged';
import { withRepoMutex } from '@src/infra/lock/withRepoMutex';
import { setFileAtomic } from '@src/infra/setFileAtomic';

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { asActorsGitignoreContent } from './asActorsGitignoreContent';

/**
 * .what = make the repo `.gitignore` spare the repo actor dir (D10)
 * .why = the repo actor dir holds the repo's tracked brain config; a root `.agent/.actors/`
 *        line would block any re-include beneath it, so it becomes `.agent/.actors/*`,
 *        the legacy `.default` negation is dropped, and the negation for the repo actor dir
 *        is findserted after it
 *
 * .note = the file is rewritten only when a line changed; every other line is kept byte
 *         for byte. never a whole-file converge — the repo `.gitignore` is the human's
 * .note = the read and the write hold the file's mutex, so a peer `rhx init` cannot drop an
 *         edit this one made
 */
export const genRepoActorGitignoreExclusion = async (input: {
  repoPath: string;
}): Promise<{
  rewritten: boolean;
  negation: 'FOUND' | 'APPENDED' | 'CREATED';
}> => {
  const path = join(input.repoPath, '.gitignore');
  const negation = `!.agent/.actors/${asActorOndiskDirName({
    exid: getOneRepoActorExid({ repoPath: input.repoPath }),
  })}/`;
  return withRepoMutex({ repoPath: input.repoPath, path }, async () =>
    genRepoActorGitignoreExclusionWithinLock({ path, negation }),
  );
};

/**
 * .what = whether a `.gitignore` line re-includes an actor dir — a repo actor negation
 *         some release or some `ambient:` wrote
 */
const isActorDirNegation = (input: { line: string }): boolean =>
  /^!\.agent\/\.actors\/actor\.via\.[^/]+\/$/.test(input.line);

/**
 * .what = the findsert itself, once the repo `.gitignore` mutex is held
 * .note = a negation for any other actor dir is dropped: under a manifest the repo actor is
 *         the `ambient:` actor, so a former repo actor dir (`repo=ambient`, or a prior
 *         `ambient:` slug) is ignored again, as the legacy `.default` dir is
 */
const genRepoActorGitignoreExclusionWithinLock = (input: {
  path: string;
  negation: string;
}): { rewritten: boolean; negation: 'FOUND' | 'APPENDED' | 'CREATED' } => {
  const { path, negation } = input;

  // rewrite a dir exclusion of `.actors` to its children form, and drop the negation of a
  //   former repo actor dir, only if one is present
  const contentBefore = existsSync(path) ? readFileSync(path, 'utf8') : null;
  const contentRewritten =
    contentBefore === null
      ? null
      : asActorsGitignoreContent({ content: contentBefore })
          .split('\n')
          .filter((line) => line === negation || !isActorDirNegation({ line }))
          .join('\n');

  // findsert the negation after it; the whole edit lands in one write
  const contentAfter = asTextWithLinesConverged({
    content: contentRewritten,
    linesAbsent: [],
    linesPresent: [negation],
  });
  if (contentAfter !== contentBefore)
    setFileAtomic({ path, content: contentAfter });

  return {
    rewritten: contentBefore !== contentRewritten,
    negation: asNegationEffect({ contentRewritten, negation }),
  };
};

/**
 * .what = how the negation line came to be present: already there, appended, or the file
 *         created to hold it
 */
const asNegationEffect = (input: {
  contentRewritten: string | null;
  negation: string;
}): 'FOUND' | 'APPENDED' | 'CREATED' => {
  if (input.contentRewritten === null) return 'CREATED';
  if (input.contentRewritten.split('\n').includes(input.negation))
    return 'FOUND';
  return 'APPENDED';
};
