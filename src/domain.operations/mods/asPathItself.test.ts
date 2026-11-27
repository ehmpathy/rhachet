import { given, then, when } from 'test-fns';

import { asPathItself } from './asPathItself';

describe('asPathItself', () => {
  given('[case1] a path the walk listed', () => {
    when('[t0] the path to read is asked for', () => {
      then('it is the same path', () => {
        expect(asPathItself('/repo/.agent/repo=x/role=y/briefs/a.md')).toEqual(
          '/repo/.agent/repo=x/role=y/briefs/a.md',
        );
      });
    });
  });
});
