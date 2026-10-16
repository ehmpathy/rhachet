import { given, then, when } from 'test-fns';

import { KeyrackRepoManifest } from '@src/domain.objects/keyrack/KeyrackRepoManifest';

import { asKeyrackRepoManifestUnderOrg } from './asKeyrackRepoManifestUnderOrg';

const manifest = new KeyrackRepoManifest({
  org: 'ahbode',
  orgs: ['ahbode', 'bhanya'],
  envs: ['camp'],
  keys: {
    'ahbode.camp.AWS_PROFILE': {
      slug: 'ahbode.camp.AWS_PROFILE',
      name: 'AWS_PROFILE',
      env: 'camp',
      mech: 'EPHEMERAL_VIA_AWS_SSO',
      grade: null,
      reaches: [],
      flags: { isOptionalIfHas: null },
    },
    'ahbode.camp.GH_TOKEN': {
      slug: 'ahbode.camp.GH_TOKEN',
      name: 'GH_TOKEN',
      env: 'camp',
      mech: 'PERMANENT_VIA_REPLICA',
      grade: null,
      reaches: [],
      flags: { isOptionalIfHas: 'GITHUB_TOKEN' },
    },
  },
});

describe('asKeyrackRepoManifestUnderOrg', () => {
  given('[case1] a manifest whose org: is [ahbode, bhanya]', () => {
    when('[t0] re-slugged under the non-default member bhanya', () => {
      const result = asKeyrackRepoManifestUnderOrg({ manifest, org: 'bhanya' });

      then('every declared key is slugged under bhanya', () => {
        expect(Object.keys(result.keys).sort()).toEqual([
          'bhanya.camp.AWS_PROFILE',
          'bhanya.camp.GH_TOKEN',
        ]);
      });

      then('no ahbode slug remains', () => {
        expect(
          Object.keys(result.keys).filter((slug) => slug.startsWith('ahbode.')),
        ).toEqual([]);
      });

      then('each spec carries across, its own slug updated', () => {
        expect(result.keys['bhanya.camp.GH_TOKEN']).toEqual({
          ...manifest.keys['ahbode.camp.GH_TOKEN'],
          slug: 'bhanya.camp.GH_TOKEN',
        });
      });

      then('the allowlist is unchanged', () => {
        expect(result.orgs).toEqual(['ahbode', 'bhanya']);
      });

      then(
        'the view names the member as its active org, apart from orgs[0]',
        () => {
          expect(result.org).toEqual('bhanya');
          expect(result.orgs[0]).toEqual('ahbode');
        },
      );
    });

    when('[t1] re-slugged under the default org', () => {
      then('the manifest is returned untouched', () => {
        expect(asKeyrackRepoManifestUnderOrg({ manifest, org: 'ahbode' })).toBe(
          manifest,
        );
      });
    });
  });
});
