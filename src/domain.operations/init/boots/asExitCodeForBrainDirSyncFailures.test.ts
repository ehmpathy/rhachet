import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import type { BrainDirBootFailure } from '@src/domain.operations/boot/BrainDirBootRender';

import { asExitCodeForBrainDirSyncFailures } from './asExitCodeForBrainDirSyncFailures';

const failureOf = (cause: Error): BrainDirBootFailure => ({
  scope: { kind: 'actor', actorHash: 'abc12345' },
  cause,
});

const TEST_CASES: {
  description: string;
  given: { failures: BrainDirBootFailure[] };
  expect: { exitCode: 0 | 1 | 2 };
}[] = [
  {
    description: 'no failures → 0',
    given: { failures: [] },
    expect: { exitCode: 0 },
  },
  {
    description: 'every cause a ConstraintError → 2',
    given: {
      failures: [
        failureOf(new ConstraintError('role gone')),
        failureOf(new ConstraintError('role gone again')),
      ],
    },
    expect: { exitCode: 2 },
  },
  {
    description: 'one MalfunctionError among constraints → 1',
    given: {
      failures: [
        failureOf(new ConstraintError('role gone')),
        failureOf(new MalfunctionError('disk full')),
      ],
    },
    expect: { exitCode: 1 },
  },
  {
    description: 'a plain Error → 1',
    given: { failures: [failureOf(new Error('boom'))] },
    expect: { exitCode: 1 },
  },
  {
    description: 'one failure of each kind → 1',
    given: {
      failures: [
        failureOf(new ConstraintError('role gone')),
        failureOf(new MalfunctionError('disk full')),
        failureOf(new Error('boom')),
      ],
    },
    expect: { exitCode: 1 },
  },
];

describe('asExitCodeForBrainDirSyncFailures', () => {
  given('[case1] a set of brain-dir sync failure lists', () => {
    TEST_CASES.map((thisCase) =>
      when(`[t0] ${thisCase.description}`, () => {
        then(`it yields exit code ${thisCase.expect.exitCode}`, () => {
          expect(
            asExitCodeForBrainDirSyncFailures({
              failures: thisCase.given.failures,
            }),
          ).toEqual(thisCase.expect.exitCode);
        });
      }),
    );
  });
});
