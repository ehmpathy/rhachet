import { given, then, when } from 'test-fns';

import { asClaudeOauthScopes } from './asClaudeOauthScopes';

const TEST_CASES = [
  {
    description: 'splits a space-joined scope string into a list',
    given: { scope: 'user:inference user:profile' },
    expect: { output: ['user:inference', 'user:profile'] },
  },
  {
    description: 'drops the empty entries a double space leaves',
    given: { scope: 'user:inference  user:profile ' },
    expect: { output: ['user:inference', 'user:profile'] },
  },
  {
    description: 'reads an absent scope as no scopes',
    given: { scope: undefined },
    expect: { output: [] },
  },
  {
    description: 'reads a non-string scope as no scopes',
    given: { scope: ['user:inference'] },
    expect: { output: [] },
  },
];

describe('asClaudeOauthScopes', () => {
  TEST_CASES.map((thisCase, index) =>
    given(`[case${index + 1}] ${thisCase.description}`, () => {
      when('[t0] the scope is read', () => {
        then('it yields the expected scope list', () => {
          expect(asClaudeOauthScopes(thisCase.given)).toEqual(
            thisCase.expect.output,
          );
        });
      });
    }),
  );
});
