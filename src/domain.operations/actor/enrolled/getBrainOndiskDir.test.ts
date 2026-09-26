import { given, then, when } from 'test-fns';

import { getBrainOndiskDir } from './getBrainOndiskDir';

describe('getBrainOndiskDir', () => {
  given('[case1] a hash actor dir', () => {
    when('[t0] its brain dir is computed', () => {
      then('it is <actorDir>/brain/.claude', () => {
        expect(
          getBrainOndiskDir({
            actorDir: '/repo/.agent/.actors/actor.via.hash=abc12345',
          }),
        ).toEqual('/repo/.agent/.actors/actor.via.hash=abc12345/brain/.claude');
      });
    });
  });

  given('[case2] the default actor dir', () => {
    when('[t0] its brain dir is computed', () => {
      then('it is <actorDir>/brain/.claude', () => {
        expect(
          getBrainOndiskDir({
            actorDir: '/repo/.agent/.actors/actor.via.slug=.default',
          }),
        ).toEqual('/repo/.agent/.actors/actor.via.slug=.default/brain/.claude');
      });
    });
  });

  given('[case3] an actor dir with a trail slash', () => {
    when('[t0] its brain dir is computed', () => {
      then('the path holds no double slash', () => {
        expect(getBrainOndiskDir({ actorDir: '/repo/actor/' })).toEqual(
          '/repo/actor/brain/.claude',
        );
      });
    });
  });
});
