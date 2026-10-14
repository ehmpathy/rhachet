import { given, then, when } from 'test-fns';

import { getOneRepoActorOndiskDir } from './getOneRepoActorOndiskDir';

describe('getOneRepoActorOndiskDir', () => {
  given('[case1] a repo path', () => {
    when('[t0] the repo actor dir is derived', () => {
      then('it is the `repo=ambient` dir under .agent/.actors', () => {
        expect(getOneRepoActorOndiskDir({ repoPath: '/repo' })).toEqual(
          '/repo/.agent/.actors/actor.via.repo=ambient',
        );
      });
    });
  });
});
