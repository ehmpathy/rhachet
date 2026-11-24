import { asIsoTimeStamp } from 'iso-time';

import { isRenewExpiryAdvanced } from './isRenewExpiryAdvanced';

const TEST_CASES = [
  {
    description: 'a later expiry has advanced',
    given: {
      expiresAtBefore: asIsoTimeStamp('2026-11-19T10:00:00.000Z'),
      expiresAtAfter: asIsoTimeStamp('2026-11-19T11:00:00.000Z'),
    },
    expect: { output: true },
  },
  {
    description: 'the same expiry has not advanced',
    given: {
      expiresAtBefore: asIsoTimeStamp('2026-11-19T10:00:00.000Z'),
      expiresAtAfter: asIsoTimeStamp('2026-11-19T10:00:00.000Z'),
    },
    expect: { output: false },
  },
  {
    description: 'an earlier expiry has not advanced',
    given: {
      expiresAtBefore: asIsoTimeStamp('2026-11-19T10:00:00.000Z'),
      expiresAtAfter: asIsoTimeStamp('2026-11-19T09:00:00.000Z'),
    },
    expect: { output: false },
  },
  {
    description: 'a grant with no expiry before counts any expiry as advanced',
    given: {
      expiresAtBefore: null,
      expiresAtAfter: asIsoTimeStamp('2026-11-19T09:00:00.000Z'),
    },
    expect: { output: true },
  },
];

describe('isRenewExpiryAdvanced', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(isRenewExpiryAdvanced(thisCase.given)).toEqual(
        thisCase.expect.output,
      );
    }),
  );
});
