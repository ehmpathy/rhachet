import { given, then, when } from 'test-fns';

import { asActorsInStableOrder } from './asActorsInStableOrder';

describe('asActorsInStableOrder', () => {
  given('[case1] actors out of exid order', () => {
    const actors = [
      { exid: 'repo=ambient' },
      { exid: 'hash=9c1e0a2b' },
      { exid: 'hash=0f3d7e1c' },
    ];

    when('[t0] ordered', () => {
      const ordered = asActorsInStableOrder({ actors });

      then('exid low→high', () => {
        expect(ordered.map((actor) => actor.exid)).toEqual([
          'hash=0f3d7e1c',
          'hash=9c1e0a2b',
          'repo=ambient',
        ]);
      });

      then('the caller array is never mutated', () => {
        expect(actors.map((actor) => actor.exid)).toEqual([
          'repo=ambient',
          'hash=9c1e0a2b',
          'hash=0f3d7e1c',
        ]);
      });
    });
  });
});
