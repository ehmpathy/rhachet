import type { KeyrackGrantAttempt } from '@src/domain.objects/keyrack/KeyrackGrantAttempt';

import { asKeyrackAttemptDetail } from './asKeyrackAttemptDetail';

/**
 * .what = unit test for the attempt-detail transformer
 * .why = proves the internal slug + redundant message are dropped, and that blocked reasons
 *        and the fix hint are preserved, across all four attempt statuses
 */
const CASES: {
  description: string;
  given: { key: string; attempt: KeyrackGrantAttempt };
  expect: { key: string; status: string; reasons?: string[]; fix?: string };
}[] = [
  {
    description: 'absent → key + status + fix, no slug, no message',
    given: {
      key: 'XAI_API_KEY',
      attempt: {
        status: 'absent',
        slug: 'ehmpathy.test.XAI_API_KEY',
        message:
          "credential 'ehmpathy.test.XAI_API_KEY' does not exist. set it first.",
        fix: 'rhx keyrack set --owner ehmpathy --key XAI_API_KEY --env test',
      },
    },
    expect: {
      key: 'XAI_API_KEY',
      status: 'absent',
      fix: 'rhx keyrack set --owner ehmpathy --key XAI_API_KEY --env test',
    },
  },
  {
    description: 'locked → key + status + fix, no slug, no message',
    given: {
      key: 'XAI_API_KEY',
      attempt: {
        status: 'locked',
        slug: 'ehmpathy.test.XAI_API_KEY',
        message: 'credential is locked. unlock it first.',
        fix: 'rhx keyrack unlock --owner ehmpathy --env test',
      },
    },
    expect: {
      key: 'XAI_API_KEY',
      status: 'locked',
      fix: 'rhx keyrack unlock --owner ehmpathy --env test',
    },
  },
  {
    description: 'blocked → key + status + reasons + fix (reasons preserved)',
    given: {
      key: 'XAI_API_KEY',
      attempt: {
        status: 'blocked',
        slug: 'ehmpathy.test.XAI_API_KEY',
        reasons: ['value fails length constraint'],
        fix: 'rhx keyrack set --owner ehmpathy --key XAI_API_KEY --env test',
      },
    },
    expect: {
      key: 'XAI_API_KEY',
      status: 'blocked',
      reasons: ['value fails length constraint'],
      fix: 'rhx keyrack set --owner ehmpathy --key XAI_API_KEY --env test',
    },
  },
  {
    description: 'granted → key + status only, no fix, no reasons',
    given: {
      key: 'XAI_API_KEY',
      attempt: {
        status: 'granted',
        grant: {
          slug: 'ehmpathy.test.XAI_API_KEY',
          key: {
            secret: 'shh',
            grade: { protection: 'encrypted', duration: 'permanent' },
          },
          source: { vault: 'os.daemon', mech: 'EPHEMERAL_VIA_SESSION' },
          env: 'test',
          org: 'ehmpathy',
        },
      },
    },
    expect: {
      key: 'XAI_API_KEY',
      status: 'granted',
    },
  },
];

describe('asKeyrackAttemptDetail', () => {
  CASES.map((thisCase) =>
    test(thisCase.description, () => {
      const detail = asKeyrackAttemptDetail(thisCase.given);
      expect(detail).toEqual(thisCase.expect);
    }),
  );

  test('never leaks the internal slug field', () => {
    const detail = asKeyrackAttemptDetail({
      key: 'XAI_API_KEY',
      attempt: {
        status: 'absent',
        slug: 'ehmpathy.test.XAI_API_KEY',
        message: 'does not exist',
        fix: 'rhx keyrack set ...',
      },
    });
    expect(detail).not.toHaveProperty('slug');
    expect(detail).not.toHaveProperty('message');
  });
});
