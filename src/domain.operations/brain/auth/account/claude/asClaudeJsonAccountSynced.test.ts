import { given, then, when } from 'test-fns';

import { genSampleBrainAuthAccount } from '@src/.test/assets/genSampleBrainAuthAccount';

import { asClaudeJsonAccountSynced } from './asClaudeJsonAccountSynced';

const account = genSampleBrainAuthAccount({ email: 'b@example.com' });

const TEST_CASES = [
  {
    description:
      'renames the record to the new account and keeps every other key',
    given: {
      content: JSON.stringify({
        numStartups: 4,
        oauthAccount: {
          accountUuid: 'uuid-a',
          emailAddress: 'a@example.com',
          organizationRole: 'admin',
        },
      }),
    },
    expect: {
      numStartups: 4,
      oauthAccount: {
        accountUuid: account.accountUuid,
        emailAddress: 'b@example.com',
        organizationRole: 'admin',
      },
    },
  },
  {
    description: 'adds the record to a file that had none',
    given: { content: JSON.stringify({ numStartups: 1 }) },
    expect: {
      numStartups: 1,
      oauthAccount: {
        accountUuid: account.accountUuid,
        emailAddress: 'b@example.com',
      },
    },
  },
];

describe('asClaudeJsonAccountSynced', () => {
  TEST_CASES.map((thisCase, index) =>
    given(`[case${index + 1}] ${thisCase.description}`, () => {
      when('[t0] the record is synced to the account', () => {
        then('it yields the expected record', () => {
          const synced = asClaudeJsonAccountSynced({
            content: thisCase.given.content,
            account,
          });
          expect(JSON.parse(synced!)).toEqual(thisCase.expect);
        });
      });
    }),
  );

  given(`[case${TEST_CASES.length + 1}] an absent file`, () => {
    when('[t0] the record is synced to the account', () => {
      then('it leaves the file alone', () => {
        expect(
          asClaudeJsonAccountSynced({ content: null, account }),
        ).toBeNull();
      });
    });
  });

  given(`[case${TEST_CASES.length + 2}] a file that does not parse`, () => {
    when('[t0] the record is synced to the account', () => {
      then('it leaves the file alone', () => {
        expect(
          asClaudeJsonAccountSynced({ content: '{ nope', account }),
        ).toBeNull();
      });
    });
  });
});
