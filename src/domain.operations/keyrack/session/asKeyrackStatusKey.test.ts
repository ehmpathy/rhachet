import { asIsoTimeStamp } from 'iso-time';

import type { DaemonStatusKey } from '@src/domain.operations/keyrack/daemon/sdk';

import { asKeyrackStatusKey } from './asKeyrackStatusKey';

const NOW = asIsoTimeStamp('2026-11-14T08:59:00Z');

const keyBase: DaemonStatusKey = {
  slug: 'ahbode.camp.AWS_PROFILE',
  env: 'camp',
  org: 'ahbode',
  expiresAt: asIsoTimeStamp('2026-11-14T09:00:00Z'),
  expiresIn: { minutes: 1 },
};

const TEST_CASES = [
  {
    description: 'a key with no reach and no renewal carries neither field',
    given: { key: keyBase },
    expect: {
      hasReach: false,
      hasRenewal: false,
      expiresIn: { minutes: 1 },
    },
  },
  {
    description: 'a key the daemon renews keeps its renewal state',
    given: {
      key: {
        ...keyBase,
        renewal: { status: 'on', count: { renewed: 2 }, error: null },
      } satisfies DaemonStatusKey,
    },
    expect: {
      hasReach: false,
      hasRenewal: true,
      expiresIn: { minutes: 1 },
    },
  },
  {
    description:
      'a key from an older daemon, with no expiresIn, has it derived from expiresAt',
    given: {
      key: {
        slug: keyBase.slug,
        env: keyBase.env,
        org: keyBase.org,
        expiresAt: keyBase.expiresAt,
      } satisfies DaemonStatusKey,
    },
    expect: {
      hasReach: false,
      hasRenewal: false,
      expiresIn: { minutes: 1 },
    },
  },
  {
    description: 'a key that never expires keeps a null expiresIn',
    given: {
      key: { ...keyBase, expiresAt: null, expiresIn: null },
    },
    expect: { hasReach: false, hasRenewal: false, expiresIn: null },
  },
];

describe('asKeyrackStatusKey', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      const key = asKeyrackStatusKey({ key: thisCase.given.key, now: NOW });
      expect('reach' in key).toEqual(thisCase.expect.hasReach);
      expect('renewal' in key).toEqual(thisCase.expect.hasRenewal);
      expect(key.slug).toEqual(thisCase.given.key.slug);
      expect(key.expiresIn).toEqual(thisCase.expect.expiresIn);
      if (thisCase.expect.hasRenewal)
        expect(key.renewal).toEqual(thisCase.given.key.renewal);
    }),
  );
});
