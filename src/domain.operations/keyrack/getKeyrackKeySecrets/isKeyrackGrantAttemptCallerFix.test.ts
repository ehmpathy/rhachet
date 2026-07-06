import type { KeyrackGrantAttempt } from '@src/domain.objects/keyrack/KeyrackGrantAttempt';

import { isKeyrackGrantAttemptCallerFix } from './isKeyrackGrantAttemptCallerFix';

/**
 * .what = unit test for the caller-fix classifier
 * .why = absent + blocked are caller-fix (unlock cannot help); granted + locked are not
 */
const CASES: {
  description: string;
  attempt: KeyrackGrantAttempt;
  expect: boolean;
}[] = [
  {
    description: 'absent is caller-fix (key was never set)',
    attempt: { status: 'absent', slug: 'org.test.KEY', message: 'not set' },
    expect: true,
  },
  {
    description: 'blocked is caller-fix (firewall violation)',
    attempt: { status: 'blocked', slug: 'org.test.KEY', reasons: ['firewall'] },
    expect: true,
  },
  {
    description: 'locked is not caller-fix (an unlock can advance it)',
    attempt: { status: 'locked', slug: 'org.test.KEY', message: 'locked' },
    expect: false,
  },
  {
    description: 'granted is not caller-fix (already usable)',
    attempt: {
      status: 'granted',
      grant: {
        slug: 'org.test.KEY',
        key: {
          secret: 'shh',
          grade: { protection: 'encrypted', duration: 'permanent' },
        },
        source: { vault: 'os.daemon', mech: 'EPHEMERAL_VIA_SESSION' },
        env: 'test',
        org: 'org',
      },
    },
    expect: false,
  },
];

describe('isKeyrackGrantAttemptCallerFix', () => {
  CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(
        isKeyrackGrantAttemptCallerFix({ attempt: thisCase.attempt }),
      ).toEqual(thisCase.expect);
    }),
  );
});
