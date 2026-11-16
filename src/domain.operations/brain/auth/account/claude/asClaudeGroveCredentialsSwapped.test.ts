import { getError, given, then, when } from 'test-fns';

import { asClaudeGroveCredentialsSwapped } from './asClaudeGroveCredentialsSwapped';

const oauthNew = {
  accessToken: 'access-b',
  refreshToken: 'refresh-b',
  expiresAt: 1763150000000,
  scopes: ['user:inference'],
  subscriptionType: 'max',
};

describe('asClaudeGroveCredentialsSwapped', () => {
  given(
    '[case1] a file on account a, with a key of its own beside the oauth block',
    () => {
      const content = JSON.stringify({
        claudeAiOauth: {
          accessToken: 'access-a',
          refreshToken: 'refresh-a',
          expiresAt: 1,
          scopes: [],
          subscriptionType: 'pro',
          rateLimitTier: 'tier-a',
        },
        mcpOAuth: { keep: true },
      });

      when('[t0] the oauth block is swapped to account b', () => {
        const swapped = JSON.parse(
          asClaudeGroveCredentialsSwapped({ content, oauth: oauthNew }),
        );

        then('the oauth block holds account b', () => {
          expect(swapped.claudeAiOauth.refreshToken).toEqual('refresh-b');
          expect(swapped.claudeAiOauth.accessToken).toEqual('access-b');
          expect(swapped.claudeAiOauth.subscriptionType).toEqual('max');
        });

        then('no trace of account a tokens remains', () => {
          expect(JSON.stringify(swapped)).not.toContain('refresh-a');
          expect(JSON.stringify(swapped)).not.toContain('access-a');
        });

        then('every other top-level key is kept', () => {
          expect(swapped.mcpOAuth).toEqual({ keep: true });
        });

        then('no key of account a block describes account b', () => {
          expect(swapped.claudeAiOauth.rateLimitTier).toBeUndefined();
          expect(swapped.claudeAiOauth).toEqual(oauthNew);
        });
      });
    },
  );

  given('[case2] no file yet', () => {
    when('[t0] the oauth block is swapped in', () => {
      then('the file holds only the new block', () => {
        const swapped = JSON.parse(
          asClaudeGroveCredentialsSwapped({ content: null, oauth: oauthNew }),
        );
        expect(swapped).toEqual({ claudeAiOauth: oauthNew });
      });
    });
  });

  given('[case3] a file that does not parse', () => {
    when('[t0] a swap is asked for', () => {
      then('it refuses, never overwrites blind', async () => {
        const error = await getError(() =>
          asClaudeGroveCredentialsSwapped({
            content: '{ nope',
            oauth: oauthNew,
          }),
        );
        expect(error.message).toContain('refused to overwrite it');
      });
    });
  });
});
