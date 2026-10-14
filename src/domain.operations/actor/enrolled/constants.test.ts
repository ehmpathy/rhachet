import { given, then, when } from 'test-fns';

import { relative } from 'node:path';
import { ACTORS_GITIGNORE_LINE } from './constants';
import { getActorsRootDir } from './getActorsRootDir';
import { getOneRepoActorOndiskDir } from './getOneRepoActorOndiskDir';

describe('constants', () => {
  const repoPath = '/repo';
  const actorsRootRel = relative(repoPath, getActorsRootDir({ repoPath }));
  const repoActorDirRel = relative(
    repoPath,
    getOneRepoActorOndiskDir({ repoPath }),
  );
  const repoActorDirFromRoot = relative(
    getActorsRootDir({ repoPath }),
    getOneRepoActorOndiskDir({ repoPath }),
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

      then('the repo negation names the repo actor dir', () => {
        expect(ACTORS_GITIGNORE_LINE.repoRepoActorNegation).toEqual(
          `!${repoActorDirRel}/`,
        );
      });

      then('the self negation names the repo actor dir from the root', () => {
        expect(ACTORS_GITIGNORE_LINE.selfRepoActorNegation).toEqual(
          `!/${repoActorDirFromRoot}/`,
        );
      });
    });
  });
});
