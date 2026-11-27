import { asIsoTimeStamp } from 'iso-time';

import { genSampleKeyrackSsoGrant } from '@src/.test/assets/genSampleKeyrackSsoGrant';

import type { DaemonRenewalEntry } from '../domain.objects/daemonRenewalRecord';
import { getAllRenewalEntriesPastMax } from './getAllRenewalEntriesPastMax';

const NOW = asIsoTimeStamp('2026-11-14T09:00:00Z');

/**
 * .what = one renewal entry with a given max expiry and status
 */
const genEntry = (input: {
  expiresAtMax: string;
  status?: DaemonRenewalEntry['status'];
  error?: string | null;
}): { address: string; entry: DaemonRenewalEntry } => ({
  address: 'ahbode.camp.AWS_PROFILE',
  entry: {
    grant: genSampleKeyrackSsoGrant({
      expiresAt: asIsoTimeStamp('2026-11-14T08:55:00Z'),
    }),
    expiresAtMax: asIsoTimeStamp(input.expiresAtMax),
    status: input.status ?? 'on',
    count: { renewed: 2, faulted: 0 },
    error: input.error ?? null,
  },
});

const TEST_CASES = [
  {
    description: 'an `on` entry whose max has passed is past max',
    given: { entry: genEntry({ expiresAtMax: '2026-11-14T08:59:00Z' }) },
    expect: { pastMax: true },
  },
  {
    description: 'an `on` entry at its max is past max',
    given: { entry: genEntry({ expiresAtMax: '2026-11-14T09:00:00Z' }) },
    expect: { pastMax: true },
  },
  {
    description: 'an `on` entry before its max is not',
    given: { entry: genEntry({ expiresAtMax: '2026-11-14T09:01:00Z' }) },
    expect: { pastMax: false },
  },
  {
    description: 'a halted entry past its max stays, so its status stays named',
    given: {
      entry: genEntry({
        expiresAtMax: '2026-11-14T08:00:00Z',
        status: 'halted',
        error: 'renew timed out',
      }),
    },
    expect: { pastMax: false },
  },
];

describe('getAllRenewalEntriesPastMax', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      const pastMax = getAllRenewalEntriesPastMax({
        entries: [thisCase.given.entry],
        now: NOW,
      });
      expect(pastMax.length > 0).toEqual(thisCase.expect.pastMax);
    }),
  );
});
