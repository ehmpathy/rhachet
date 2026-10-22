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
        actorExid: 'abc12345',
        slugs: ['mechanic', 'driver'],
        refsLinked: REFS_LINKED,
      });

      then('the refs come back in enrollment order', () => {
        expect(refs.map((ref) => ref.role)).toEqual(
          asRoleSlugsInEnrollmentOrder({ slugs: ['mechanic', 'driver'] }),
        );
      });

      then('a slug linked from two repos maps to the first seen ref', () => {
        expect(refs).toContainEqual({
          repo: 'bhrain',
          role: 'driver',
          subjects: null,
        });
        expect(refs).not.toContainEqual({
          repo: 'zeta',
          role: 'driver',
          subjects: null,
        });
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
              actorExid: 'abc12345',
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
            actorExid: 'abc12345',
            slugs: [],
            refsLinked: REFS_LINKED,
          }),
        ).toEqual([]);
      });
    });
  });

  given('[case4] an enrolled slug at a subject focus', () => {
    when('[t0] mapped', () => {
      const refs = asRoleRefsForEnrolledSlugs({
        actorExid: 'abc12345',
        slugs: ['any', 'mechanic::code.prod', 'mechanic::flow'],
        refsLinked: REFS_LINKED,
      });

      then('the focused role maps to its linked ref, with its subjects', () => {
        expect(refs).toContainEqual({
          repo: 'ehmpathy',
          role: 'mechanic',
          subjects: ['code.prod', 'flow'],
        });
      });

      then('a bare role maps with no focus', () => {
        expect(refs).toContainEqual({
          repo: '.this',
          role: 'any',
          subjects: null,
        });
      });

      then('the focused role is one ref, never two', () => {
        expect(refs.filter((ref) => ref.role === 'mechanic')).toHaveLength(1);
      });
    });
  });

  given('[case5] an enrolled slug qualified by its repo (Q1)', () => {
    when('[t0] mapped, whole and focused', () => {
      const refs = asRoleRefsForEnrolledSlugs({
        actorExid: 'abc12345',
        slugs: ['.this/any', 'ehmpathy/mechanic::flow'],
        refsLinked: REFS_LINKED,
      });

      then('each maps to its linked ref, as the bare slug does', () => {
        expect(refs).toEqual(
          expect.arrayContaining([
            { repo: '.this', role: 'any', subjects: null },
            { repo: 'ehmpathy', role: 'mechanic', subjects: ['flow'] },
          ]),
        );
        expect(refs).toHaveLength(2);
      });
    });

    when('[t1] mapped, qualified by a repo that does not link it', () => {
      then('it reads as unlinked', async () => {
        const error = await getError(async () =>
          asRoleRefsForEnrolledSlugs({
            actorExid: 'abc12345',
            slugs: ['bhuild/mechanic'],
            refsLinked: REFS_LINKED,
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('bhuild/mechanic');
        expect(error.message).toMatchSnapshot();
      });
    });
  });
});
