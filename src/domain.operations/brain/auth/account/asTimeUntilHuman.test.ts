import { asIsoTimeStamp } from 'iso-time';
import { given, then, when } from 'test-fns';

import { asTimeUntilHuman } from './asTimeUntilHuman';

const NOW = asIsoTimeStamp('2026-01-01T00:00:00.000Z');

const TEST_CASES = [
  {
    description: 'a moment already past reads now',
    given: { at: asIsoTimeStamp('2025-12-31T23:00:00.000Z') },
    expect: { output: 'now' },
  },
  {
    description: 'under an hour reads in minutes',
    given: { at: asIsoTimeStamp('2026-01-01T00:25:00.000Z') },
    expect: { output: '25m' },
  },
  {
    description: 'under a day reads in whole hours',
    given: { at: asIsoTimeStamp('2026-01-01T06:59:00.000Z') },
    expect: { output: '6h' },
  },
  {
    description: 'a day or more reads in whole days',
    given: { at: asIsoTimeStamp('2026-01-05T01:00:00.000Z') },
    expect: { output: '4d' },
  },
];

describe('asTimeUntilHuman', () => {
  TEST_CASES.map((thisCase, index) =>
    given(`[case${index + 1}] ${thisCase.description}`, () => {
      when('[t0] the time until is rendered', () => {
        then(`it reads ${thisCase.expect.output}`, () => {
          expect(asTimeUntilHuman({ at: thisCase.given.at, now: NOW })).toEqual(
            thisCase.expect.output,
          );
        });
      });
    }),
  );
});
