import type { KeyrackGrantAttempt } from '@src/domain.objects/keyrack/KeyrackGrantAttempt';

import { asKeyrackAttemptSlug } from './asKeyrackAttemptSlug';

/**
 * .what = unit test for the attempt-slug transformer
 * .why = proves the slug is read from `grant.slug` for granted and from `slug` for every
 *        non-granted status, so callers get one uniform accessor
 */
const CASES: {
  description: string;
  attempt: KeyrackGrantAttempt;
  expect: string;
}[] = [
  {
    description: 'granted → reads grant.slug',
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
    expect: 'ehmpathy.test.XAI_API_KEY',
  },
  {
    description: 'locked → reads slug',
    attempt: {
      status: 'locked',
      slug: 'ehmpathy.test.XAI_API_KEY',
      message: 'credential is locked. unlock it first.',
      fix: 'rhx keyrack unlock --owner ehmpathy --env test',
    },
    expect: 'ehmpathy.test.XAI_API_KEY',
  },
  {
    description: 'absent → reads slug',
    attempt: {
      status: 'absent',
      slug: 'ehmpathy.test.NONEXISTENT_KEY',
      message: 'does not exist',
      fix: 'rhx keyrack set ...',
    },
    expect: 'ehmpathy.test.NONEXISTENT_KEY',
  },
  {
    description: 'blocked → reads slug',
    attempt: {
      status: 'blocked',
      slug: 'ehmpathy.test.BLOCKED_KEY',
      reasons: ['value fails length constraint'],
      fix: 'rhx keyrack set ...',
    },
    expect: 'ehmpathy.test.BLOCKED_KEY',
  },
];

describe('asKeyrackAttemptSlug', () => {
  CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(asKeyrackAttemptSlug({ attempt: thisCase.attempt })).toEqual(
        thisCase.expect,
      );
    }),
  );
});
