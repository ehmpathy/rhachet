import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { KeyrackRepoManifest } from '@src/domain.objects/keyrack/KeyrackRepoManifest';

import { assertKeyrackFilterOrgOnAllowlist } from './assertKeyrackFilterOrgOnAllowlist';

const repoManifest = new KeyrackRepoManifest({
  org: 'ahbode',
  orgs: ['ahbode', 'bhanya'],
  envs: ['camp'],
  keys: {},
});

describe('assertKeyrackFilterOrgOnAllowlist', () => {
  given('[case1] a manifest whose org: is [ahbode, bhanya]', () => {
    const TEST_CASES_PASS = [
      { description: 'no filter', orgFilter: null },
      { description: 'the machine-wide @all filter', orgFilter: '@all' },
      { description: 'the default member', orgFilter: 'ahbode' },
      { description: 'a non-default member', orgFilter: 'bhanya' },
    ];
    TEST_CASES_PASS.map((thisCase, index) =>
      when(`[t${index}] ${thisCase.description}`, () => {
        then('it passes', () => {
          expect(() =>
            assertKeyrackFilterOrgOnAllowlist({
              orgFilter: thisCase.orgFilter,
              repoManifest,
              key: null,
            }),
          ).not.toThrow();
        });
      }),
    );

    when('[t4] a typo off the allowlist', () => {
      const error = getError(() =>
        assertKeyrackFilterOrgOnAllowlist({
          orgFilter: 'bhnya',
          repoManifest,
          key: null,
        }),
      );

      then('it refuses as caller-fixable', () => {
        expect(error).toBeInstanceOf(ConstraintError);
      });

      then('the refusal names the typo and every member', () => {
        expect(error.message).toContain(
          "--org 'bhnya' is not on this manifest's org allowlist",
        );
        expect(error.message).toContain('ahbode, bhanya');
      });
    });
  });

  given('[case2] no manifest', () => {
    when('[t0] a real org filter', () => {
      then('there is no allowlist to check, so it passes', () => {
        expect(() =>
          assertKeyrackFilterOrgOnAllowlist({
            orgFilter: 'anyorg',
            repoManifest: null,
            key: null,
          }),
        ).not.toThrow();
      });
    });
  });
});
