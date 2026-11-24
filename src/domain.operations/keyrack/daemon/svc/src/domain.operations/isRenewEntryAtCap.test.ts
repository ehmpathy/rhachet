import { asIsoTimeStamp } from 'iso-time';

import { genSampleKeyrackSsoGrant } from '@src/.test/assets/genSampleKeyrackSsoGrant';

import { isRenewEntryAtCap } from './isRenewEntryAtCap';

const CAP_AT = asIsoTimeStamp('2026-11-14T09:00:00Z');

/**
 * .what = one renew entry whose grant expires at a given time, under CAP_AT
 */
const genEntry = (input: { expiresAt: string }) => ({
  grant: genSampleKeyrackSsoGrant({
    expiresAt: asIsoTimeStamp(input.expiresAt),
  }),
  capAt: CAP_AT,
});

const TEST_CASES = [
  {
    description: 'a grant that expires before its cap is not at cap',
    given: { entry: genEntry({ expiresAt: '2026-11-14T08:59:00Z' }) },
    expect: { atCap: false },
  },
  {
    description: 'a grant that expires exactly at its cap is at cap',
    given: { entry: genEntry({ expiresAt: '2026-11-14T09:00:00Z' }) },
    expect: { atCap: true },
  },
  {
    description: 'a grant that expires past its cap is at cap',
    given: { entry: genEntry({ expiresAt: '2026-11-14T09:05:00Z' }) },
    expect: { atCap: true },
  },
];

describe('isRenewEntryAtCap', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(isRenewEntryAtCap({ entry: thisCase.given.entry })).toEqual(
        thisCase.expect.atCap,
      );
    }),
  );
});
