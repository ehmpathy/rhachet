import { given, then, when } from 'test-fns';

import { genSampleBrainAuth } from '@src/.test/assets/genSampleBrainAuth';

import { asBrainAuthOauth } from './asBrainAuthOauth';

// the sample logins, and the exact oauth block each file holds
const loginLive = genSampleBrainAuth({ state: 'live', expiresAt: 1 });
const loginDead = genSampleBrainAuth({ state: 'dead', expiresAt: 1 });
const blockLive = JSON.parse(loginLive).claudeAiOauth;
const blockDead = JSON.parse(loginDead).claudeAiOauth;

const TEST_CASES = [
  { description: 'no file', content: null, expected: null },
  {
    description: 'a live login',
    content: loginLive,
    expected: { refreshToken: blockLive.refreshToken, block: blockLive },
  },
  {
    description: 'a dead login (refresh token emptied)',
    content: loginDead,
    expected: { refreshToken: '', block: blockDead },
  },
  {
    description: 'an oauth block with no refresh token',
    content: JSON.stringify({ claudeAiOauth: { accessToken: 'a' } }),
    expected: { refreshToken: null, block: { accessToken: 'a' } },
  },
  {
    description: 'a file with no oauth block',
    content: JSON.stringify({ other: true }),
    expected: null,
  },
  {
    description: 'an oauth block that is not an object',
    content: JSON.stringify({ claudeAiOauth: 'x' }),
    expected: null,
  },
  { description: 'a json scalar', content: '42', expected: null },
  {
    description: 'a file that is not json',
    content: 'not json',
    expected: null,
  },
] as const;

describe('asBrainAuthOauth', () => {
  TEST_CASES.map((thisCase) =>
    given(`[case] ${thisCase.description}`, () => {
      when('[t0] the content is read', () => {
        then('it yields the oauth block, or null', () => {
          expect(asBrainAuthOauth({ content: thisCase.content })).toEqual(
            thisCase.expected,
          );
        });
      });
    }),
  );
});
