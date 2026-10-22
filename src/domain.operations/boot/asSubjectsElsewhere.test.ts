import { given, then, when } from 'test-fns';

import { asSubjectsElsewhere } from './asSubjectsElsewhere';

const TEST_CASES: Array<{
  description: string;
  given: { declared: string[]; given: string[] };
  expect: string[];
}> = [
  {
    description:
      'a focus on one of four subjects leaves the other three, in declared order',
    given: {
      declared: ['code.prod', 'code.test', 'arch', 'flow'],
      given: ['flow'],
    },
    expect: ['code.prod', 'code.test', 'arch'],
  },
  {
    description: 'a focus on every subject leaves none',
    given: { declared: ['code.prod', 'flow'], given: ['flow', 'code.prod'] },
    expect: [],
  },
];

describe('asSubjectsElsewhere', () => {
  given('[case1] a role with declared subjects', () => {
    TEST_CASES.forEach((thisCase) =>
      when(`[t0] ${thisCase.description}`, () => {
        then('it returns the subjects not given', () => {
          expect(asSubjectsElsewhere(thisCase.given)).toEqual(thisCase.expect);
        });
      }),
    );
  });
});
