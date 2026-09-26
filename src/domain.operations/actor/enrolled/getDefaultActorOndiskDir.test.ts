import { given, then, when } from 'test-fns';

import { getDefaultActorOndiskDir } from './getDefaultActorOndiskDir';

describe('getDefaultActorOndiskDir', () => {
  given('[case1] a repo path', () => {
    when('[t0] the default actor dir is derived', () => {
      then('it is the reserved slug dir under .agent/.actors', () => {
        expect(getDefaultActorOndiskDir({ repoPath: '/repo' })).toEqual(
          '/repo/.agent/.actors/actor.via.slug=.default',
        );
      });
    });
  });
});
