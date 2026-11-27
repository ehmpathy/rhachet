import { asIsoTimeStamp } from 'iso-time';
import { given, then, when } from 'test-fns';

import { isClaudeOauthLapsed } from './isClaudeOauthLapsed';

const now = asIsoTimeStamp('2026-11-14T12:00:00Z');

const TEST_CASES = [
  {
    description: 'an expiry an hour ahead',
    expiresAt: new Date('2026-11-14T13:00:00Z').getTime(),
    expected: false,
  },
  {
    description: 'an expiry an hour past',
    expiresAt: new Date('2026-11-14T11:00:00Z').getTime(),
    expected: true,
  },
  {
    description: 'an expiry at this very second',
    expiresAt: new Date('2026-11-14T12:00:00Z').getTime(),
    expected: true,
  },
  {
    description: 'an expiry thirty seconds ahead, inside the skew margin',
    expiresAt: new Date('2026-11-14T12:00:30Z').getTime(),
    expected: true,
  },
  {
    description: 'an expiry two minutes ahead, past the skew margin',
    expiresAt: new Date('2026-11-14T12:02:00Z').getTime(),
    expected: false,
  },
  { description: 'no expiry recorded', expiresAt: null, expected: false },
] as const;

describe('isClaudeOauthLapsed', () => {
  TEST_CASES.map((thisCase) =>
    given(`[case] ${thisCase.description}`, () => {
      when('[t0] it is judged at noon', () => {
        then(`it reads lapsed = ${thisCase.expected}`, () => {
          expect(
            isClaudeOauthLapsed({ expiresAt: thisCase.expiresAt, now }),
          ).toEqual(thisCase.expected);
        });
      });
    }),
  );
});
