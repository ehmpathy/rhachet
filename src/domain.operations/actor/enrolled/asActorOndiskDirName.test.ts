import { given, then, when } from 'test-fns';

import { basename } from 'node:path';
import { asActorOndiskDirName } from './asActorOndiskDirName';
import {
  ACTORS_GITIGNORE_LINE,
  REPO_ACTOR_DIR_NAME,
  REPO_ACTOR_EXID,
} from './constants';
import { getActorOndiskDir } from './getActorOndiskDir';

describe('asActorOndiskDirName', () => {
  given('[case1] a hash actor exid', () => {
    when('[t0] the dir name is rendered', () => {
      then('it is the `actor.via.<exid>` token', () => {
        expect(asActorOndiskDirName({ exid: 'hash=9c1e0000' })).toEqual(
          'actor.via.hash=9c1e0000',
        );
      });
      then(
        'it is the token the full-path builder composes (single source of truth)',
        () => {
          // the whole point of the transformer: getActorOndiskDir must end with the
          // exact token, so a format change touches ONLY asActorOndiskDirName
          const dir = getActorOndiskDir({
            repoPath: '/repo',
            exid: 'hash=abcd1234',
          });
          expect(
            dir.endsWith(asActorOndiskDirName({ exid: 'hash=abcd1234' })),
          ).toBe(true);
        },
      );
    });
  });

  given('[case2] the repo actor exid', () => {
    when('[t0] the dir name is rendered', () => {
      then(
        'it is the dir name the gitignore writers and the migration use',
        () => {
          // pinned to the literal, not derived from the constant, so a format change that
          //   moves one and not the other fails here rather than desync the repo actor's
          //   gitignore negation from the dir every reader derives
          expect(REPO_ACTOR_DIR_NAME).toEqual('actor.via.repo=ambient');
          expect(
            basename(
              getActorOndiskDir({ repoPath: '/repo', exid: REPO_ACTOR_EXID }),
            ),
          ).toEqual(REPO_ACTOR_DIR_NAME);
          expect(ACTORS_GITIGNORE_LINE.repoRepoActorNegation).toEqual(
            '!.agent/.actors/actor.via.repo=ambient/',
          );
        },
      );
    });
  });
});
