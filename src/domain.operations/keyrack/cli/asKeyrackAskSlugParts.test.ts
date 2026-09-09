import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { asKeyrackAskSlugParts } from './asKeyrackAskSlugParts';

/**
 * .what = the unit clamp for the reduction `set` and `del` now share
 * .why = the two verbs each carried their own copy of this block, and the copies DRIFTED on guard
 *        order. this file pins the shape at its one home, so the drift cannot recur unnoticed
 */
describe('asKeyrackAskSlugParts', () => {
  given('[case1] a bare key name', () => {
    when('[t0] it is reduced under a resolved org and env', () => {
      // .why = the common path. a bare name makes no claim about its org or env, so it defers to
      //        the ask verbatim and must pass every guard untouched
      then('the ask stands, unchanged', () => {
        expect(
          asKeyrackAskSlugParts({
            key: 'API_KEY',
            org: 'testorg',
            env: 'prep',
            envAsked: 'prep',
          }),
        ).toEqual({ key: 'API_KEY', org: 'testorg', env: 'prep' });
      });
    });

    when('[t1] the bare name carries dots', () => {
      // ⚠️ .why = `my.api.KEY` LOOKS like a slug, and is not — `api` is no valid env. the
      //        reduction must defer to `isKeyrackSlugFormat` rather than count dots, or a dotted
      //        key name is silently rewritten as an org it never named
      then('it is still a bare name', () => {
        expect(
          asKeyrackAskSlugParts({
            key: 'my.api.KEY',
            org: 'testorg',
            env: 'prep',
            envAsked: null,
          }),
        ).toEqual({ key: 'my.api.KEY', org: 'testorg', env: 'prep' });
      });
    });
  });

  given('[case2] a full slug that agrees with the ask', () => {
    when('[t0] it is reduced', () => {
      // ⚠️ .why = THE ROW THE WISH EXISTS FOR. handed the slug whole, the caller composed
      //        `$org.$env.$slug` and wrote `testorg.prep.testorg.prep.API_KEY`. the reduction is
      //        what makes the composed name the slug the human asked for
      then('the slug is reduced to its bare key name', () => {
        expect(
          asKeyrackAskSlugParts({
            key: 'testorg.prep.API_KEY',
            org: 'testorg',
            env: 'prep',
            envAsked: 'prep',
          }),
        ).toEqual({ key: 'API_KEY', org: 'testorg', env: 'prep' });
      });
    });

    when('[t1] the key name itself carries dots', () => {
      then('only the first two segments are consumed', () => {
        expect(
          asKeyrackAskSlugParts({
            key: 'testorg.prep.API.KEY.V2',
            org: 'testorg',
            env: 'prep',
            envAsked: null,
          }),
        ).toEqual({ key: 'API.KEY.V2', org: 'testorg', env: 'prep' });
      });
    });
  });

  given('[case3] a full slug that conflicts on ONE axis', () => {
    when('[t0] the slug org differs from the resolved org', () => {
      const error = getError(() =>
        asKeyrackAskSlugParts({
          key: 'foreignorg.prep.API_KEY',
          org: 'testorg',
          env: 'prep',
          envAsked: 'prep',
        }),
      );

      then('it refuses as caller-fixable', () => {
        expect(error).toBeInstanceOf(ConstraintError);
      });

      then('the refusal names both orgs and the fix', () => {
        expect(error.message).toContain('does not match manifest org');
        expect(error.message).toContain('foreignorg');
        expect(error.message).toContain('testorg');
      });
    });

    when('[t1] the ask resolved to @all', () => {
      // ⚠️ .why = `--org @all` is a DELIBERATE override, never an oversight — a machine-wide ask
      //        may name any slug. an org guard that fired here would refuse the one flag the
      //        wish added to let a human reach past the manifest
      then('the org guard stands down', () => {
        expect(
          asKeyrackAskSlugParts({
            key: 'foreignorg.prep.API_KEY',
            org: '@all',
            env: 'prep',
            envAsked: null,
          }),
        ).toEqual({ key: 'API_KEY', org: 'foreignorg', env: 'prep' });
      });
    });

    when('[t2] the spelled env differs from the slug env', () => {
      const error = getError(() =>
        asKeyrackAskSlugParts({
          key: 'testorg.prod.API_KEY',
          org: 'testorg',
          env: 'prod',
          envAsked: 'test',
        }),
      );

      then('it refuses on the env axis', () => {
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('conflicts with env in slug');
      });
    });

    when('[t3] no env was spelled at all', () => {
      // ⚠️ .why = THE ONE WAY THE TWO CALLERS DIFFER. `set --env` is optional, so a null here
      //        must leave the env axis open — never read as an empty env that conflicts with
      //        every slug. this row is what lets one operation serve both verbs
      then('the env guard stands down and the slug env wins', () => {
        expect(
          asKeyrackAskSlugParts({
            key: 'testorg.prod.API_KEY',
            org: 'testorg',
            env: 'prep',
            envAsked: null,
          }),
        ).toEqual({ key: 'API_KEY', org: 'testorg', env: 'prod' });
      });
    });

    when('[t4] the spelled env is the `all` wildcard', () => {
      then('the env guard stands down', () => {
        expect(
          asKeyrackAskSlugParts({
            key: 'testorg.prod.API_KEY',
            org: 'testorg',
            env: 'all',
            envAsked: 'all',
          }),
        ).toEqual({ key: 'API_KEY', org: 'testorg', env: 'prod' });
      });
    });
  });

  given('[case4] a full slug that conflicts on BOTH axes at once', () => {
    /**
     * ⚠️ .what = THE ROW THIS FILE EXISTS FOR — the only shape that can read the guard ORDER
     * .why = only the guard that runs first is ever reported, so a slug that conflicts on ONE
     *        axis draws the same message under either order and proves neither. every
     *        single-axis row above stayed green while `set` and `del` answered this input
     *        differently. the order is a contract, and this row is its only witness
     */
    when('[t0] the org and the env both disagree', () => {
      const error = getError(() =>
        asKeyrackAskSlugParts({
          key: 'foreignorg.prod.API_KEY',
          org: 'testorg',
          env: 'prep',
          envAsked: 'test',
        }),
      );

      then('the ORG refusal wins, and the env one is never raised', () => {
        expect(error.message).toContain('does not match manifest org');
        expect(error.message).not.toContain('conflicts with env in slug');
      });
    });
  });
});
