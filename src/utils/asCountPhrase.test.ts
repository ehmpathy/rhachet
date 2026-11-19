import { given, then, when } from 'test-fns';

import { asCountPhrase } from './asCountPhrase';

const TEST_CASES = [
  {
    description: 'a zero count takes the many form',
    given: { count: 0 },
    expect: { output: '0 clones refer' },
  },
  {
    description: 'a count of one takes the one form',
    given: { count: 1 },
    expect: { output: '1 clone refers' },
  },
  {
    description: 'a count of two takes the many form',
    given: { count: 2 },
    expect: { output: '2 clones refer' },
  },
  {
    description: 'a count of twelve takes the many form',
    given: { count: 12 },
    expect: { output: '12 clones refer' },
  },
];

describe('asCountPhrase', () => {
  given('[case1] a count with a one form and a many form', () => {
    TEST_CASES.map((thisCase) =>
      when(`[t0] ${thisCase.description}`, () => {
        then('it agrees in number with the count', () => {
          const output = asCountPhrase({
            count: thisCase.given.count,
            one: 'clone refers',
            many: 'clones refer',
          });
          expect(output).toEqual(thisCase.expect.output);
        });
      }),
    );
  });
});
