import { given, then } from 'test-fns';

import { asHookChangeSummary } from './asHookChangeSummary';

const TEST_CASES = [
  {
    description: 'every kind changed',
    given: { created: 2, updated: 1, deleted: 3 },
    expect: '+2, ~1, -3',
  },
  {
    description: 'only creations',
    given: { created: 3, updated: 0, deleted: 0 },
    expect: '+3',
  },
  {
    description: 'an update and a deletion',
    given: { created: 0, updated: 1, deleted: 1 },
    expect: '~1, -1',
  },
  {
    description: 'naught changed',
    given: { created: 0, updated: 0, deleted: 0 },
    expect: '',
  },
];

describe('asHookChangeSummary', () => {
  TEST_CASES.map((thisCase) =>
    given(thisCase.description, () => {
      then(`it reads '${thisCase.expect}'`, () => {
        expect(asHookChangeSummary(thisCase.given)).toEqual(thisCase.expect);
      });
    }),
  );
});
