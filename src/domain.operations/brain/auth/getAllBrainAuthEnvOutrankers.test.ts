import { given, then, when } from 'test-fns';

import { getAllBrainAuthEnvOutrankers } from './getAllBrainAuthEnvOutrankers';

const TEST_CASES = [
  {
    description: 'an env with no credential',
    env: { HOME: '/h' },
    expected: [],
  },
  {
    description: 'an oauth token in the env',
    env: { CLAUDE_CODE_OAUTH_TOKEN: 'x' },
    expected: ['CLAUDE_CODE_OAUTH_TOKEN'],
  },
  {
    description: 'two credential keys set',
    env: { ANTHROPIC_API_KEY: 'x', ANTHROPIC_AUTH_TOKEN: 'y' },
    expected: ['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN'],
  },
  {
    description: 'a credential key set to the empty string',
    env: { ANTHROPIC_API_KEY: '' },
    expected: [],
  },
];

describe('getAllBrainAuthEnvOutrankers', () => {
  TEST_CASES.map((thisCase, index) =>
    given(`[case${index + 1}] ${thisCase.description}`, () => {
      when('[t0] the outrankers are read', () => {
        then(`they are ${JSON.stringify(thisCase.expected)}`, () => {
          expect(getAllBrainAuthEnvOutrankers({ env: thisCase.env })).toEqual(
            thisCase.expected,
          );
        });
      });
    }),
  );
});
