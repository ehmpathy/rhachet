import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { asRoleFocusParts } from './asRoleFocusParts';

const TEST_CASES = [
  {
    description: 'a bare role is the whole role',
    token: 'mechanic',
    expected: { role: 'mechanic', subject: null },
  },
  {
    description: 'a focus splits into role and subject',
    token: 'mechanic::flow',
    expected: { role: 'mechanic', subject: 'flow' },
  },
  {
    description: 'a dotted subject stays whole',
    token: 'mechanic::code.prod',
    expected: { role: 'mechanic', subject: 'code.prod' },
  },
  {
    description: 'a repo-qualified focus keeps its repo on the role',
    token: 'ehmpathy/mechanic::flow',
    expected: { role: 'ehmpathy/mechanic', subject: 'flow' },
  },
];

describe('asRoleFocusParts', () => {
  given('[case1] a well-formed token', () => {
    TEST_CASES.forEach((testCase) =>
      then(testCase.description, () => {
        expect(asRoleFocusParts({ token: testCase.token })).toEqual(
          testCase.expected,
        );
      }),
    );
  });

  given('[case2] a malformed focus', () => {
    ['mechanic::', '::flow', 'mechanic::a::b'].forEach((token) =>
      when(`[t0] the token is '${token}'`, () => {
        then('it refuses and names the shape', async () => {
          const error = await getError(() => asRoleFocusParts({ token }));
          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.message).toContain('must read <role>::<subject>');
          expect(error.message).toMatchSnapshot();
        });
      }),
    );
  });
});
