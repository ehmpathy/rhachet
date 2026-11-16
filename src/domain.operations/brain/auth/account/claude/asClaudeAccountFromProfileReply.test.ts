import { given, then, when } from 'test-fns';

import { BrainAuthAccount } from '@src/domain.objects/BrainAuthAccount';

import { asClaudeAccountFromProfileReply } from './asClaudeAccountFromProfileReply';

describe('asClaudeAccountFromProfileReply', () => {
  given('[case1] a profile reply with an account and an org', () => {
    when('[t0] it is cast', () => {
      then('it names the account with its org', () => {
        const account = asClaudeAccountFromProfileReply({
          json: {
            account: { uuid: 'uuid-b', email: 'b@example.com' },
            organization: { uuid: 'org-1' },
          },
        });
        expect(account).toEqual(
          new BrainAuthAccount({
            brain: 'claude',
            accountUuid: 'uuid-b',
            email: 'b@example.com',
            orgId: 'org-1',
          }),
        );
      });
    });
  });

  given('[case2] a profile reply with no org', () => {
    when('[t0] it is cast', () => {
      then('the org reads null', () => {
        const account = asClaudeAccountFromProfileReply({
          json: { account: { uuid: 'uuid-b', email: 'b@example.com' } },
        });
        expect(account?.orgId).toBeNull();
      });
    });
  });

  given('[case3] a reply that lacks the email', () => {
    when('[t0] it is cast', () => {
      then('it reads as drift: null, which the wire reports unreadable', () => {
        expect(
          asClaudeAccountFromProfileReply({
            json: { account: { uuid: 'uuid-b' } },
          }),
        ).toBeNull();
      });
    });
  });

  given('[case4] a null body', () => {
    when('[t0] it is cast', () => {
      then('it reads as drift', () => {
        expect(asClaudeAccountFromProfileReply({ json: null })).toBeNull();
      });
    });
  });
});
