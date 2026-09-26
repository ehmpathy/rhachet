import { given, then, when } from 'test-fns';

import { asRoleSlugsInEnrollmentOrder } from '@src/domain.operations/actor/enrolled/asRoleSlugsInEnrollmentOrder';

import { asRoleRefsInEnrollmentOrder } from './asRoleRefsInEnrollmentOrder';

describe('asRoleRefsInEnrollmentOrder', () => {
  given('[case1] refs in an arbitrary order', () => {
    when('[t0] ordered', () => {
      const refs = [
        { repo: 'ehmpathy', role: 'mechanic' },
        { repo: 'bhrain', role: 'driver' },
        { repo: '.this', role: 'any' },
      ];
      const ordered = asRoleRefsInEnrollmentOrder({ refs });

      then(
        'the role order equals the enrollment comparator on the same slugs',
        () => {
          expect(ordered.map((ref) => ref.role)).toEqual(
            asRoleSlugsInEnrollmentOrder({
              slugs: refs.map((ref) => ref.role),
            }),
          );
        },
      );

      then('each ref keeps its repo', () => {
        expect(ordered).toContainEqual({ repo: 'bhrain', role: 'driver' });
      });
    });
  });

  given('[case2] refs already in order', () => {
    when('[t0] ordered', () => {
      then('the order is unchanged', () => {
        const refs = [
          { repo: 'a', role: 'architect' },
          { repo: 'b', role: 'mechanic' },
        ];
        expect(asRoleRefsInEnrollmentOrder({ refs })).toEqual(refs);
      });
    });
  });

  given('[case3] one ref', () => {
    when('[t0] ordered', () => {
      then('it is itself', () => {
        const refs = [{ repo: 'a', role: 'architect' }];
        expect(asRoleRefsInEnrollmentOrder({ refs })).toEqual(refs);
      });
    });
  });
});
