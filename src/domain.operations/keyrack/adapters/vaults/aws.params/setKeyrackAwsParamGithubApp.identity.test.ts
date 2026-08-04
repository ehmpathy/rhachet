import { given, then, useBeforeAll, when } from 'test-fns';

import type { DeclastructAws } from './getOneDeclastructAws';
import { setKeyrackAwsParamGithubApp } from './setKeyrackAwsParamGithubApp';

/**
 * .what = clamp: the github-app persist authenticates the write + its roundtrip-verify as the
 *   RESOLVED --org identity it is handed — a specific org's declared AWS_PROFILE, or @all's cleared
 *   (IMDS) identity — NEVER the machine's ambient AWS_PROFILE.
 *
 * .why = a regression clamp for the exact defect the human hit: `keyrack set --vault aws.params`
 *   for a scoped org was authenticating as `process.env.AWS_PROFILE` (ambient), so a human who had
 *   unlocked their org keyrack but not exported AWS_PROFILE got "found no AWS identity". the fix
 *   makes the write authenticate as the org's declared profile regardless of ambient. two clamps:
 *   - [case1] a specific-org identity + a WRONG ambient AWS_PROFILE exported → write + verify run
 *     under the ORG profile, never the ambient sentinel (the human need not export AWS_PROFILE).
 *   - [case2] an @all identity + an ambient AWS_PROFILE exported → write + verify CLEAR AWS_PROFILE
 *     (the grove's IMDS role), never the ambient sentinel.
 *
 * .how = every i/o boundary is a LIGHTWEIGHT FAKE injected via context.deps (dependency injection,
 *   per rule.forbid.unit.remote-boundaries — NO jest.mock of remote-boundary modules). the fakes
 *   record the AWS_PROFILE in force at each seam so this unit observes ONLY the identity
 *   wire-through — no gh cli, no SSM. withKeyrackAwsParamEnvOverlay is NOT faked: the REAL overlay
 *   runs around the write, so the observed AWS_PROFILE is genuinely what the write authenticated as.
 */

// the blob the acquire step yields; the readback returns the SAME value so the roundtrip verify
// passes (a mismatch would throw before the assertions run)
const BLOB = '{"appId":"123","installationId":"456","privateKey":"PEM"}';

// a WRONG ambient profile exported at set time — the write must ignore it in both cases
const SENTINEL = 'sentinel-provisioner-profile';

/**
 * .what = run setKeyrackAwsParamGithubApp with a sentinel AWS_PROFILE exported + faked i/o, and
 *   record the AWS_PROFILE the write ran under + the credsEnv the roundtrip read-back received
 * .why = both cases share this exact harness; only the injected identity differs
 */
const runWithIdentity = async (input: {
  identity: { source: 'imds' } | { source: 'profile'; profile: string };
}): Promise<{
  writeProfile: string | undefined | 'UNSET';
  readbackProfile: string | undefined | 'UNSET';
}> => {
  const priorProfile = process.env.AWS_PROFILE;
  process.env.AWS_PROFILE = SENTINEL;

  const observed: {
    writeProfile: string | undefined | 'UNSET';
    readbackProfile: string | undefined | 'UNSET';
  } = { writeProfile: 'UNSET', readbackProfile: 'UNSET' };

  // a minimal fake declastruct: only the write seam + the ctor the orchestrator news up are
  // exercised (the read seam is covered by the faked readback below). the full DeclastructAws type
  // is the external declastruct-aws SDK surface — an external-org boundary — so ONE documented cast
  // of the minimal fake is the sanctioned as-cast exception (rule.forbid.as-cast).
  const fakeDeclastruct = {
    DeclaredAwsSsmParameterSecure: class {
      constructor(_input: unknown) {
        // the orchestrator only news it up to hand to setSsmParameterSecure
      }
    },
    setSsmParameterSecure: async () => {
      // the real env overlay has set AWS_PROFILE to the resolved identity's value here
      observed.writeProfile = process.env.AWS_PROFILE;
    },
  } as unknown as DeclastructAws;

  try {
    await setKeyrackAwsParamGithubApp(
      {
        slug: 'ehmpathy.test.GHAPP',
        exid: '/keyrack/journey/GHAPP',
        region: 'us-east-1',
        identity: input.identity,
      },
      {
        deps: {
          // acquireForSet yields a blob headlessly — no gh cli, no terminal
          acquireForSet: async () => ({ source: BLOB }),
          // no endpoint override in this unit (prod-shaped)
          getOneKeyrackAwsParamEndpoint: () => null,
          getOneDeclastructAws: async () => fakeDeclastruct,
          // the read-back records the AWS_PROFILE it receives and returns the same blob so the
          // roundtrip verify passes
          getOneKeyrackAwsParam: async (getInput) => {
            observed.readbackProfile = getInput.credsEnv.AWS_PROFILE;
            return { value: BLOB, type: 'SecureString' };
          },
        },
      },
    );
  } finally {
    // restore the prior env — never leak the sentinel to peer tests
    if (priorProfile === undefined) delete process.env.AWS_PROFILE;
    else process.env.AWS_PROFILE = priorProfile;
  }

  return observed;
};

describe('setKeyrackAwsParamGithubApp identity (unit)', () => {
  given(
    '[case1] a specific-org identity + a WRONG ambient AWS_PROFILE exported',
    () => {
      const ORG_PROFILE = 'ehmpathy-prod';

      const scene = useBeforeAll(async () =>
        runWithIdentity({
          identity: { source: 'profile', profile: ORG_PROFILE },
        }),
      );

      when('[t0] the write + roundtrip-verify run', () => {
        then(
          'the write authenticates as the org profile, NOT the ambient sentinel',
          () => {
            // THE CLAMP: before the fix the write ran under process.env.AWS_PROFILE (the sentinel);
            // after the fix it runs under the org's declared profile the adapter handed in
            expect(scene.writeProfile).toEqual(ORG_PROFILE);
            expect(scene.writeProfile).not.toEqual(SENTINEL);
          },
        );

        then('the roundtrip read-back runs under the SAME org profile', () => {
          expect(scene.readbackProfile).toEqual(ORG_PROFILE);
        });

        then('write identity and verify identity are identical', () => {
          expect(scene.readbackProfile).toEqual(scene.writeProfile);
        });
      });
    },
  );

  given('[case2] an @all identity + an ambient AWS_PROFILE exported', () => {
    const scene = useBeforeAll(async () =>
      runWithIdentity({ identity: { source: 'imds' } }),
    );

    when('[t0] the write + roundtrip-verify run', () => {
      then(
        'the write CLEARS AWS_PROFILE (the grove IMDS role), NOT the sentinel',
        () => {
          // @all → the default chain derives the grove's instance role; a stray ambient profile is
          // refused so it can never hijack the grove identity
          expect(scene.writeProfile).toBeUndefined();
          expect(scene.writeProfile).not.toEqual(SENTINEL);
        },
      );

      then('the roundtrip read-back also runs with AWS_PROFILE cleared', () => {
        expect(scene.readbackProfile).toBeUndefined();
      });
    });
  });
});
