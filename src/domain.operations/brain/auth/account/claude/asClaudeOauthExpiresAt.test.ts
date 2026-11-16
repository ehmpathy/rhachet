import { asIsoTimeStamp } from 'iso-time';
import { given, then, when } from 'test-fns';

import { asClaudeOauthExpiresAt } from './asClaudeOauthExpiresAt';

const NOW = asIsoTimeStamp('2026-01-01T00:00:00.000Z');
const NOW_MS = Date.parse(NOW);

const TEST_CASES = [
  {
    description: 'adds the lifetime in seconds to now, as epoch milliseconds',
    given: { ttlSeconds: 3600, now: NOW },
    expect: { output: NOW_MS + 3_600_000 },
  },
  {
    description: 'a zero lifetime lapses at now',
    given: { ttlSeconds: 0, now: NOW },
    expect: { output: NOW_MS },
  },
];

describe('asClaudeOauthExpiresAt', () => {
  TEST_CASES.map((thisCase, index) =>
    given(`[case${index + 1}] ${thisCase.description}`, () => {
      when('[t0] the expiry is computed', () => {
        then('it yields the expected epoch milliseconds', () => {
          expect(asClaudeOauthExpiresAt(thisCase.given)).toEqual(
            thisCase.expect.output,
          );
        });
      });
    }),
  );
});
