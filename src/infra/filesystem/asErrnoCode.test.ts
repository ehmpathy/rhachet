import { given, then, when } from 'test-fns';

import { asErrnoCode } from './asErrnoCode';

const TEST_CASES = [
  {
    description: 'an fs error yields its code',
    given: { error: Object.assign(new Error('denied'), { code: 'EACCES' }) },
    expect: { output: 'EACCES' },
  },
  {
    description:
      'a plain object with a string code yields it, as an error of another realm would',
    given: { error: { code: 'ENOTDIR' } },
    expect: { output: 'ENOTDIR' },
  },
  {
    description: 'an error with no code yields null',
    given: { error: new Error('no code') },
    expect: { output: null },
  },
  {
    description: 'a code that is no string yields null',
    given: { error: { code: 13 } },
    expect: { output: null },
  },
  {
    description: 'null yields null',
    given: { error: null },
    expect: { output: null },
  },
  {
    description: 'a string yields null',
    given: { error: 'EACCES' },
    expect: { output: null },
  },
];

describe('asErrnoCode', () => {
  given('[case1] each kind of thrown value', () => {
    TEST_CASES.map((thisCase) =>
      when(`[t0] ${thisCase.description}`, () => {
        then('the code read is as expected', () => {
          expect(asErrnoCode(thisCase.given)).toEqual(thisCase.expect.output);
        });
      }),
    );
  });
});
