import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { genSampleBootSpecSubjected } from '@src/.test/assets/genSampleBootSpecSubjected';
import { RoleBootSpecSimplified } from '@src/domain.objects/RoleBootSpec';

import { assertRoleFocusDeclared } from './assertRoleFocusDeclared';

const SPEC_SUBJECTED = genSampleBootSpecSubjected({
  subjects: ['code.prod', 'flow'],
  shedAlways: [],
});

const SPEC_SIMPLE = new RoleBootSpecSimplified({
  mode: 'simple',
  budget: null,
  briefs: null,
  skills: null,
});

describe('assertRoleFocusDeclared', () => {
  given('[case1] a role that declares subjects', () => {
    when('[t0] the focus names a declared subject', () => {
      then('it passes', () => {
        expect(() =>
          assertRoleFocusDeclared({
            slugRole: 'mechanic',
            subjects: ['flow'],
            config: SPEC_SUBJECTED,
          }),
        ).not.toThrow();
      });
    });

    when('[t1] the role is enrolled whole', () => {
      then('it passes with no subject check', () => {
        expect(() =>
          assertRoleFocusDeclared({
            slugRole: 'mechanic',
            subjects: null,
            config: SPEC_SUBJECTED,
          }),
        ).not.toThrow();
      });
    });

    when('[t2] the focus names an undeclared subject (wish 5)', () => {
      then(
        'it fails loud and names the role, the focus, and the declared subjects',
        async () => {
          const error = await getError(() =>
            assertRoleFocusDeclared({
              slugRole: 'mechanic',
              subjects: ['flow', '101'],
              config: SPEC_SUBJECTED,
            }),
          );
          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.message).toContain(
            "role 'mechanic' declares no subject '101'",
          );
          expect(error.message).toContain(
            'focus one of: mechanic::code.prod, mechanic::flow',
          );
          expect(error.message).toMatchSnapshot();
        },
      );
    });
  });

  given('[case2] a role that declares no subjects', () => {
    when('[t0] the spec is simple mode', () => {
      then('a focus refuses as unfocusable', async () => {
        const error = await getError(() =>
          assertRoleFocusDeclared({
            slugRole: 'driver',
            subjects: ['flow'],
            config: SPEC_SIMPLE,
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain(
          "role 'driver' declares no subjects, so it cannot be focused",
        );
        expect(error.message).toContain("enroll 'driver' whole");
        expect(error.message).toMatchSnapshot();
      });
    });

    when('[t1] the role has no boot spec at all', () => {
      then('a focus refuses as unfocusable', async () => {
        const error = await getError(() =>
          assertRoleFocusDeclared({
            slugRole: 'driver',
            subjects: ['flow'],
            config: null,
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('cannot be focused');
        expect(error.message).toMatchSnapshot();
      });
    });

    when('[t2] the role is enrolled whole', () => {
      then('it passes', () => {
        expect(() =>
          assertRoleFocusDeclared({
            slugRole: 'driver',
            subjects: null,
            config: null,
          }),
        ).not.toThrow();
      });
    });
  });
});
