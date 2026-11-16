import { given, then, when } from 'test-fns';

import { asClaudeJsonAccountClaimed } from './asClaudeJsonAccountClaimed';

const TEST_CASES = [
  {
    description: 'names the email the record claims',
    given: {
      content: JSON.stringify({
        oauthAccount: { emailAddress: 'a@example.com' },
      }),
    },
    expect: { email: 'a@example.com' },
  },
  {
    description: 'no content names none',
    given: { content: null },
    expect: null,
  },
  {
    description: 'content that does not parse names none',
    given: { content: '{ not json' },
    expect: null,
  },
  {
    description: 'a record with no oauth account names none',
    given: { content: JSON.stringify({ theme: 'dark' }) },
    expect: null,
  },
  {
    description: 'an oauth account with no email names none',
    given: { content: JSON.stringify({ oauthAccount: { uuid: 'x' } }) },
    expect: null,
  },
];

describe('asClaudeJsonAccountClaimed', () => {
  TEST_CASES.map((thisCase, index) =>
    given(`[case${index + 1}] ${thisCase.description}`, () => {
      when('[t0] the claimed account is read', () => {
        then('it yields the expected claim', () => {
          expect(asClaudeJsonAccountClaimed(thisCase.given)).toEqual(
            thisCase.expect,
          );
        });
      });
    }),
  );
});
