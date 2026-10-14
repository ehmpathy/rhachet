import { given, then } from 'test-fns';

import { isActorExidMatchedByPrefix } from './isActorExidMatchedByPrefix';

const TEST_CASES = [
  {
    description: 'the whole exid matches itself',
    given: { exid: 'hash=9c1e0a7b', prefix: 'hash=9c1e0a7b' },
    expect: true,
  },
  {
    description: 'a prefix of the whole exid matches',
    given: { exid: 'hash=9c1e0a7b', prefix: 'hash=9c' },
    expect: true,
  },
  {
    description: 'a prefix of the value alone matches',
    given: { exid: 'hash=9c1e0a7b', prefix: '9c1e' },
    expect: true,
  },
  {
    description: 'the repo actor matches by its value',
    given: { exid: 'repo=ambient', prefix: 'ambient' },
    expect: true,
  },
  {
    description: 'a prefix of another value does not match',
    given: { exid: 'hash=9c1e0a7b', prefix: 'aa' },
    expect: false,
  },
  {
    description: 'a mid-value fragment does not match',
    given: { exid: 'hash=9c1e0a7b', prefix: '1e0a' },
    expect: false,
  },
];

describe('isActorExidMatchedByPrefix', () => {
  TEST_CASES.map((thisCase) =>
    given(thisCase.description, () => {
      then(`it reads ${thisCase.expect}`, () => {
        expect(isActorExidMatchedByPrefix(thisCase.given)).toEqual(
          thisCase.expect,
        );
      });
    }),
  );
});
