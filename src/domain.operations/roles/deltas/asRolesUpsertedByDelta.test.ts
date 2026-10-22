import { asRolesUpsertedByDelta } from './asRolesUpsertedByDelta';

const TEST_CASES: Array<{
  description: string;
  given: { rolesHeld: string[]; additions: string[]; removals: string[] };
  expect: { output: string[] };
}> = [
  {
    description: 'a focus narrows a held whole role in place',
    given: {
      rolesHeld: ['driver', 'mechanic'],
      additions: ['mechanic::flow'],
      removals: [],
    },
    expect: { output: ['driver', 'mechanic::flow'] },
  },
  {
    description: 'a focus moves a held focus in place',
    given: {
      rolesHeld: ['mechanic::code.prod'],
      additions: ['mechanic::flow'],
      removals: [],
    },
    expect: { output: ['mechanic::flow'] },
  },
  {
    description: 'a whole role widens a held focus',
    given: {
      rolesHeld: ['mechanic::flow'],
      additions: ['mechanic'],
      removals: [],
    },
    expect: { output: ['mechanic'] },
  },
  {
    description:
      'a repo-qualified addition of the held focus keeps the held form',
    given: {
      rolesHeld: ['mechanic'],
      additions: ['ehmpathy/mechanic'],
      removals: [],
    },
    expect: { output: ['mechanic'] },
  },
  {
    description: 'a repo-qualified focus narrows a bare held role to one entry',
    given: {
      rolesHeld: ['ehmpathy/mechanic'],
      additions: ['mechanic::flow'],
      removals: [],
    },
    expect: { output: ['mechanic::flow'] },
  },
  {
    description: 'a removal drops the role whatever its focus',
    given: {
      rolesHeld: ['ehmpathy/mechanic::flow', 'driver'],
      additions: [],
      removals: ['mechanic'],
    },
    expect: { output: ['driver'] },
  },
  {
    description: 'an addition of an unheld role appends, once',
    given: {
      rolesHeld: ['driver'],
      additions: ['architect', 'architect'],
      removals: [],
    },
    expect: { output: ['driver', 'architect'] },
  },
];

describe('asRolesUpsertedByDelta', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(asRolesUpsertedByDelta(thisCase.given)).toEqual(
        thisCase.expect.output,
      );
    }),
  );
});
