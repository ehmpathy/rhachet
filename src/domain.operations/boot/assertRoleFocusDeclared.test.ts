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
            focusFrom: 'typed',
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
            focusFrom: 'typed',
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
              focusFrom: 'typed',
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

    when(
      '[t3] a recorded focus names a subject a role upgrade dropped (U1)',
      () => {
        then(
          'it fails loud with the fix that works: end the live clones, or re-point the repo record',
          async () => {
            const error = await getError(() =>
              assertRoleFocusDeclared({
                slugRole: 'mechanic',
                subjects: ['101'],
                config: SPEC_SUBJECTED,
                focusFrom: 'recorded',
              }),
            );
            expect(error).toBeInstanceOf(ConstraintError);
            expect(error.message).toContain(
              "role 'mechanic' declares no subject '101'",
            );
            expect(error.message).toContain('end its live clones');
            expect(error.message).toContain('rhx init --roles +mechanic::');
            expect(error.message).not.toContain('focus one of');
            expect(error.message).toMatchSnapshot();
          },
        );
      },
    );
  });

  given(
    '[case1.b] a typed focus on init, which `prepare:rhachet` may have run (U6)',
    () => {
      when('[t0] the focus names an undeclared subject', () => {
        then(
          'the hint names the typo fix and the replay fix with --prep',
          async () => {
            const error = await getError(() =>
              assertRoleFocusDeclared({
                slugRole: 'mechanic',
                subjects: ['gone'],
                config: SPEC_SUBJECTED,
                focusFrom: 'typed.init',
              }),
            );
            expect(error).toBeInstanceOf(ConstraintError);
            expect(error.message).toContain(
              'focus one of: mechanic::code.prod, mechanic::flow',
            );
            expect(error.message).toContain('prepare:rhachet');
            expect(error.message).toContain(
              'rhx init --prep --roles +mechanic::<one of code.prod, flow>',
            );
            expect(error.message).toMatchSnapshot();
          },
        );
      });
    },
  );

  given('[case2] a role that declares no subjects', () => {
    when('[t0] the spec is simple mode', () => {
      then('a focus refuses as unfocusable', async () => {
        const error = await getError(() =>
          assertRoleFocusDeclared({
            slugRole: 'driver',
            subjects: ['flow'],
            config: SPEC_SIMPLE,
            focusFrom: 'typed',
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain(
          "role 'driver' declares no subjects, so it cannot be focused",
        );
        expect(error.message).toContain("name 'driver' whole");
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
            focusFrom: 'typed',
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('cannot be focused');
        expect(error.message).toMatchSnapshot();
      });
    });

    when(
      '[t1.b] the spec holds only `always:` — subject mode, zero subjects',
      () => {
        then(
          'a focus refuses as unfocusable, never with an empty list to pick from',
          async () => {
            const error = await getError(() =>
              assertRoleFocusDeclared({
                slugRole: 'driver',
                subjects: ['flow'],
                config: genSampleBootSpecSubjected({
                  subjects: [],
                  shedAlways: [],
                }),
                focusFrom: 'typed',
              }),
            );
            expect(error).toBeInstanceOf(ConstraintError);
            expect(error.message).toContain(
              "role 'driver' declares no subjects, so it cannot be focused",
            );
            expect(error.message).not.toContain('focus one of');
          },
        );
      },
    );

    when('[t2] the role is enrolled whole', () => {
      then('it passes', () => {
        expect(() =>
          assertRoleFocusDeclared({
            slugRole: 'driver',
            subjects: null,
            config: null,
            focusFrom: 'typed',
          }),
        ).not.toThrow();
      });
    });
  });
});
