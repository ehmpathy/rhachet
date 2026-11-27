import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { asRoleModFaultFix } from './asRoleModFaultFix';

const TEST_CASES = [
  {
    description: 'a constraint that carries a fix returns it',
    given: {
      error: new ConstraintError('a mod is refused', {
        fix: 'delete the line',
      }),
    },
    expect: { output: 'delete the line' },
  },
  {
    description: 'a malfunction that carries a fix returns it',
    given: {
      error: new MalfunctionError('a record is unreadable', {
        fix: 'delete the record',
      }),
    },
    expect: { output: 'delete the record' },
  },
  {
    description:
      'a fix beside candidates carries them, since a surface shows no metadata',
    given: {
      error: new ConstraintError('a mod is refused', {
        'did you mean': 'alpha/surfer, beta/surfer',
        fix: 'pin one: `of: alpha/surfer`',
      }),
    },
    expect: {
      output:
        'pin one: `of: alpha/surfer` (did you mean: alpha/surfer, beta/surfer)',
    },
  },
  {
    description: 'a helpful error with no fix returns null',
    given: {
      error: new ConstraintError('a mod is refused', { mod: 'role=surfer' }),
    },
    expect: { output: null },
  },
  {
    description: 'a fix that is not a string returns null',
    given: { error: new ConstraintError('a mod is refused', { fix: 3 }) },
    expect: { output: null },
  },
  {
    description: 'a bare error returns null',
    given: { error: new Error('raw') },
    expect: { output: null },
  },
];

describe('asRoleModFaultFix', () => {
  given('[case1] each kind of mod fault', () => {
    TEST_CASES.map((thisCase) =>
      when(`[t0] ${thisCase.description}`, () => {
        then('the fix read is as expected', () => {
          expect(asRoleModFaultFix(thisCase.given)).toEqual(
            thisCase.expect.output,
          );
        });
      }),
    );
  });
});
