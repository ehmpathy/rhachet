import { asIsoTimeStamp } from 'iso-time';

import { genSampleKeyrackSsoGrant } from '@src/.test/assets/genSampleKeyrackSsoGrant';

import type { DaemonRenewalEntry } from '../domain.objects/daemonRenewalRecord';
import { getAllRenewalEntriesOnIdle } from './getAllRenewalEntriesOnIdle';

/**
 * .what = one renewal entry at an address, with a given status
 */
const genEntry = (input: {
  address: string;
  status: DaemonRenewalEntry['status'];
}): { address: string; entry: DaemonRenewalEntry } => ({
  address: input.address,
  entry: {
    grant: genSampleKeyrackSsoGrant({
      expiresAt: asIsoTimeStamp('2026-11-14T08:55:00Z'),
    }),
    expiresAtMax: asIsoTimeStamp('2026-11-14T09:00:00Z'),
    status: input.status,
    count: { renewed: 0, faulted: 0 },
    error: null,
  },
});

const TEST_CASES = [
  {
    description: 'an `on` entry not mid-renew is idle',
    given: { entry: genEntry({ address: 'a', status: 'on' }), inflight: [] },
    expect: { isIdle: true },
  },
  {
    description: 'an `on` entry mid-renew is not',
    given: { entry: genEntry({ address: 'a', status: 'on' }), inflight: ['a'] },
    expect: { isIdle: false },
  },
  {
    description: 'a lapsed entry is not, even when idle',
    given: {
      entry: genEntry({ address: 'a', status: 'lapsed' }),
      inflight: [],
    },
    expect: { isIdle: false },
  },
];

describe('getAllRenewalEntriesOnIdle', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      const idle = getAllRenewalEntriesOnIdle({
        entries: [thisCase.given.entry],
        inflight: new Set(thisCase.given.inflight),
      });
      expect(idle.length > 0).toEqual(thisCase.expect.isIdle);
    }),
  );
});
