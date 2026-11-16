import { asIsoTimeStamp } from 'iso-time';
import { given, then, when } from 'test-fns';

import { asClaudeTokenPairFromReply } from './asClaudeTokenPairFromReply';
import { CLAUDE_OAUTH } from './claudeOauth';

const now = asIsoTimeStamp('2026-11-14T00:00:00.000Z');
const nowMs = new Date(now).getTime();

describe('asClaudeTokenPairFromReply', () => {
  given('[case1] a token reply with both tokens, a ttl and scopes', () => {
    when('[t0] it is cast', () => {
      then('it carries the pair, the expiry from now, and the scopes', () => {
        const pair = asClaudeTokenPairFromReply({
          json: {
            access_token: 'access-1',
            refresh_token: 'refresh-2',
            expires_in: 60,
            scope: 'user:inference user:profile',
          },
          now,
        });
        expect(pair).toEqual({
          accessToken: 'access-1',
          refreshToken: 'refresh-2',
          expiresAt: nowMs + 60_000,
          scopes: ['user:inference', 'user:profile'],
        });
      });
    });
  });

  given('[case2] a reply with no ttl', () => {
    when('[t0] it is cast', () => {
      then('the expiry falls back to the default lifetime', () => {
        const pair = asClaudeTokenPairFromReply({
          json: { access_token: 'access-1', refresh_token: 'refresh-2' },
          now,
        });
        expect(pair?.expiresAt).toEqual(
          nowMs + CLAUDE_OAUTH.accessTtlSecondsDefault * 1000,
        );
      });
    });
  });

  given('[case3] a reply that lacks the refresh token', () => {
    when('[t0] it is cast', () => {
      then('it reads as drift: null, which the wire reports unreadable', () => {
        expect(
          asClaudeTokenPairFromReply({
            json: { access_token: 'access-1' },
            now,
          }),
        ).toBeNull();
      });
    });
  });
});
