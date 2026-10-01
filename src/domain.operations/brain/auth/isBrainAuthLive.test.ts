import { given, then, when } from 'test-fns';

import { genSampleBrainAuth } from '@src/.test/assets/genSampleBrainAuth';

import { isBrainAuthLive } from './isBrainAuthLive';

const TEST_CASES = [
  { description: 'no file', content: null, expected: false },
  {
    description: 'a login with a refresh token',
    content: genSampleBrainAuth({ state: 'live', expiresAt: 1234 }),
    expected: true,
  },
  {
    description: 'a login with a refresh token and no expiry',
    content: JSON.stringify({ claudeAiOauth: { refreshToken: 'r' } }),
    expected: true,
  },
  {
    description: 'a dead login that still records an expiry',
    content: genSampleBrainAuth({ state: 'dead', expiresAt: 1234 }),
    expected: false,
  },
  {
    description: 'a file with no oauth block',
    content: JSON.stringify({ other: true }),
    expected: false,
  },
  {
    description: 'a file that is not json',
    content: 'not json',
    expected: false,
  },
] as const;

describe('isBrainAuthLive', () => {
  TEST_CASES.map((thisCase) =>
    given(`[case] ${thisCase.description}`, () => {
      when('[t0] the content is read', () => {
        then(`reads as ${thisCase.expected}`, () => {
          expect(isBrainAuthLive({ content: thisCase.content })).toEqual(
            thisCase.expected,
          );
        });
      });
    }),
  );
});
