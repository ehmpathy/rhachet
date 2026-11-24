import { getOneTtlLeftMs } from './getOneTtlLeftMs';

const NOW_MS = new Date('2026-11-14T00:00:00Z').getTime();

const TEST_CASES = [
  {
    description: 'a future expiry yields the ms left',
    given: { expiresAt: '2026-11-14T00:10:00Z' },
    expect: { output: 10 * 60 * 1000 },
  },
  {
    description: 'a past expiry floors at zero',
    given: { expiresAt: '2026-11-13T23:00:00Z' },
    expect: { output: 0 },
  },
  {
    description: 'no expiry yields null, never Infinity',
    given: { expiresAt: null },
    expect: { output: null },
  },
];

describe('getOneTtlLeftMs', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(
        getOneTtlLeftMs({ expiresAt: thisCase.given.expiresAt, nowMs: NOW_MS }),
      ).toEqual(thisCase.expect.output);
    }),
  );
});
