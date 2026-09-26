import { given, then, when } from 'test-fns';

import { asRoleRefsFirstSeenPerRole } from './asRoleRefsFirstSeenPerRole';

describe('asRoleRefsFirstSeenPerRole', () => {
  given('[case1] distinct roles', () => {
    when('[t0] deduped', () => {
      then('every ref is kept, in order', () => {
        const refs = [
          { repo: 'a', role: 'mechanic' },
          { repo: 'b', role: 'driver' },
        ];
        expect(asRoleRefsFirstSeenPerRole({ refs })).toEqual(refs);
      });
    });
  });

  given('[case2] one slug in two repos', () => {
    when('[t0] deduped', () => {
      then('the first is kept', () => {
        expect(
          asRoleRefsFirstSeenPerRole({
            refs: [
              { repo: 'a', role: 'reviewer' },
              { repo: 'b', role: 'driver' },
              { repo: 'c', role: 'reviewer' },
            ],
          }),
        ).toEqual([
          { repo: 'a', role: 'reviewer' },
          { repo: 'b', role: 'driver' },
        ]);
      });
    });
  });

  given('[case3] no refs', () => {
    when('[t0] deduped', () => {
      then('the result is empty', () => {
        expect(asRoleRefsFirstSeenPerRole({ refs: [] })).toEqual([]);
      });
    });
  });
});
