import { asIsoTimeStamp } from 'iso-time';

import type { DaemonStatusRow } from '@src/domain.operations/keyrack/daemon/sdk';

import { asKeyrackStatusRow } from './asKeyrackStatusRow';

const rowBase: DaemonStatusRow = {
  slug: 'ahbode.camp.AWS_PROFILE',
  env: 'camp',
  org: 'ahbode',
  expiresAt: asIsoTimeStamp(new Date('2026-11-14T09:00:00.000Z')),
  ttlLeftMs: 60_000,
};

const TEST_CASES = [
  {
    description: 'a row with no reach and no renew carries neither field',
    given: { row: rowBase },
    expect: { hasReach: false, hasRenew: false },
  },
  {
    description: 'a row the daemon renews keeps its renew state',
    given: {
      row: {
        ...rowBase,
        renew: { renewedCount: 2, mark: null },
      } satisfies DaemonStatusRow,
    },
    expect: { hasReach: false, hasRenew: true },
  },
];

describe('asKeyrackStatusRow', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      const row = asKeyrackStatusRow({ row: thisCase.given.row });
      expect('reach' in row).toEqual(thisCase.expect.hasReach);
      expect('renew' in row).toEqual(thisCase.expect.hasRenew);
      expect(row.slug).toEqual(thisCase.given.row.slug);
      expect(row.ttlLeftMs).toEqual(thisCase.given.row.ttlLeftMs);
      if (thisCase.expect.hasRenew)
        expect(row.renew).toEqual(thisCase.given.row.renew);
    }),
  );
});
