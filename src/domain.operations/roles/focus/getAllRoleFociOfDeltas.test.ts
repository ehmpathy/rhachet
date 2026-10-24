import type { RoleDelta } from '@src/domain.objects/RoleDelta';

import { getAllRoleFociOfDeltas } from './getAllRoleFociOfDeltas';

const TEST_CASES: Array<{
  description: string;
  given: { deltas: RoleDelta[] };
  expect: { output: Array<{ role: string; subjects: string[] }> };
}> = [
  {
    description: 'a whole role names no focus',
    given: { deltas: [{ kind: 'absolute', role: 'mechanic' }] },
    expect: { output: [] },
  },
  {
    description: 'an addition and an absolute each name their focus',
    given: {
      deltas: [
        { kind: 'addition', role: 'mechanic::flow' },
        { kind: 'absolute', role: 'driver::code.prod' },
      ],
    },
    expect: {
      output: [
        { role: 'mechanic', subjects: ['flow'] },
        { role: 'driver', subjects: ['code.prod'] },
      ],
    },
  },
  {
    description: 'a subtraction names no focus',
    given: {
      deltas: [
        { kind: 'subtraction', role: 'architect' },
        { kind: 'addition', role: 'mechanic::flow' },
      ],
    },
    expect: { output: [{ role: 'mechanic', subjects: ['flow'] }] },
  },
  {
    description: 'several foci of one role union into one entry',
    given: {
      deltas: [
        { kind: 'absolute', role: 'mechanic::flow' },
        { kind: 'absolute', role: 'mechanic::arch' },
      ],
    },
    expect: { output: [{ role: 'mechanic', subjects: ['flow', 'arch'] }] },
  },
];

describe('getAllRoleFociOfDeltas', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(getAllRoleFociOfDeltas(thisCase.given)).toEqual(
        thisCase.expect.output,
      );
    }),
  );
});
