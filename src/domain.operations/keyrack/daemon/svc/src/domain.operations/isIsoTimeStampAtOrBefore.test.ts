import { asIsoTimeStamp } from 'iso-time';

import { isIsoTimeStampAtOrBefore } from './isIsoTimeStampAtOrBefore';

const TEST_CASES = [
  {
    description: 'an earlier stamp is at or before',
    given: { a: '2026-11-14T00:00:00Z', b: '2026-11-14T00:00:01Z' },
    expect: { output: true },
  },
  {
    description: 'an equal stamp is at or before',
    given: { a: '2026-11-14T00:00:00Z', b: '2026-11-14T00:00:00Z' },
    expect: { output: true },
  },
  {
    description: 'a later stamp is not',
    given: { a: '2026-11-14T00:00:02Z', b: '2026-11-14T00:00:01Z' },
    expect: { output: false },
  },
  {
    description:
      'a sub-second stamp compares as an instant, not as text (.500Z is later than Z)',
    given: { a: '2026-11-14T00:00:00.500Z', b: '2026-11-14T00:00:00Z' },
    expect: { output: false },
  },
];

describe('isIsoTimeStampAtOrBefore', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(
        isIsoTimeStampAtOrBefore({
          a: asIsoTimeStamp(thisCase.given.a),
          b: asIsoTimeStamp(thisCase.given.b),
        }),
      ).toEqual(thisCase.expect.output);
    }),
  );
});
