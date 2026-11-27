import { asIsoTimeStamp } from 'iso-time';

import { getOneKeyrackExpiresIn } from './getOneKeyrackExpiresIn';

const NOW = asIsoTimeStamp('2026-11-14T00:00:00Z');

const TEST_CASES = [
  {
    description: 'a future expiry yields the span left',
    given: { expiresAt: asIsoTimeStamp('2026-11-14T01:10:00Z') },
    expect: { output: { hours: 1, minutes: 10 } },
  },
  {
    description: 'a past expiry floors at zero',
    given: { expiresAt: asIsoTimeStamp('2026-11-13T23:00:00Z') },
    expect: { output: { seconds: 0 } },
  },
  {
    description: 'an expiry of exactly now floors at zero',
    given: { expiresAt: NOW },
    expect: { output: { seconds: 0 } },
  },
  {
    description: 'no expiry yields null, never an infinite duration',
    given: { expiresAt: null },
    expect: { output: null },
  },
];

describe('getOneKeyrackExpiresIn', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(
        getOneKeyrackExpiresIn({
          expiresAt: thisCase.given.expiresAt,
          now: NOW,
        }),
      ).toEqual(thisCase.expect.output);
    }),
  );
});
