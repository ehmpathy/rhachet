import { asIsoTimeStamp } from 'iso-time';

import { genSampleKeyrackSsoGrant } from '@src/.test/assets/genSampleKeyrackSsoGrant';

import type { DaemonRenewEntry } from '../domain.objects/daemonRenewRecord';
import { getAllRenewEntriesUnmarkedIdle } from './getAllRenewEntriesUnmarkedIdle';

/**
 * .what = one renew entry at an address, with a given mark
 */
const genEntry = (input: {
  address: string;
  mark: DaemonRenewEntry['mark'];
}): { address: string; entry: DaemonRenewEntry } => ({
  address: input.address,
  entry: {
    grant: genSampleKeyrackSsoGrant({
      expiresAt: asIsoTimeStamp('2026-11-14T08:55:00Z'),
    }),
    capAt: asIsoTimeStamp('2026-11-14T09:00:00Z'),
    renewedCount: 0,
    faultCount: 0,
    mark: input.mark,
  },
});

const TEST_CASES = [
  {
    description: 'an unmarked entry not mid-renew is idle',
    given: { entry: genEntry({ address: 'a', mark: null }), inflight: [] },
    expect: { isIdle: true },
  },
  {
    description: 'an unmarked entry mid-renew is not',
    given: { entry: genEntry({ address: 'a', mark: null }), inflight: ['a'] },
    expect: { isIdle: false },
  },
  {
    description: 'a marked entry is not, even when idle',
    given: {
      entry: genEntry({ address: 'a', mark: { kind: 'lapsed', error: null } }),
      inflight: [],
    },
    expect: { isIdle: false },
  },
];

describe('getAllRenewEntriesUnmarkedIdle', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      const idle = getAllRenewEntriesUnmarkedIdle({
        entries: [thisCase.given.entry],
        inflight: new Set(thisCase.given.inflight),
      });
      expect(idle.length > 0).toEqual(thisCase.expect.isIdle);
    }),
  );
});
