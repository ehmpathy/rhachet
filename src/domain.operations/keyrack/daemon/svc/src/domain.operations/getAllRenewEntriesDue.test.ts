import { asIsoTimeStamp } from 'iso-time';

import { genSampleKeyrackSsoGrant } from '@src/.test/assets/genSampleKeyrackSsoGrant';

import type { DaemonRenewEntry } from '../domain.objects/daemonRenewRecord';
import { getAllRenewEntriesDue } from './getAllRenewEntriesDue';

const NOW = asIsoTimeStamp('2026-11-14T00:00:00Z');
const WINDOW_MS = 10 * 60 * 1000;

/**
 * .what = one renew entry whose grant expires at a given stamp
 */
const genEntry = (input: {
  expiresAt: string;
  mark?: DaemonRenewEntry['mark'];
  capAt?: string;
}): { address: string; entry: DaemonRenewEntry } => ({
  address: 'ahbode.camp.AWS_PROFILE',
  entry: {
    grant: genSampleKeyrackSsoGrant({
      expiresAt: asIsoTimeStamp(input.expiresAt),
    }),
    capAt: asIsoTimeStamp(input.capAt ?? '2026-11-14T09:00:00Z'),
    renewedCount: 0,
    faultCount: 0,
    mark: input.mark ?? null,
  },
});

const TEST_CASES = [
  {
    description: 'a grant inside the window is due',
    given: {
      entry: genEntry({ expiresAt: '2026-11-14T00:09:00Z' }),
      inflight: [],
    },
    expect: { due: true },
  },
  {
    description: 'a grant outside the window is not due',
    given: {
      entry: genEntry({ expiresAt: '2026-11-14T00:30:00Z' }),
      inflight: [],
    },
    expect: { due: false },
  },
  {
    description: 'a grant already expired (a late wake) is due',
    given: {
      entry: genEntry({ expiresAt: '2026-11-13T23:00:00Z' }),
      inflight: [],
    },
    expect: { due: true },
  },
  {
    description: 'a marked entry is never due',
    given: {
      entry: genEntry({
        expiresAt: '2026-11-14T00:09:00Z',
        mark: { kind: 'lapsed', error: null },
      }),
      inflight: [],
    },
    expect: { due: false },
  },
  {
    description: 'an entry mid-renew is not due again',
    given: {
      entry: genEntry({ expiresAt: '2026-11-14T00:09:00Z' }),
      inflight: ['ahbode.camp.AWS_PROFILE'],
    },
    expect: { due: false },
  },
  {
    description: 'a grant that already expires at its cap is not due',
    given: {
      entry: genEntry({
        expiresAt: '2026-11-14T00:09:00Z',
        capAt: '2026-11-14T00:09:00Z',
      }),
      inflight: [],
    },
    expect: { due: false },
  },
];

describe('getAllRenewEntriesDue', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      const due = getAllRenewEntriesDue({
        entries: [thisCase.given.entry],
        now: NOW,
        windowMs: WINDOW_MS,
        inflight: new Set(thisCase.given.inflight),
      });
      expect(due.length > 0).toEqual(thisCase.expect.due);
    }),
  );
});
