import { asIsoTimeStamp } from 'iso-time';

import { genSampleKeyrackSsoGrant } from '@src/.test/assets/genSampleKeyrackSsoGrant';

import type { DaemonRenewEntry } from '../domain.objects/daemonRenewRecord';
import { getAllStatusRowsMarkedExpired } from './getAllStatusRowsMarkedExpired';

const grant = genSampleKeyrackSsoGrant({
  expiresAt: asIsoTimeStamp('2026-11-14T01:00:00Z'),
});

/**
 * .what = one renew entry for the sample grant, with a given mark
 */
const genEntry = (input: {
  mark: DaemonRenewEntry['mark'];
}): { address: string; entry: DaemonRenewEntry } => ({
  address: grant.slug,
  entry: {
    grant,
    capAt: asIsoTimeStamp('2026-11-14T09:00:00Z'),
    renewedCount: 3,
    faultCount: 0,
    mark: input.mark,
  },
});

const TEST_CASES = [
  {
    description:
      'a marked entry whose grant left the store yields an expired row',
    given: {
      entry: genEntry({ mark: { kind: 'lapsed', error: null } }),
      grantsLive: [],
    },
    expect: { rows: 1 },
  },
  {
    description: 'a marked entry whose grant is still live yields no row here',
    given: {
      entry: genEntry({ mark: { kind: 'lapsed', error: null } }),
      grantsLive: [grant],
    },
    expect: { rows: 0 },
  },
  {
    description: 'an unmarked entry yields no row',
    given: { entry: genEntry({ mark: null }), grantsLive: [] },
    expect: { rows: 0 },
  },
];

describe('getAllStatusRowsMarkedExpired', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      const rows = getAllStatusRowsMarkedExpired({
        renewEntries: [thisCase.given.entry],
        grantsLive: thisCase.given.grantsLive,
      });
      expect(rows.length).toEqual(thisCase.expect.rows);
    }),
  );

  test('the expired row carries ttl 0 and the renew state', () => {
    const [row] = getAllStatusRowsMarkedExpired({
      renewEntries: [genEntry({ mark: { kind: 'lapsed', error: null } })],
      grantsLive: [],
    });
    expect(row).toMatchObject({
      slug: grant.slug,
      ttlLeftMs: 0,
      renew: { renewedCount: 3, mark: { kind: 'lapsed', error: null } },
    });
  });
});
