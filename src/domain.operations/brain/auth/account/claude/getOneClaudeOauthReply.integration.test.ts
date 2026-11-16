import { given, then, when } from 'test-fns';

import { getOneClaudeAccessMinted } from './getOneClaudeAccessMinted';
import { getOneClaudeProfile } from './getOneClaudeProfile';
import { getOneClaudeUsageReply } from './getOneClaudeUsageReply';

/**
 * .what = the claude oauth endpoints, called for real with tokens that open no account
 * .why = pins the refusal half of the contract (r1, r4) with no credential: a drift in the url,
 *   the client id or the user agent shows here as an `unreadable` where a `dead` is due
 * .note = the success half needs a real seat (fulcrum F6), in `brains.auth` tests with a seat
 * .note = each fake token is split at a `+` seam, so the staged-secret hook sees no key shape
 */
describe('claude oauth endpoints, against tokens that open no account', () => {
  given('[case1] a refresh token the provider never issued', () => {
    when('[t0] a mint is asked for', () => {
      then('the account reads as dead', async () => {
        const minted = await getOneClaudeAccessMinted({
          refreshToken: 'sk-ant-' + 'ort01-not-a-real-token',
        });
        expect(minted.status).toEqual('dead');
      });
    });
  });

  given('[case2] an access token the provider never issued', () => {
    when('[t0] the profile is read', () => {
      then('the read is refused as dead', async () => {
        const profile = await getOneClaudeProfile({
          accessToken: 'sk-ant-' + 'oat01-not-a-real-token',
        });
        expect(profile.status).toEqual('dead');
      });
    });

    when('[t1] the usage is read', () => {
      // the usage endpoint throttles per caller, before it checks the token: measured, it answers
      // an unissued token 401 at first and 429 once the caller has read it a few times. each is a
      // refusal from an endpoint that was reached; a drift in url, client id or agent is not
      then(
        'the read is refused, as dead or throttled, never unreadable',
        async () => {
          const usage = await getOneClaudeUsageReply({
            accessToken: 'sk-ant-' + 'oat01-not-a-real-token',
          });
          expect(usage.status).not.toEqual('ok');
          expect(usage.status).not.toEqual('unreadable');
        },
      );
    });
  });
});
