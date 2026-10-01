import { given, then, when } from 'test-fns';

import { isBrainAuthViaEnv } from './isBrainAuthViaEnv';

const TEST_CASES = [
  { description: 'no credential env', env: {}, expected: false },
  {
    description: 'an empty key',
    env: { ANTHROPIC_API_KEY: '' },
    expected: false,
  },
  {
    description: 'CLAUDE_CODE_OAUTH_TOKEN',
    env: { CLAUDE_CODE_OAUTH_TOKEN: 'x' },
    expected: true,
  },
  {
    description: 'ANTHROPIC_API_KEY',
    env: { ANTHROPIC_API_KEY: 'x' },
    expected: true,
  },
  {
    description: 'ANTHROPIC_AUTH_TOKEN',
    env: { ANTHROPIC_AUTH_TOKEN: 'x' },
    expected: true,
  },
] as const;

describe('isBrainAuthViaEnv', () => {
  TEST_CASES.map((thisCase) =>
    given(`[case] ${thisCase.description}`, () => {
      when('[t0] the env is checked', () => {
        then(`reads as ${thisCase.expected}`, () => {
          expect(isBrainAuthViaEnv({ env: thisCase.env })).toEqual(
            thisCase.expected,
          );
        });
      });
    }),
  );
});
