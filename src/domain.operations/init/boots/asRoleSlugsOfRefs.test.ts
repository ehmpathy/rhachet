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

  given('[case3] one slug linked by two repos', () => {
    when('[t0] their slugs are read', () => {
      then('the slug is named once, at its first place', () => {
        expect(
          asRoleSlugsOfRefs({
            refs: [
              { repo: '.this', role: 'surfer' },
              { repo: 'ehmpathy', role: 'mechanic' },
              { repo: 'test', role: 'surfer' },
            ],
          }),
        ).toEqual(['surfer', 'mechanic']);
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
