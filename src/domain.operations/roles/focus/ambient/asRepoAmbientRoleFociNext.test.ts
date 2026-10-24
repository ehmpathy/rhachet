import { RoleDelta } from '@src/domain.objects/RoleDelta';

import { asRepoAmbientRoleFociNext } from './asRepoAmbientRoleFociNext';

const add = (role: string): RoleDelta =>
  new RoleDelta({ kind: 'addition', role });
const sub = (role: string): RoleDelta =>
  new RoleDelta({ kind: 'subtraction', role });
const abs = (role: string): RoleDelta =>
  new RoleDelta({ kind: 'absolute', role });

const TEST_CASES: Array<{
  description: string;
  given: { fociPrior: Record<string, string[]>; deltas: RoleDelta[] };
  expect: { output: Record<string, string[]> };
}> = [
  {
    description:
      'an exact set records its foci and keeps the focus of a role it omits (it stays linked)',
    given: {
      fociPrior: { driver: ['flow'] },
      deltas: [abs('any'), abs('mechanic::101')],
    },
    expect: { output: { driver: ['flow'], mechanic: ['101'] } },
  },
  {
    description:
      'an exact set that never names a focused role leaves its focus be (i005 r011.1)',
    given: {
      fociPrior: { mechanic: ['flow'] },
      deltas: [abs('architect')],
    },
    expect: { output: { mechanic: ['flow'] } },
  },
  {
    description: 'an exact set that names a role whole widens its focus',
    given: {
      fociPrior: { mechanic: ['101'] },
      deltas: [abs('any'), abs('mechanic')],
    },
    expect: { output: {} },
  },
  {
    description: 'an exact set unions two foci of one role (S2)',
    given: {
      fociPrior: {},
      deltas: [abs('mechanic::code.prod'), abs('mechanic::flow')],
    },
    expect: { output: { mechanic: ['code.prod', 'flow'] } },
  },
  {
    description: 'a + focus narrows a whole ambient role',
    given: { fociPrior: {}, deltas: [add('mechanic::101')] },
    expect: { output: { mechanic: ['101'] } },
  },
  {
    description: 'a + focus moves a held focus',
    given: {
      fociPrior: { mechanic: ['flow'] },
      deltas: [add('mechanic::101')],
    },
    expect: { output: { mechanic: ['101'] } },
  },
  {
    description: 'a bare + widens a held focus back to the whole role',
    given: { fociPrior: { mechanic: ['flow'] }, deltas: [add('mechanic')] },
    expect: { output: {} },
  },
  {
    description: 'a - drops the held focus of its role',
    given: { fociPrior: { mechanic: ['flow'] }, deltas: [sub('mechanic')] },
    expect: { output: {} },
  },
  {
    description: 'a role the delta does not name keeps its focus',
    given: {
      fociPrior: { mechanic: ['flow'], driver: ['route'] },
      deltas: [add('architect')],
    },
    expect: { output: { mechanic: ['flow'], driver: ['route'] } },
  },
  {
    description: 'a repo-qualified focus records under the bare slug (F8)',
    given: {
      fociPrior: { mechanic: ['flow'] },
      deltas: [add('ehmpathy/mechanic::101')],
    },
    expect: { output: { mechanic: ['101'] } },
  },
  {
    description:
      'a repo-qualified and a bare focus of one role both record, none lost',
    given: {
      fociPrior: {},
      deltas: [abs('ehmpathy/mechanic::flow'), abs('mechanic::lean')],
    },
    expect: { output: { mechanic: ['flow', 'lean'] } },
  },
];

describe('asRepoAmbientRoleFociNext', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(asRepoAmbientRoleFociNext(thisCase.given)).toEqual(
        thisCase.expect.output,
      );
    }),
  );
});
