import { given, then } from 'test-fns';

import { asHookChangeTally } from './asHookChangeTally';

const TEST_CASES = [
  {
    description: 'no change yields three empty lists',
    given: {
      before: new Map([['a', '1']]),
      after: new Map([['a', '1']]),
    },
    expect: { created: [], updated: [], deleted: [] },
  },
  {
    description: 'a new key is created, a lost key is deleted',
    given: {
      before: new Map([['a', '1']]),
      after: new Map([['b', '1']]),
    },
    expect: { created: ['b'], updated: [], deleted: ['a'] },
  },
  {
    description: 'a kept key with a new body is updated',
    given: {
      before: new Map([
        ['a', '1'],
        ['b', '1'],
      ]),
      after: new Map([
        ['a', '2'],
        ['b', '1'],
      ]),
    },
    expect: { created: [], updated: ['a'], deleted: [] },
  },
];

describe('asHookChangeTally', () => {
  TEST_CASES.map((thisCase) =>
    given(thisCase.description, () => {
      then('the tally matches', () => {
        expect(asHookChangeTally(thisCase.given)).toEqual(thisCase.expect);
      });
    }),
  );
});
