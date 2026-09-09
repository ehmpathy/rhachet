import { given, then, when } from 'test-fns';

import { getAllKeyrackPeerOrgsForFix } from './getAllKeyrackPeerOrgsForFix';

/**
 * .what = pins the peer-orgs fix line for an `--org` narrow that came back empty
 * .why = a fix line is the third beat of a helpful failure, and a WRONG one is worse than
 *        none — it sends a human to a second empty answer. so the rows below pin not only
 *        that peers are named, but that the value named is one a next `--org` can match
 */
describe('getAllKeyrackPeerOrgsForFix', () => {
  given('[case1] the rack holds keys under two other orgs', () => {
    when('[t0] the asked org holds none', () => {
      const orgs = getAllKeyrackPeerOrgsForFix({
        keys: [
          { slug: 'ehmpathy.prep.XAI_API_KEY' },
          { slug: 'ahbode.prep.SOME_KEY' },
        ],
        org: '@al',
      });

      then('it names both orgs that DO hold keys', () => {
        expect(orgs.sort()).toEqual(['ahbode', 'ehmpathy']);
      });
    });
  });

  given('[case2] the asked org is itself held', () => {
    when('[t0] the fix is composed', () => {
      const orgs = getAllKeyrackPeerOrgsForFix({
        keys: [
          { slug: 'ehmpathy.prep.XAI_API_KEY' },
          { slug: '@all.camp.GITHUB_TOKEN' },
        ],
        org: 'ehmpathy',
      });

      then('it excludes the org the human already asked for', () => {
        // .note = to echo the asked org back as a suggestion would read as a taunt —
        //         "you have none in X; try X"
        expect(orgs).toEqual(['@all']);
      });
    });
  });

  /**
   * ⚠️ .why = THE SLUG-DERIVED CLAMP. the org filter reads the SLUG, so this fix must too.
   *        a row's stored `.org` is minted from a fallback chain and can read `'unknown'`
   *        while its slug still says `@all` (`unlockKeyrackKeys.ts`). were this read
   *        from the stored field, the fix line would name `unknown` — a value the filter
   *        cannot match, so the human's next command lands on a SECOND empty answer
   */
  given('[case3] a row whose stored org would disagree with its slug', () => {
    when('[t0] the fix is composed from the slug', () => {
      const orgs = getAllKeyrackPeerOrgsForFix({
        // the input contract takes ONLY the slug — a stored `.org` is not reachable here,
        // which is the guarantee this row exists to hold
        keys: [{ slug: '@all.camp.GITHUB_TOKEN' }],
        org: '@al',
      });

      then('it names the slug org, which the filter can match', () => {
        expect(orgs).toEqual(['@all']);
      });

      then('it never names a stored-field value like `unknown`', () => {
        expect(orgs).not.toContain('unknown');
      });
    });
  });

  given('[case4] a bare key name that is not a full slug', () => {
    when('[t0] the fix is composed', () => {
      const orgs = getAllKeyrackPeerOrgsForFix({
        keys: [{ slug: 'XAI_API_KEY' }, { slug: 'my.api.KEY' }],
        org: '@al',
      });

      then('it names no org — a bare key names none', () => {
        // .note = `my.api.KEY` is a BARE key, not org `my` in env `api` — `api` is not a
        //         valid env, which is the rule `asKeyrackSlugFullOrNull` already holds
        expect(orgs).toEqual([]);
      });
    });
  });

  given('[case5] the rack is empty', () => {
    when('[t0] the fix is composed', () => {
      const orgs = getAllKeyrackPeerOrgsForFix({ keys: [], org: '@al' });

      then('it names no org, so the caller emits no fix line', () => {
        expect(orgs).toEqual([]);
      });
    });
  });
});
