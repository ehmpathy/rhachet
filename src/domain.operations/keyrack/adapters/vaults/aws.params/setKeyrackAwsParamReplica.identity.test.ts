import { given, then, useBeforeAll, when } from 'test-fns';

import type { DeclastructAws } from './getOneDeclastructAws';
import { setKeyrackAwsParamReplica } from './setKeyrackAwsParamReplica';

/**
 * .what = clamp: the replica persist authenticates the write + its roundtrip-verify as the RESOLVED
 *   --org identity it is handed — a specific org's declared AWS_PROFILE, or @all's cleared (IMDS)
 *   identity — NEVER the machine's ambient AWS_PROFILE.
 *
 * .why = the exact defect the human hit on a `PERMANENT_VIA_REPLICA` set: the write captured
 *   `process.env.AWS_PROFILE` (ambient), so a scoped-org set with no exported profile got "found no
 *   AWS identity" even after the org keyrack was unlocked. this clamps the fix at the replica leaf
 *   (the github-app twin is clamped in setKeyrackAwsParamGithubApp.identity.test.ts).
 *
 * .how = every i/o boundary is a LIGHTWEIGHT FAKE injected via context.deps (dependency injection,
 *   per rule.forbid.unit.remote-boundaries). the fakes record the AWS_PROFILE in force at the write
 *   + the credsEnv the roundtrip read-back receives; the REAL env overlay runs, so the observed
 *   AWS_PROFILE is genuinely what the write authenticated as.
 */

// the secret the acquire step yields; the readback returns the SAME value so the roundtrip passes
const SECRET = 'my-static-secret-value';

// a WRONG ambient profile exported at set time — the write must ignore it in both cases
const SENTINEL = 'sentinel-provisioner-profile';

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
  // exercised. the full DeclastructAws type is the external declastruct-aws SDK surface — an
  // external-org boundary — so ONE documented cast of the minimal fake is the sanctioned exception
  // (rule.forbid.as-cast).
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
    await setKeyrackAwsParamReplica(
      {
        slug: 'ehmpathy.test.REPLICA',
        exid: '/keyrack/journey/REPLICA',
        region: 'us-east-1',
        identity: input.identity,
      },
      {
        deps: {
          // acquireForSet yields the secret headlessly — no terminal prompt
          acquireForSet: async () => ({ source: SECRET }),
          getOneKeyrackAwsParamEndpoint: () => null,
          getOneDeclastructAws: async () => fakeDeclastruct,
          // the read-back records the AWS_PROFILE it receives and returns the same secret so the
          // roundtrip verify passes
          getOneKeyrackAwsParam: async (getInput) => {
            observed.readbackProfile = getInput.credsEnv.AWS_PROFILE;
            return { value: SECRET, type: 'SecureString' };
          },
        },
      },
    );
  } finally {
    if (priorProfile === undefined) delete process.env.AWS_PROFILE;
    else process.env.AWS_PROFILE = priorProfile;
  }

  return observed;
};

describe('setKeyrackAwsParamReplica identity (unit)', () => {
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
