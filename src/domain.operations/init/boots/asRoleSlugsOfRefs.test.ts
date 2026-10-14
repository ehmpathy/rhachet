import { given, then, when } from 'test-fns';

import { asRoleSlugsOfRefs } from './asRoleSlugsOfRefs';

describe('asRoleSlugsOfRefs', () => {
  given('[case1] refs from two repos', () => {
    when('[t0] their slugs are read', () => {
      then('each role slug is named, in the refs order', () => {
        expect(
          asRoleSlugsOfRefs({
            refs: [
              { repo: 'ehmpathy', role: 'mechanic' },
              { repo: '.this', role: 'any' },
              { repo: 'bhrain', role: 'driver' },
            ],
          }),
        ).toEqual(['mechanic', 'any', 'driver']);
      });
    });
  });

  given('[case2] no refs', () => {
    when('[t0] their slugs are read', () => {
      then('the list is empty', () => {
        expect(asRoleSlugsOfRefs({ refs: [] })).toEqual([]);
      });
    });
  });
});
