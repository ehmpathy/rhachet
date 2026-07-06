import type { KeyrackGrantAttempt } from '@src/domain.objects/keyrack/KeyrackGrantAttempt';

import { isKeyrackGrantAttemptLocked } from './isKeyrackGrantAttemptLocked';

/**
 * .what = unit test for the locked classifier
 * .why = only locked keys are eligible for an auto-unlock; all other statuses are not
 */
const CASES: {
  description: string;
  attempt: KeyrackGrantAttempt;
  expect: boolean;
}[] = [
  {
    description: 'locked is locked',
    attempt: { status: 'locked', slug: 'org.test.KEY', message: 'locked' },
    expect: true,
  },
  {
    description: 'absent is not locked',
    attempt: { status: 'absent', slug: 'org.test.KEY', message: 'not set' },
    expect: false,
  },
  {
    description: 'blocked is not locked',
    attempt: { status: 'blocked', slug: 'org.test.KEY', reasons: ['firewall'] },
    expect: false,
  },
  {
    description: 'granted is not locked',
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

describe('isKeyrackGrantAttemptLocked', () => {
  CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(
        isKeyrackGrantAttemptLocked({ attempt: thisCase.attempt }),
      ).toEqual(thisCase.expect);
    }),
  );
});
