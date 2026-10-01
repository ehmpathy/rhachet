import { given, then, when } from 'test-fns';

import { genSampleBrainAuth } from '@src/.test/assets/genSampleBrainAuth';

import { asBrainAuthState } from './asBrainAuthState';

const TEST_CASES = [
  { description: 'no file', content: null, expected: 'absent' },
  {
    description: 'a live login',
    content: genSampleBrainAuth({ state: 'live', expiresAt: 1 }),
    expected: 'present',
  },
  {
    description: 'the dead-token clear (secrets emptied, rest kept)',
    content: JSON.stringify({
      claudeAiOauth: {
        accessToken: '',
        refreshToken: '',
        expiresAt: 0,
        refreshTokenExpiresAt: 9999999999999,
        scopes: ['user:inference'],
      },
    }),
    expected: 'dead',
  },
  {
    description: 'a file with no oauth block',
    content: '{}',
    expected: 'present',
  },
  {
    description: 'a file that is not json',
    content: 'not json',
    expected: 'present',
  },
] as const;

describe('asBrainAuthState', () => {
  TEST_CASES.map((thisCase) =>
    given(`[case] ${thisCase.description}`, () => {
      when('[t0] the content is read', () => {
        then(`reads as ${thisCase.expected}`, () => {
          expect(asBrainAuthState({ content: thisCase.content })).toEqual(
            thisCase.expected,
          );
        });
      });
    }),
  );
});
