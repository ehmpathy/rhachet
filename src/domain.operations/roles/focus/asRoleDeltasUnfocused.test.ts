import { RoleDelta } from '@src/domain.objects/RoleDelta';

import { asRoleDeltasUnfocused } from './asRoleDeltasUnfocused';

const TEST_CASES = [
  {
    description: 'an unfocused delta passes as is',
    given: { deltas: [new RoleDelta({ kind: 'addition', role: 'mechanic' })] },
    expect: { output: [new RoleDelta({ kind: 'addition', role: 'mechanic' })] },
  },
  {
    description: 'a focus is stripped to its role',
    given: {
      deltas: [new RoleDelta({ kind: 'addition', role: 'mechanic::101' })],
    },
    expect: { output: [new RoleDelta({ kind: 'addition', role: 'mechanic' })] },
  },
  {
    description: 'a repo qualifier survives the strip',
    given: {
      deltas: [
        new RoleDelta({ kind: 'absolute', role: 'ehmpathy/mechanic::flow' }),
      ],
    },
    expect: {
      output: [new RoleDelta({ kind: 'absolute', role: 'ehmpathy/mechanic' })],
    },
  },
  {
    description: 'two foci of one role link it once (S2)',
    given: {
      deltas: [
        new RoleDelta({ kind: 'absolute', role: 'mechanic::code.prod' }),
        new RoleDelta({ kind: 'absolute', role: 'mechanic::flow' }),
        new RoleDelta({ kind: 'absolute', role: 'any' }),
      ],
    },
    expect: {
      output: [
        new RoleDelta({ kind: 'absolute', role: 'mechanic' }),
        new RoleDelta({ kind: 'absolute', role: 'any' }),
      ],
    },
  },
  {
    description: 'one role under two kinds stays two deltas',
    given: {
      deltas: [
        new RoleDelta({ kind: 'addition', role: 'mechanic::flow' }),
        new RoleDelta({ kind: 'subtraction', role: 'mechanic' }),
      ],
    },
    expect: {
      output: [
        new RoleDelta({ kind: 'addition', role: 'mechanic' }),
        new RoleDelta({ kind: 'subtraction', role: 'mechanic' }),
      ],
    },
  },
];

describe('asRoleDeltasUnfocused', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(asRoleDeltasUnfocused(thisCase.given)).toEqual(
        thisCase.expect.output,
      );
    }),
  );
});
