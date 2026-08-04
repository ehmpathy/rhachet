import { ConstraintError } from 'helpful-errors';
import { getError, given, then, useBeforeAll, when } from 'test-fns';

import { getOneKeyrackAwsParamReadyContext } from './getOneKeyrackAwsParamReadyContext';

/**
 * .what = integration test for the shared pre-SSM readiness prechecks
 * .why = gates 0 (exid legal) + 1 (peer present) + 3 (region present) run before any SSM call;
 *        the peer load is real i/o, so this is an integration test that asserts each gate fails
 *        loud in precedence order and the happy path returns the ready context
 */
describe('getOneKeyrackAwsParamReadyContext', () => {
  given('[case1] a legal exid, present peer, and meta with a region', () => {
    const ready = useBeforeAll(async () =>
      getOneKeyrackAwsParamReadyContext({
        exid: '/keyrack/infra/vault/aws.params/v1/mechanic/ehmpathy/prod/ANTHROPIC_API_KEY',
        meta: { region: 'us-east-1' },
      }),
    );

    when('[t0] the ready context is assembled', () => {
      then('it returns the loaded declastruct surface', () => {
        expect(ready.declastruct.sdkSsm).toBeDefined();
      });

      then('it returns the region from meta', () => {
        expect(ready.region).toEqual('us-east-1');
      });

      then(
        'it returns the endpoint pass-through (null when no override is set)',
        () => {
          // no KEYRACK_AWS_SSM_ENDPOINT in this run → the shared source returns null, so the read
          // path derives the real AWS endpoint. the acceptance/journey harness is where a non-null
          // endpoint rides (the emulator swap); here the pass-through of null is the assertion
          expect(ready.endpoint).toEqual(null);
        },
      );
    });
  });

  given(
    '[case2] a malformed exid (gate 0) AND meta with no region (gate 3) — both unmet at once',
    () => {
      when('[t0] the ready context is requested', () => {
        // c35: gate precedence. with gate 0 (illegal exid) AND gate 3 (absent region) both unmet,
        // the shared helper runs 0 → 1 → 3 in order, so the gate-0 name error MUST surface first —
        // never the region error. this locks the declared precedence: a future reorder that let
        // the region check run ahead of the name check would trip this, not pass silently
        then(
          'the gate-0 name error surfaces first, NOT the gate-3 region error',
          async () => {
            const error = await getError(
              getOneKeyrackAwsParamReadyContext({
                exid: 'has spaces and = illegal chars',
                meta: null,
              }),
            );

            // it fails loud
            expect(error).toBeInstanceOf(Error);

            // the region check throws a ConstraintError whose message contains 'region'; the gate-0
            // name check (isKeyrackAwsParamName.assure) throws an AssureIsOfTypeRejectionError that
            // does NOT. so an absence of 'region' in the message proves gate 0 beat gate 3
            expect(error.message).not.toContain('region');
          },
        );
      });
    },
  );

  given('[case4] an absent exid (gate 0a — owned by the shared seam)', () => {
    when('[t0] the ready context is requested with a null exid', () => {
      then(
        'it fails loud as a ConstraintError that names the set fix',
        async () => {
          await expect(
            getOneKeyrackAwsParamReadyContext({ exid: null, meta: null }),
          ).rejects.toThrow(ConstraintError);
        },
      );
    });
  });

  given('[case3] a legal exid but meta with no region (gate 3)', () => {
    when('[t0] the ready context is requested', () => {
      then(
        'it fails loud as a ConstraintError that names the region fix',
        async () => {
          await expect(
            getOneKeyrackAwsParamReadyContext({
              exid: '/keyrack/infra/vault/aws.params/v1/mechanic/ehmpathy/prod/ANTHROPIC_API_KEY',
              meta: null,
            }),
          ).rejects.toThrow(ConstraintError);
        },
      );
    });
  });

  given(
    '[case5] meta.region is R1 but the ambient AWS_REGION is a DIFFERENT R2 (c51)',
    () => {
      // c51: the region-asymmetry the blueprint flagged for a regression lock, not prose.
      // region is captured at SET into meta.region; at unlock/get, gate 3 reads meta.region ALONE,
      // with NO ambient re-resolution — so a grove whose env carries a different AWS_REGION between
      // set and unlock still targets the region the param was registered in. this locks that: a
      // future change that re-resolves ambient region at unlock would trip this, not pass silently
      const priorRegion = process.env.AWS_REGION;
      const priorRegionDefault = process.env.AWS_DEFAULT_REGION;

      const ready = useBeforeAll(async () => {
        // set the ambient region to R2 (us-west-2), DIFFERENT from the meta region R1 (us-east-1)
        process.env.AWS_REGION = 'us-west-2';
        process.env.AWS_DEFAULT_REGION = 'us-west-2';
        return getOneKeyrackAwsParamReadyContext({
          exid: '/keyrack/infra/vault/aws.params/v1/mechanic/ehmpathy/prod/ANTHROPIC_API_KEY',
          meta: { region: 'us-east-1' },
        });
      });

      afterAll(() => {
        // restore the ambient env so no later test inherits the R2 override
        if (priorRegion === undefined) delete process.env.AWS_REGION;
        else process.env.AWS_REGION = priorRegion;
        if (priorRegionDefault === undefined)
          delete process.env.AWS_DEFAULT_REGION;
        else process.env.AWS_DEFAULT_REGION = priorRegionDefault;
      });

      when('[t0] the ready context is assembled', () => {
        then('it returns the meta region R1, NOT the ambient R2', () => {
          expect(ready.region).toEqual('us-east-1');
          expect(ready.region).not.toEqual('us-west-2');
        });
      });
    },
  );
});
