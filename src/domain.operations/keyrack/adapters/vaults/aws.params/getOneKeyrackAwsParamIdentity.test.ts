import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { genMockKeyrackHostManifest } from '@src/.test/assets/genMockKeyrackHostManifest';

import { getOneKeyrackAwsParamIdentity } from './getOneKeyrackAwsParamIdentity';

/**
 * .what = boundary coverage for the ONE place the --org identity hardcut is decided
 * .why = every aws.params op (get/set/del) funnels its identity through this resolver, so its
 *   boundaries are the boundaries of the whole hardcut: @all → the grove IMDS role; a specific org
 *   with a declared profile → that profile; a specific org with NO declared profile → fail loud
 *   (never a silent IMDS fallback); a null manifest preserves each of those verdicts
 */
describe('getOneKeyrackAwsParamIdentity', () => {
  // a manifest that declares ehmpathy's prod AWS_PROFILE peer key (exid = the profile name)
  const manifestWithProfile = genMockKeyrackHostManifest({
    hosts: {
      'ehmpathy.prod.AWS_PROFILE': {
        mech: 'PERMANENT_VIA_REPLICA',
        vault: 'aws.config',
        env: 'prod',
        org: 'ehmpathy',
        exid: 'ehmpathy-prod',
      },
    },
  });

  // a manifest that declares NO AWS_PROFILE for ehmpathy
  const manifestWithoutProfile = genMockKeyrackHostManifest({ hosts: {} });

  given('[b1] an @all (grove-wide) key', () => {
    when('[t0] the identity is decided', () => {
      then('it is the grove IMDS role, regardless of the manifest', () => {
        const identity = getOneKeyrackAwsParamIdentity({
          slug: '@all.prod.ANTHROPIC_API_KEY',
          hostManifest: manifestWithoutProfile,
        });
        expect(identity).toEqual({ source: 'imds' });
      });
    });
  });

  given('[b2] a specific-org key whose org declares an AWS_PROFILE', () => {
    when('[t0] the identity is decided', () => {
      then("it is that org's declared profile", () => {
        const identity = getOneKeyrackAwsParamIdentity({
          slug: 'ehmpathy.prod.ANTHROPIC_API_KEY',
          hostManifest: manifestWithProfile,
        });
        expect(identity).toEqual({
          source: 'profile',
          profile: 'ehmpathy-prod',
        });
      });
    });
  });

  given('[b3] a specific-org key whose org declares NO AWS_PROFILE', () => {
    when('[t0] the identity is decided', () => {
      then('it fails loud (never a silent IMDS fallback)', async () => {
        const error = await getError(
          Promise.resolve().then(() =>
            getOneKeyrackAwsParamIdentity({
              slug: 'ehmpathy.prod.ANTHROPIC_API_KEY',
              hostManifest: manifestWithoutProfile,
            }),
          ),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('no AWS_PROFILE declared for org');
        expect(error.message).toContain('ehmpathy');
      });
    });
  });

  given('[b4] a null manifest (a fallback path / test)', () => {
    when('[t0] the key is @all', () => {
      then('it is still the grove IMDS role', () => {
        const identity = getOneKeyrackAwsParamIdentity({
          slug: '@all.prod.ANTHROPIC_API_KEY',
          hostManifest: null,
        });
        expect(identity).toEqual({ source: 'imds' });
      });
    });

    when('[t1] the key is a specific org', () => {
      then('it still fails loud (no declared profile)', async () => {
        const error = await getError(
          Promise.resolve().then(() =>
            getOneKeyrackAwsParamIdentity({
              slug: 'ehmpathy.prod.ANTHROPIC_API_KEY',
              hostManifest: null,
            }),
          ),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('no AWS_PROFILE declared for org');
      });
    });
  });
});
