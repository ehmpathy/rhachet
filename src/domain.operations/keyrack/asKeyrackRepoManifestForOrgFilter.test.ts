import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { KeyrackRepoManifest } from '@src/domain.objects/keyrack/KeyrackRepoManifest';

import { asKeyrackRepoManifestForOrgFilter } from './asKeyrackRepoManifestForOrgFilter';

const repoManifest = new KeyrackRepoManifest({
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
  },
});

describe('asKeyrackRepoManifestForOrgFilter', () => {
  given('[case1] a manifest whose org: is [ahbode, bhanya]', () => {
    const TEST_CASES_AS_DECLARED = [
      { description: 'no filter', orgFilter: null },
      { description: 'the machine-wide @all filter', orgFilter: '@all' },
      { description: 'the default member', orgFilter: 'ahbode' },
    ];
    TEST_CASES_AS_DECLARED.map((thisCase, index) =>
      when(`[t${index}] ${thisCase.description}`, () => {
        then('the declared keys stay under the default org', () => {
          const result = asKeyrackRepoManifestForOrgFilter({
            repoManifest,
            orgFilter: thisCase.orgFilter,
            key: null,
          });
          expect(Object.keys(result!.keys)).toEqual([
            'ahbode.camp.AWS_PROFILE',
          ]);
        });
      }),
    );

    when('[t3] a non-default member', () => {
      then('the declared keys re-slug under that member', () => {
        const result = asKeyrackRepoManifestForOrgFilter({
          repoManifest,
          orgFilter: 'bhanya',
          key: null,
        });
        expect(Object.keys(result!.keys)).toEqual(['bhanya.camp.AWS_PROFILE']);
        expect(result!.org).toEqual('bhanya');
      });
    });

    when('[t4] a typo off the allowlist', () => {
      const error = getError(() =>
        asKeyrackRepoManifestForOrgFilter({
          repoManifest,
          orgFilter: 'bhnya',
          key: null,
        }),
      );

      then('it refuses as caller-fixable, never an empty rack', () => {
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain(
          "--org 'bhnya' is not on this manifest's org allowlist",
        );
      });
    });
  });

  given('[case2] no manifest', () => {
    when('[t0] a real org filter', () => {
      then('there is no manifest to re-slug, so it yields null', () => {
        expect(
          asKeyrackRepoManifestForOrgFilter({
            repoManifest: null,
            orgFilter: 'anyorg',
            key: null,
          }),
        ).toBeNull();
      });
    });
  });
});
