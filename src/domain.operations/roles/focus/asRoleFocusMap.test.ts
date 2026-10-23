import { given, then } from 'test-fns';

import { asRoleFocusMap } from './asRoleFocusMap';

const TEST_CASES = [
  {
    description: 'bare roles are whole entries, in order',
    tokens: ['any', 'mechanic'],
    expected: [
      { role: 'any', subjects: null },
      { role: 'mechanic', subjects: null },
    ],
  },
  {
    description: 'a focused role carries its subject',
    tokens: ['any', 'mechanic::flow'],
    expected: [
      { role: 'any', subjects: null },
      { role: 'mechanic', subjects: ['flow'] },
    ],
  },
  {
    description: 'two foci of one role union into one entry',
    tokens: ['mechanic::code.prod', 'any', 'mechanic::flow'],
    expected: [
      { role: 'mechanic', subjects: ['code.prod', 'flow'] },
      { role: 'any', subjects: null },
    ],
  },
  {
    description: 'a repeated focus dedupes',
    tokens: ['mechanic::flow', 'mechanic::flow'],
    expected: [{ role: 'mechanic', subjects: ['flow'] }],
  },
  {
    description: 'the whole role absorbs a focus of it',
    tokens: ['mechanic::flow', 'mechanic'],
    expected: [{ role: 'mechanic', subjects: null }],
  },
  {
    description:
      'a repo-qualified and a bare focus of one role union into one entry, qualified',
    tokens: ['ehmpathy/mechanic::flow', 'mechanic::lean'],
    expected: [{ role: 'ehmpathy/mechanic', subjects: ['flow', 'lean'] }],
  },
  {
    description: 'a bare then a repo-qualified focus keep the qualified name',
    tokens: ['mechanic::lean', 'ehmpathy/mechanic::flow'],
    expected: [{ role: 'ehmpathy/mechanic', subjects: ['lean', 'flow'] }],
  },
  {
    description: 'two repos of one slug stay two entries',
    tokens: ['ehmpathy/mechanic::flow', 'other/mechanic::lean'],
    expected: [
      { role: 'ehmpathy/mechanic', subjects: ['flow'] },
      { role: 'other/mechanic', subjects: ['lean'] },
    ],
  },
];

describe('asRoleFocusMap', () => {
  given('[case1] an enrolled roleset', () => {
    TEST_CASES.forEach((testCase) =>
      then(testCase.description, () => {
        expect(asRoleFocusMap({ tokens: testCase.tokens })).toEqual(
          testCase.expected,
        );
      }),
    );
  });
});
