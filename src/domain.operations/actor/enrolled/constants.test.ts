import { given, then, when } from 'test-fns';

import { relative } from 'node:path';
import { ACTORS_GITIGNORE_LINE } from './constants';
import { getActorsRootDir } from './getActorsRootDir';
import { getDefaultActorOndiskDir } from './getDefaultActorOndiskDir';

describe('constants', () => {
  const repoPath = '/repo';
  const actorsRootRel = relative(repoPath, getActorsRootDir({ repoPath }));
  const defaultDirRel = relative(
    repoPath,
    getDefaultActorOndiskDir({ repoPath }),
  );
  const defaultDirFromRoot = relative(
    getActorsRootDir({ repoPath }),
    getDefaultActorOndiskDir({ repoPath }),
  );

  given('[case1] the repo-relative form of the actors root', () => {
    when('[t0] each line is compared to the path owners', () => {
      then(
        'the repo children line names every child of the actors root',
        () => {
          expect(ACTORS_GITIGNORE_LINE.repoChildren).toEqual(
            `${actorsRootRel}/*`,
          );
        },
      );

      then('the repo negation names the default actor dir', () => {
        expect(ACTORS_GITIGNORE_LINE.repoDefaultNegation).toEqual(
          `!${defaultDirRel}/`,
        );
      });

      then(
        'the self negation names the default actor dir from the root',
        () => {
          expect(ACTORS_GITIGNORE_LINE.selfDefaultNegation).toEqual(
            `!/${defaultDirFromRoot}/`,
          );
        },
      );
    });
  });
});
