import { ConstraintError } from 'helpful-errors';
import { getError, given, then, useBeforeAll, when } from 'test-fns';

import { genSampleRepoWithSubjects } from '@src/.test/assets/genSampleRepoWithSubjects';

import { assertRoleFociDeclared } from './assertRoleFociDeclared';

describe('assertRoleFociDeclared', () => {
  given('[case1] a linked role that declares flow and lean', () => {
    const scene = useBeforeAll(async () => ({
      repoPath: genSampleRepoWithSubjects({
        slug: 'assertRoleFociDeclared-c1',
      }),
    }));

    when('[t0] each ref names a declared focus, or none', () => {
      then('it passes', () => {
        expect(() =>
          assertRoleFociDeclared({
            refs: [
              { repo: '.this', role: 'any', subjects: ['flow', 'lean'] },
              { repo: 'fixture', role: 'zeta', subjects: null },
            ],
            rolesFocusTyped: ['any', 'zeta'],
            repoPath: scene.repoPath,
          }),
        ).not.toThrow();
      });
    });

    when('[t1] a ref names an undeclared focus (wish 5)', () => {
      then('it refuses and names the declared subjects', async () => {
        const error = await getError(() =>
          assertRoleFociDeclared({
            refs: [{ repo: '.this', role: 'any', subjects: ['nope'] }],
            rolesFocusTyped: ['any', 'zeta'],
            repoPath: scene.repoPath,
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain(
          "role 'any' declares no subject 'nope'",
        );
        expect(error.message).toContain('any::flow, any::lean');
      });
    });

    when('[t2] a focus names a role that declares no subjects', () => {
      then('it refuses as unfocusable', async () => {
        const error = await getError(() =>
          assertRoleFociDeclared({
            refs: [{ repo: 'fixture', role: 'zeta', subjects: ['flow'] }],
            rolesFocusTyped: ['any', 'zeta'],
            repoPath: scene.repoPath,
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('cannot be focused');
      });
    });

    when(
      '[t3] an undeclared focus the caller never typed (inherited from the record)',
      () => {
        then(
          'it refuses with the recorded hint, never the typo hint',
          async () => {
            const error = await getError(() =>
              assertRoleFociDeclared({
                refs: [{ repo: '.this', role: 'any', subjects: ['nope'] }],
                rolesFocusTyped: [],
                repoPath: scene.repoPath,
              }),
            );
            expect(error).toBeInstanceOf(ConstraintError);
            expect(error.message).toContain('the focus was recorded');
            expect(error.message).toContain('rhx init --roles +any::');
            expect(error.message).not.toContain('focus one of');
          },
        );
      },
    );
  });
});
