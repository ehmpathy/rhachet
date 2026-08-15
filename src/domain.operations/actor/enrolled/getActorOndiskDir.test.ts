import { given, then, when } from 'test-fns';

import { getActorOndiskDir } from './getActorOndiskDir';

describe('getActorOndiskDir', () => {
  given('[case1] a repo + hash', () => {
    when('[t0] the actor dir is derived', () => {
      const dir = getActorOndiskDir({
        repoPath: '/home/dev/repo',
        hash: '9c1e0af3',
      });

      then('it lands under .agent/.actors with the actor.via.hash key', () => {
        expect(dir).toEqual(
          '/home/dev/repo/.agent/.actors/actor.via.hash=9c1e0af3',
        );
      });
    });
  });

  given('[case2] the same hash in two different repos', () => {
    when('[t0] each actor dir is derived', () => {
      const a = getActorOndiskDir({ repoPath: '/repoA', hash: 'abcd1234' });
      const b = getActorOndiskDir({ repoPath: '/repoB', hash: 'abcd1234' });

      then('the two repos never collide on a bare hash', () => {
        expect(a).not.toEqual(b);
      });
    });
  });
});
