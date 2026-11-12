import { given, then, when } from 'test-fns';

import { asRoleRefsInCacheOrder } from './asRoleRefsInCacheOrder';

describe('asRoleRefsInCacheOrder', () => {
  given('[case1] published and repo=.this roles, interleaved by slug', () => {
    const refs = [
      { repo: '.this', role: 'any' },
      { repo: 'ehmpathy', role: 'mechanic' },
      { repo: '.this', role: 'keyrack' },
      { repo: 'bhrain', role: 'driver' },
    ];

    when('[t0] the refs are ordered for the cache', () => {
      const ordered = asRoleRefsInCacheOrder({ refs });

      then(
        'the published roles are apart from the local ones, in slug order',
        () => {
          expect(ordered.published).toEqual([
            { repo: 'bhrain', role: 'driver' },
            { repo: 'ehmpathy', role: 'mechanic' },
          ]);
        },
      );

      then('the repo=.this roles are the tail, in slug order', () => {
        expect(ordered.local).toEqual([
          { repo: '.this', role: 'any' },
          { repo: '.this', role: 'keyrack' },
        ]);
      });
    });

    when('[t1] the same refs arrive in another order', () => {
      then('the split is the same', () => {
        expect(asRoleRefsInCacheOrder({ refs: [...refs].reverse() })).toEqual(
          asRoleRefsInCacheOrder({ refs }),
        );
      });
    });
  });

  given('[case2] only published roles', () => {
    when('[t0] the refs are ordered for the cache', () => {
      then('the local tail is empty', () => {
        expect(
          asRoleRefsInCacheOrder({
            refs: [{ repo: 'ehmpathy', role: 'mechanic' }],
          }).local,
        ).toEqual([]);
      });
    });
  });
});
