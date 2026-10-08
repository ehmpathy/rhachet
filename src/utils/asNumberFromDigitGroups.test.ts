import { given, then, when } from 'test-fns';

import { asNumberFromDigitGroups } from './asNumberFromDigitGroups';

const TEST_CASES = [
  {
    description: 'an underscore-grouped literal casts to its number',
    given: { input: '5_000' },
    expect: { output: 5000 },
  },
  {
    description: 'a comma-grouped literal casts to its number',
    given: { input: '12,345' },
    expect: { output: 12345 },
  },
  {
    description: 'a run of digits with no separator casts to its number',
    given: { input: '800' },
    expect: { output: 800 },
  },
  {
    description: 'a real number passes through untouched',
    given: { input: 5000 },
    expect: { output: 5000 },
  },
  {
    description:
      'a doubled separator is returned unchanged, so the refusal shows it back',
    given: { input: '5__000' },
    expect: { output: '5__000' },
  },
  {
    description: 'a lead separator is returned unchanged',
    given: { input: '_5000' },
    expect: { output: '_5000' },
  },
  {
    description: 'a trail separator is returned unchanged',
    given: { input: '5000_' },
    expect: { output: '5000_' },
  },
  {
    description: 'a word is returned unchanged',
    given: { input: 'lots' },
    expect: { output: 'lots' },
  },
  {
    description: 'a null passes through untouched',
    given: { input: null },
    expect: { output: null },
  },
];

describe('asNumberFromDigitGroups', () => {
  given('[case1] each literal an author might write for a cap', () => {
    when('[t0] cast', () => {
      TEST_CASES.map((thisCase) =>
        then(thisCase.description, () => {
          expect(asNumberFromDigitGroups(thisCase.given.input)).toEqual(
            thisCase.expect.output,
          );
        }),
      );
    });
  });
});
