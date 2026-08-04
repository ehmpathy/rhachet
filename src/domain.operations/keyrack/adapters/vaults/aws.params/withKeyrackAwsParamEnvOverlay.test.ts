import { getError, given, then, useBeforeAll, when } from 'test-fns';

import { withKeyrackAwsParamEnvOverlay } from './withKeyrackAwsParamEnvOverlay';

/**
 * .what = unit clamp for the AWS env overlay HOF — the specific-org identity mechanism
 *
 * .why = the org-scope hardcut authenticates a specific-org key as that org's AWS_PROFILE. the
 *   ONLY seam that carries the chosen identity to declastruct's SSMClient is process.env.AWS_PROFILE
 *   (the client is built with region only). this clamps the mechanism directly: the overlay is
 *   VISIBLE inside the call and RESTORED after — so the specific-org success path (profile set) and
 *   the @all path (profile cleared for the IMDS default chain) are both proven, plus the restore
 *   holds even when the wrapped call throws (a leaked profile would mis-scope the NEXT key). the
 *   reviewer flagged the specific-org overlay as never exercised (r10.3 — its cited c67 was absent)
 */
describe('withKeyrackAwsParamEnvOverlay', () => {
  given('[case1] a specific-org profile overlay', () => {
    // capture the prior env so each case restores it, so the suite stays hermetic regardless of
    // whatever AWS_PROFILE/endpoint the ambient shell carries
    const prior = useBeforeAll(async () => ({
      profile: process.env.AWS_PROFILE,
      endpoint: process.env.AWS_ENDPOINT_URL_SSM,
    }));
    afterAll(() => {
      if (prior.profile === undefined) delete process.env.AWS_PROFILE;
      else process.env.AWS_PROFILE = prior.profile;
      if (prior.endpoint === undefined) delete process.env.AWS_ENDPOINT_URL_SSM;
      else process.env.AWS_ENDPOINT_URL_SSM = prior.endpoint;
    });

    when('[t0] the wrapped call runs under an org profile', () => {
      const seen = useBeforeAll(async () => {
        // seed a DISTINCT prior value so restore is observable, not a coincidental match
        process.env.AWS_PROFILE = 'prior-ambient-profile';
        const inside = await withKeyrackAwsParamEnvOverlay(
          { awsProfile: 'ehmpathy-prod', endpoint: null },
          // the wrapped call observes what identity the SDK would see at call time
          async () => process.env.AWS_PROFILE,
        );
        return { inside, after: process.env.AWS_PROFILE };
      });

      then(
        'the org profile is the ambient identity WHILE the call runs',
        () => {
          expect(seen.inside).toEqual('ehmpathy-prod');
        },
      );

      then('the prior profile is restored AFTER the call', () => {
        expect(seen.after).toEqual('prior-ambient-profile');
      });
    });
  });

  given('[case2] the @all (grove) overlay clears AWS_PROFILE', () => {
    when('[t0] the wrapped call runs with awsProfile undefined', () => {
      const seen = useBeforeAll(async () => {
        process.env.AWS_PROFILE = 'some-ambient-profile';
        const inside = await withKeyrackAwsParamEnvOverlay(
          { awsProfile: undefined, endpoint: null },
          async () => process.env.AWS_PROFILE,
        );
        const after = process.env.AWS_PROFILE;
        // restore for suite hygiene
        delete process.env.AWS_PROFILE;
        return { inside, after };
      });

      then(
        'AWS_PROFILE is ABSENT while the call runs (the default chain derives IMDS)',
        () => {
          expect(seen.inside).toBeUndefined();
        },
      );

      then('the prior profile is restored after the call', () => {
        expect(seen.after).toEqual('some-ambient-profile');
      });
    });
  });

  given('[case3] the endpoint overlay', () => {
    when('[t0] a URL endpoint is applied', () => {
      const seen = useBeforeAll(async () => {
        delete process.env.AWS_ENDPOINT_URL_SSM;
        const inside = await withKeyrackAwsParamEnvOverlay(
          { awsProfile: undefined, endpoint: 'http://127.0.0.1:4566' },
          async () => process.env.AWS_ENDPOINT_URL_SSM,
        );
        return { inside, after: process.env.AWS_ENDPOINT_URL_SSM };
      });

      then('the endpoint is applied WHILE the call runs', () => {
        expect(seen.inside).toEqual('http://127.0.0.1:4566');
      });

      then('the endpoint is cleared AFTER the call (was absent prior)', () => {
        expect(seen.after).toBeUndefined();
      });
    });
  });

  given('[case4] the wrapped call throws', () => {
    when('[t0] fn rejects while overlays are applied', () => {
      const outcome = useBeforeAll(async () => {
        process.env.AWS_PROFILE = 'restore-me';
        const error = await getError(
          withKeyrackAwsParamEnvOverlay(
            { awsProfile: 'transient', endpoint: 'http://x' },
            async () => {
              throw new Error('boom');
            },
          ),
        );
        const after = process.env.AWS_PROFILE;
        delete process.env.AWS_PROFILE;
        return { error, after };
      });

      then('the error propagates (the overlay never swallows it)', () => {
        expect(outcome.error.message).toEqual('boom');
      });

      then('the prior profile is restored despite the throw', () => {
        // a leaked overlay would mis-scope the NEXT key's identity — the finally must restore
        expect(outcome.after).toEqual('restore-me');
      });
    });
  });
});
