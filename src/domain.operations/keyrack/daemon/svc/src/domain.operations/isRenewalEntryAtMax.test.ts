import { asIsoTimeStamp } from 'iso-time';

import { genSampleKeyrackSsoGrant } from '@src/.test/assets/genSampleKeyrackSsoGrant';

import { isRenewalEntryAtMax } from './isRenewalEntryAtMax';

const EXPIRES_AT_MAX = asIsoTimeStamp('2026-11-14T09:00:00Z');

/**
 * .what = one renewal entry whose grant expires at a given time, under EXPIRES_AT_MAX
 */
const genEntry = (input: { expiresAt: string }) => ({
  grant: genSampleKeyrackSsoGrant({
    expiresAt: asIsoTimeStamp(input.expiresAt),
  }),
  expiresAtMax: EXPIRES_AT_MAX,
});

const TEST_CASES = [
  {
    description: 'a grant that expires before its max is not at max',
    given: { entry: genEntry({ expiresAt: '2026-11-14T08:59:00Z' }) },
    expect: { atMax: false },
  },
  {
    description: 'a grant that expires exactly at its max is at max',
    given: { entry: genEntry({ expiresAt: '2026-11-14T09:00:00Z' }) },
    expect: { atMax: true },
  },
  {
    description: 'a grant that expires past its max is at max',
    given: { entry: genEntry({ expiresAt: '2026-11-14T09:05:00Z' }) },
    expect: { atMax: true },
  },
];

describe('isRenewalEntryAtMax', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(isRenewalEntryAtMax({ entry: thisCase.given.entry })).toEqual(
        thisCase.expect.atMax,
      );
    }),
  );
});
