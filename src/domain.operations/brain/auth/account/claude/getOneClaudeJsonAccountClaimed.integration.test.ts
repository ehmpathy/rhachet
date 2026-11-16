import { genTempDir, given, then, when } from 'test-fns';

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getOneClaudeJsonAccountClaimed } from './getOneClaudeJsonAccountClaimed';

/**
 * .what = a fake home, with `~/.claude.json` written as given, or absent when null
 */
const genHome = (input: { slug: string; claudeJson: string | null }) => {
  const home = genTempDir({ slug: input.slug });
  if (input.claudeJson !== null)
    writeFileSync(join(home, '.claude.json'), input.claudeJson);
  return home;
};

const TEST_CASES = [
  {
    description: 'a record that names an account',
    claudeJson: JSON.stringify({
      oauthAccount: { emailAddress: 'one@example.com', accountUuid: 'u1' },
    }),
    expected: { email: 'one@example.com' },
  },
  {
    description: 'no record at all',
    claudeJson: null,
    expected: null,
  },
  {
    description: 'a record with no signed-in account',
    claudeJson: JSON.stringify({ numStartups: 3 }),
    expected: null,
  },
  {
    description: 'an account with no email',
    claudeJson: JSON.stringify({ oauthAccount: { accountUuid: 'u1' } }),
    expected: null,
  },
  {
    description: 'a record that is not json',
    claudeJson: '{ not json',
    expected: null,
  },
] as const;

describe('getOneClaudeJsonAccountClaimed', () => {
  TEST_CASES.map((thisCase, index) =>
    given(`[case${index + 1}] ${thisCase.description}`, () => {
      when('[t0] the claim is read', () => {
        then(`it reads ${JSON.stringify(thisCase.expected)}`, () => {
          const home = genHome({
            slug: `claude-json-claimed-${index + 1}`,
            claudeJson: thisCase.claudeJson,
          });
          expect(getOneClaudeJsonAccountClaimed({ home })).toEqual(
            thisCase.expected,
          );
        });
      });
    }),
  );
});
