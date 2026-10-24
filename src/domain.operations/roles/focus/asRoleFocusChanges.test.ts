import { asRoleFocusChanges } from './asRoleFocusChanges';

const TEST_CASES = [
  {
    description: 'a focus atop a whole role narrows it',
    given: {
      rolesBefore: ['any', 'mechanic'],
      rolesAfter: ['any', 'mechanic::101'],
      additions: ['mechanic::101'],
    },
    expect: [{ role: 'mechanic', kind: 'narrow', from: null, to: ['101'] }],
  },
  {
    description: 'a focus atop another focus moves it',
    given: {
      rolesBefore: ['mechanic::flow'],
      rolesAfter: ['mechanic::101'],
      additions: ['mechanic::101'],
    },
    expect: [{ role: 'mechanic', kind: 'move', from: ['flow'], to: ['101'] }],
  },
  {
    description: 'a whole role atop a focus widens it',
    given: {
      rolesBefore: ['mechanic::flow'],
      rolesAfter: ['mechanic'],
      additions: ['mechanic'],
    },
    expect: [{ role: 'mechanic', kind: 'widen', from: ['flow'], to: null }],
  },
  {
    description: 'a repo-qualified token names the same role as a bare one',
    given: {
      rolesBefore: ['mechanic'],
      rolesAfter: ['ehmpathy/mechanic::101'],
      additions: ['ehmpathy/mechanic::101'],
    },
    expect: [
      { role: 'ehmpathy/mechanic', kind: 'narrow', from: null, to: ['101'] },
    ],
  },
  {
    description:
      'a focus re-typed atop the same held focus is named unchanged (E2)',
    given: {
      rolesBefore: ['any', 'mechanic::flow'],
      rolesAfter: ['any', 'mechanic::flow'],
      additions: ['mechanic::flow'],
    },
    expect: [
      { role: 'mechanic', kind: 'unchanged', from: ['flow'], to: ['flow'] },
    ],
  },
  {
    description: 'a repo-qualified re-type of a held focus is named unchanged',
    given: {
      rolesBefore: ['mechanic::flow'],
      rolesAfter: ['mechanic::flow'],
      additions: ['ehmpathy/mechanic::flow'],
    },
    expect: [
      { role: 'mechanic', kind: 'unchanged', from: ['flow'], to: ['flow'] },
    ],
  },
  {
    description:
      'a bare role re-typed atop the same held whole role stays silent (P6)',
    given: {
      rolesBefore: ['any', 'mechanic'],
      rolesAfter: ['any', 'mechanic'],
      additions: ['mechanic'],
    },
    expect: [],
  },
  {
    description: 'a held focus no addition named stays silent',
    given: {
      rolesBefore: ['mechanic::flow', 'driver'],
      rolesAfter: ['mechanic::flow', 'driver', 'architect'],
      additions: ['architect'],
    },
    expect: [],
  },
  {
    description: 'foci in another order are the same focus',
    given: {
      rolesBefore: ['mechanic::a', 'mechanic::b'],
      rolesAfter: ['mechanic::b', 'mechanic::a'],
      additions: [],
    },
    expect: [],
  },
  {
    description: 'a role first taken at a focus is given it',
    given: {
      rolesBefore: ['any', 'driver'],
      rolesAfter: ['any', 'mechanic::101'],
      additions: ['mechanic::101'],
    },
    expect: [{ role: 'mechanic', kind: 'given', from: null, to: ['101'] }],
  },
  {
    description: 'an exact set held naught, so each focus in it is given',
    given: {
      rolesBefore: [],
      rolesAfter: ['any', 'director', 'mechanic::flow'],
      additions: [],
    },
    expect: [{ role: 'mechanic', kind: 'given', from: null, to: ['flow'] }],
  },
  {
    description: 'a whole role added or removed is no focus change',
    given: {
      rolesBefore: ['any', 'driver'],
      rolesAfter: ['any', 'mechanic'],
      additions: ['mechanic'],
    },
    expect: [],
  },
  {
    description: 'no focus anywhere yields no change',
    given: {
      rolesBefore: ['any', 'mechanic'],
      rolesAfter: ['any', 'mechanic'],
      additions: [],
    },
    expect: [],
  },
];

describe('asRoleFocusChanges', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(asRoleFocusChanges(thisCase.given)).toEqual(thisCase.expect);
    }),
  );
});
