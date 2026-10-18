import { getError, given, then, when } from 'test-fns';

import { KeyrackRepoManifest } from '@src/domain.objects/keyrack';

import { asKeyrackKeyName } from './asKeyrackKeyName';
import { inferKeyrackEnvForSet } from './inferKeyrackEnvForSet';

/**
 * .what = a testorg manifest that declares one key per given slug
 * .why = the inference reads `manifest.keys`, keyed by slug, each with its env
 */
const genManifest = (input: {
  keys: { slug: string; env: string }[];
}): KeyrackRepoManifest =>
  new KeyrackRepoManifest({
    org: 'testorg',
    orgs: ['testorg'],
    envs: [...new Set(input.keys.map((k) => k.env))],
    keys: Object.fromEntries(
      input.keys.map((k) => [
        k.slug,
        {
          slug: k.slug,
          mech: null,
          env: k.env,
          name: asKeyrackKeyName({ slug: k.slug }),
          grade: null,
          reaches: [],
          flags: { isOptionalIfHas: null },
        },
      ]),
    ),
  });

describe('inferKeyrackEnvForSet', () => {
  given('[case1] a full slug, absent from the manifest scan', () => {
    when('[t0] the key is testorg.prep.SHARED_API_KEY', () => {
      // .why = THE clamp. the scan compares bare key names, so a full slug never matched and
      //        `set --key org.env.KEY` with no --env was refused as "not found in manifest"
      then('the env is read from the slug itself', () => {
        expect(
          inferKeyrackEnvForSet({
            key: 'testorg.prep.SHARED_API_KEY',
            manifest: genManifest({
              keys: [{ slug: 'testorg.prep.SHARED_API_KEY', env: 'prep' }],
            }),
          }),
        ).toEqual('prep');
      });
    });

    when('[t1] there is no manifest at all', () => {
      then('the env is still read from the slug', () => {
        expect(
          inferKeyrackEnvForSet({ key: '@all.camp.FOO', manifest: null }),
        ).toEqual('camp');
      });
    });
  });

  given('[case2] a bare key name declared in one env', () => {
    when('[t0] the key is SHARED_API_KEY', () => {
      then('the env is inferred from the manifest', () => {
        expect(
          inferKeyrackEnvForSet({
            key: 'SHARED_API_KEY',
            manifest: genManifest({
              keys: [{ slug: 'testorg.prep.SHARED_API_KEY', env: 'prep' }],
            }),
          }),
        ).toEqual('prep');
      });
    });
  });

  given('[case3] a bare key name declared in two envs', () => {
    when('[t0] the key is AWS_PROFILE', () => {
      then('it refuses, and names both envs', () => {
        const error = getError(() =>
          inferKeyrackEnvForSet({
            key: 'AWS_PROFILE',
            manifest: genManifest({
              keys: [
                { slug: 'testorg.prod.AWS_PROFILE', env: 'prod' },
                { slug: 'testorg.prep.AWS_PROFILE', env: 'prep' },
              ],
            }),
          }),
        );
        expect(error.message).toContain(
          '--env required: AWS_PROFILE found in multiple envs: prod, prep',
        );
      });
    });
  });

  given('[case4] a bare key name absent from the manifest', () => {
    when('[t0] the key is UNKNOWN_KEY', () => {
      then('it refuses, and asks for --env', () => {
        const error = getError(() =>
          inferKeyrackEnvForSet({
            key: 'UNKNOWN_KEY',
            manifest: genManifest({ keys: [] }),
          }),
        );
        expect(error.message).toContain(
          '--env required: UNKNOWN_KEY not found in manifest',
        );
      });
    });
  });
});
