import { asIsoTimeStamp } from 'iso-time';

import { genSampleKeyrackSsoGrant } from '@src/.test/assets/genSampleKeyrackSsoGrant';

import type { DaemonRenewEntry } from '../domain.objects/daemonRenewRecord';
import { getAllRenewEntriesPastCap } from './getAllRenewEntriesPastCap';

const NOW = asIsoTimeStamp('2026-11-14T09:00:00Z');

/**
 * .what = one renew entry with a given cap and mark
 */
const genEntry = (input: {
  capAt: string;
  mark?: DaemonRenewEntry['mark'];
}): { address: string; entry: DaemonRenewEntry } => ({
  address: 'ahbode.camp.AWS_PROFILE',
  entry: {
    grant: genSampleKeyrackSsoGrant({
      expiresAt: asIsoTimeStamp('2026-11-14T08:55:00Z'),
    }),
    capAt: asIsoTimeStamp(input.capAt),
    renewedCount: 2,
    faultCount: 0,
    mark: input.mark ?? null,
  },
});

const TEST_CASES = [
  {
    description: 'an unmarked entry whose cap has passed is past cap',
    given: { entry: genEntry({ capAt: '2026-11-14T08:59:00Z' }) },
    expect: { pastCap: true },
  },
  {
    description: 'an unmarked entry at its cap is past cap',
    given: { entry: genEntry({ capAt: '2026-11-14T09:00:00Z' }) },
    expect: { pastCap: true },
  },
  {
    description: 'an unmarked entry before its cap is not',
    given: { entry: genEntry({ capAt: '2026-11-14T09:01:00Z' }) },
    expect: { pastCap: false },
  },
  {
    description: 'a marked entry past its cap stays, so its mark stays named',
    given: {
      entry: genEntry({
        capAt: '2026-11-14T08:00:00Z',
        mark: { kind: 'halted', error: 'renew timed out' },
      }),
    },
    expect: { pastCap: false },
  },
];

describe('getAllRenewEntriesPastCap', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      const pastCap = getAllRenewEntriesPastCap({
        entries: [thisCase.given.entry],
        now: NOW,
      });
      expect(pastCap.length > 0).toEqual(thisCase.expect.pastCap);
    }),
  );
});
