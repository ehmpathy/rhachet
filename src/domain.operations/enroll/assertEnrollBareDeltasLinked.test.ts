import { getError } from 'test-fns';

import { assertEnrollBareDeltasLinked } from './assertEnrollBareDeltasLinked';

const ROLES_LINKED = ['alpha', 'beta', 'mechanic'];

const CASES_REFUSED = [
  {
    description: 'a `+` typo beside an actor names the nearest role',
    passthrough: ['+alhpa'],
    message: "role delta '+alhpa' names no linked role, did you mean '+alpha'?",
  },
  {
    description: 'a `-` typo near a linked role names the nearest role',
    passthrough: ['-bta'],
    message: "role delta '-bta' names no linked role, did you mean '-beta'?",
  },
  {
    description:
      'a `+` word far from every role is still refused, with no guess',
    passthrough: ['+zzzzzzzz'],
    message: "role delta '+zzzzzzzz' names no linked role",
  },
  {
    description: 'a qualified `+repo/role` typo is refused',
    passthrough: ['+ehmpathy/mechanik'],
    message: "did you mean '+mechanic'?",
  },
];

const CASES_PASSED = [
  { description: 'a brain short flag', passthrough: ['-p', 'hello'] },
  { description: 'a brain long flag', passthrough: ['--model', 'sonnet'] },
  {
    description: 'a multi-letter `-` word near no role',
    passthrough: ['-xyzzyq'],
  },
  { description: 'a prompt word with no sigil', passthrough: ['alhpa'] },
  { description: 'a `+` followed by no word', passthrough: ['+1'] },
];

describe('assertEnrollBareDeltasLinked', () => {
  CASES_REFUSED.map((thisCase) =>
    test(`refused: ${thisCase.description}`, () => {
      const error = getError(() =>
        assertEnrollBareDeltasLinked({
          passthrough: thisCase.passthrough,
          rolesLinked: ROLES_LINKED,
        }),
      );
      expect(error.message).toContain(thisCase.message);
    }),
  );

  CASES_PASSED.map((thisCase) =>
    test(`passed: ${thisCase.description}`, () => {
      expect(() =>
        assertEnrollBareDeltasLinked({
          passthrough: thisCase.passthrough,
          rolesLinked: ROLES_LINKED,
        }),
      ).not.toThrow();
    }),
  );
});
