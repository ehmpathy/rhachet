import { given, then, when } from 'test-fns';

import type { KeyrackGrantMechanism } from '@src/domain.objects/keyrack';

import { asOsSecureSetTreeHead } from './asOsSecureSetTreeHead';

const TEST_CASES: {
  description: string;
  given: { mech: KeyrackGrantMechanism; isSourcePiped: boolean };
  expect: { output: string[] };
}[] = [
  {
    description: 'a piped github-app source opens the tree with its piped leaf',
    given: { mech: 'EPHEMERAL_VIA_GITHUB_APP', isSourcePiped: true },
    expect: {
      output: [
        '🔐 keyrack set @all.all.KEY via EPHEMERAL_VIA_GITHUB_APP',
        '   │',
        '   ├─ source piped from stdin',
        '   │  └─ shape ok ✓',
      ],
    },
  },
  {
    description: 'a piped replica source opens the tree with its piped leaf',
    given: { mech: 'PERMANENT_VIA_REPLICA', isSourcePiped: true },
    expect: {
      output: [
        '🔐 keyrack set @all.all.KEY via PERMANENT_VIA_REPLICA',
        '   │',
        '   ├─ source piped from stdin',
        '   │  └─ shape ok ✓',
      ],
    },
  },
  {
    description: 'the github-app guided setup opens the header alone',
    given: { mech: 'EPHEMERAL_VIA_GITHUB_APP', isSourcePiped: false },
    expect: {
      output: ['🔐 keyrack set @all.all.KEY via EPHEMERAL_VIA_GITHUB_APP'],
    },
  },
  {
    description: 'the replica guided setup opens no tree',
    given: { mech: 'PERMANENT_VIA_REPLICA', isSourcePiped: false },
    expect: { output: [] },
  },
];

describe('asOsSecureSetTreeHead', () => {
  TEST_CASES.map((thisCase, index) =>
    given(`[case${index + 1}] ${thisCase.description}`, () => {
      when('[t0] the tree head is cast', () => {
        then('it reads as expected', () => {
          const output = asOsSecureSetTreeHead({
            slug: '@all.all.KEY',
            ...thisCase.given,
          });
          expect(output).toEqual(thisCase.expect.output);
        });
      });
    }),
  );
});
