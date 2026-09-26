import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { asRoleSlugsInEnrollmentOrder } from '@src/domain.operations/actor/enrolled/asRoleSlugsInEnrollmentOrder';

import { asRoleRefsForEnrolledSlugs } from './asRoleRefsForEnrolledSlugs';

const REFS_LINKED = [
  { repo: '.this', role: 'any' },
  { repo: 'bhrain', role: 'driver' },
  { repo: 'ehmpathy', role: 'mechanic' },
  { repo: 'zeta', role: 'driver' },
];

describe('asRoleRefsForEnrolledSlugs', () => {
  given('[case1] every enrolled slug is linked', () => {
    when('[t0] mapped', () => {
      const refs = asRoleRefsForEnrolledSlugs({
        actorHash: 'abc12345',
        slugs: ['mechanic', 'driver'],
        refsLinked: REFS_LINKED,
      });

      then('the refs come back in enrollment order', () => {
        expect(refs.map((ref) => ref.role)).toEqual(
          asRoleSlugsInEnrollmentOrder({ slugs: ['mechanic', 'driver'] }),
        );
      });

      then('a slug linked from two repos maps to the first seen ref', () => {
        expect(refs).toContainEqual({ repo: 'bhrain', role: 'driver' });
        expect(refs).not.toContainEqual({ repo: 'zeta', role: 'driver' });
      });

      then('an unenrolled linked role is left out', () => {
        expect(refs.map((ref) => ref.role)).not.toContain('any');
      });
    });
  });

  given('[case2] an enrolled slug is no longer linked', () => {
    when('[t0] mapped', () => {
      then(
        'a ConstraintError names the actor, the slug, and both fixes',
        async () => {
          const error = await getError(async () =>
            asRoleRefsForEnrolledSlugs({
              actorHash: 'abc12345',
              slugs: ['mechanic', 'ghost'],
              refsLinked: REFS_LINKED,
            }),
          );

          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.message).toContain('abc12345');
          expect(error.message).toContain('ghost');
          expect(JSON.stringify(error)).toContain('re-link the role');
          expect(JSON.stringify(error)).toContain('end the actor');
        },
      );
    });
  });

  given('[case3] zero slugs', () => {
    when('[t0] mapped', () => {
      then('the result is empty', () => {
        expect(
          asRoleRefsForEnrolledSlugs({
            actorHash: 'abc12345',
            slugs: [],
            refsLinked: REFS_LINKED,
          }),
        ).toEqual([]);
      });
    });
  });
});
