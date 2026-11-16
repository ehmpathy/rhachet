import { given, then, when } from 'test-fns';

import { asClaudeGroveOauth } from './asClaudeGroveOauth';

const BLOCK_FULL = {
  accessToken: 'sk-ant-oat01-fake',
  refreshToken: 'sk-ant-ort01-fake',
  expiresAt: 1763150000000,
  scopes: ['user:inference', 'user:profile'],
  subscriptionType: 'max',
};

const TEST_CASES = [
  {
    description: 'reads a whole block',
    given: { content: JSON.stringify({ claudeAiOauth: BLOCK_FULL }) },
    expect: BLOCK_FULL,
  },
  {
    description: 'leaves absent optional fields as null or empty',
    given: {
      content: JSON.stringify({
        claudeAiOauth: { accessToken: 'a', refreshToken: 'r' },
      }),
    },
    expect: {
      accessToken: 'a',
      refreshToken: 'r',
      expiresAt: null,
      scopes: [],
      subscriptionType: null,
    },
  },
  {
    description: 'is null for an absent file',
    given: { content: null },
    expect: null,
  },
  {
    description: 'is null for a file that does not parse',
    given: { content: '{ not json' },
    expect: null,
  },
  {
    description: 'is null for a file with no oauth block',
    given: { content: JSON.stringify({ other: true }) },
    expect: null,
  },
  {
    description: 'is null for a half block (no access token)',
    given: {
      content: JSON.stringify({ claudeAiOauth: { refreshToken: 'r' } }),
    },
    expect: null,
  },
  {
    description: 'is null for a dead login (empty refresh token)',
    given: {
      content: JSON.stringify({
        claudeAiOauth: { accessToken: 'a', refreshToken: '' },
      }),
    },
    expect: null,
  },
];

describe('asClaudeGroveOauth', () => {
  TEST_CASES.map((thisCase, index) =>
    given(`[case${index + 1}] ${thisCase.description}`, () => {
      when('[t0] the grove credential file is read', () => {
        then('it yields the expected oauth block', () => {
          expect(asClaudeGroveOauth(thisCase.given)).toEqual(thisCase.expect);
        });
      });
    }),
  );
});
