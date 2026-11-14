import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { asRoleModTargetFromOf } from './asRoleModTargetFromOf';

const TEST_CASES_VALID = [
  {
    description: 'a bare role',
    of: 'mechanic',
    target: { repo: null, role: 'mechanic', version: null },
  },
  {
    description: 'a repo and a role',
    of: 'ehmpathy/mechanic',
    target: { repo: 'ehmpathy', role: 'mechanic', version: null },
  },
  {
    description: 'a bare role at a version',
    of: 'mechanic@1.39.5',
    target: { repo: null, role: 'mechanic', version: '1.39.5' },
  },
  {
    description: 'a repo and a role at a version',
    of: 'ehmpathy/mechanic@1.39.5',
    target: { repo: 'ehmpathy', role: 'mechanic', version: '1.39.5' },
  },
] as const;

const TEST_CASES_REFUSED = [
  { description: 'an absent of', of: undefined, problem: 'declares no `of:`' },
  { description: 'an empty of', of: '  ', problem: 'declares no `of:`' },
  { description: 'a non-string of', of: 7, problem: 'declares no `of:`' },
  {
    description: 'two versions',
    of: 'ehmpathy/mechanic@1@2',
    problem: 'is not a role spec',
  },
  {
    description: 'an empty version',
    of: 'ehmpathy/mechanic@',
    problem: 'is not a role spec',
  },
  {
    description: 'three path parts',
    of: 'a/b/mechanic',
    problem: 'is not a role spec',
  },
  {
    description: 'an empty repo',
    of: '/mechanic',
    problem: 'is not a role spec',
  },
  {
    description: 'another role slug',
    of: 'ehmpathy/driver',
    problem: 'names role=driver',
  },
  {
    description: 'a pin that is a range',
    of: 'ehmpathy/mechanic@^1.39.5',
    problem: 'which is not an exact release',
  },
  {
    description: 'a pin that is a tag',
    of: 'ehmpathy/mechanic@latest',
    problem: 'which is not an exact release',
  },
  {
    description: 'a pin with a v prefix',
    of: 'ehmpathy/mechanic@v1.39.5',
    problem: 'which is not an exact release',
  },
] as const;

describe('asRoleModTargetFromOf', () => {
  given('[case1] an of in each legal form', () => {
    TEST_CASES_VALID.map((thisCase) =>
      when(`[t0] it is ${thisCase.description}`, () => {
        then('it casts to the target', () => {
          expect(
            asRoleModTargetFromOf({
              of: thisCase.of,
              roleDir: 'mechanic',
              reposLinked: ['ehmpathy'],
            }),
          ).toEqual(expect.objectContaining(thisCase.target));
        });
      }),
    );
  });

  given('[case2] an of that names no role of this mod dir', () => {
    TEST_CASES_REFUSED.map((thisCase) =>
      when(`[t0] it is ${thisCase.description}`, () => {
        then(
          'a ConstraintError names the problem and the mod dir',
          async () => {
            const error = await getError(async () =>
              asRoleModTargetFromOf({
                of: thisCase.of,
                roleDir: 'mechanic',
                reposLinked: ['ehmpathy'],
              }),
            );
            expect(error).toBeInstanceOf(ConstraintError);
            expect(error.message).toContain(
              'the mod of role=mechanic is refused',
            );
            expect(error.message).toContain(thisCase.problem);
            expect(error.message).toMatchSnapshot();
          },
        );
      }),
    );
  });

  given('[case3] an absent of', () => {
    when('[t0] two linked repos hold the role', () => {
      then('the fix names each legal of', async () => {
        const error = await getError(async () =>
          asRoleModTargetFromOf({
            of: undefined,
            roleDir: 'mechanic',
            reposLinked: ['ehmpathy', 'surfco'],
          }),
        );
        expect(error.message).toContain('`of: ehmpathy/mechanic`');
        expect(error.message).toContain('`of: surfco/mechanic`');
        expect(error.message).not.toContain('<repo>');
      });
    });

    when('[t1] no linked repo holds the role', () => {
      then('the fix names the link that would supply one', async () => {
        const error = await getError(async () =>
          asRoleModTargetFromOf({
            of: undefined,
            roleDir: 'mechanic',
            reposLinked: [],
          }),
        );
        expect(error.message).toContain('no linked repo holds role=mechanic');
        expect(error.message).toContain('rhx init --roles <repo>/mechanic');
      });
    });
  });
});
