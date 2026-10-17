import { getError, given, then, when } from 'test-fns';

import { genMockKeyrackRepoManifest } from '@src/.test/assets/genMockKeyrackRepoManifest';

import { assertKeyrackOrgMatchesManifest } from './assertKeyrackOrgMatchesManifest';

describe('assertKeyrackOrgMatchesManifest', () => {
  given('[case1] a manifest whose org: is the scalar ehmpathy', () => {
    const manifest = genMockKeyrackRepoManifest({ org: 'ehmpathy' });

    when('[t0] @this is asked', () => {
      then('it resolves to the manifest org', () => {
        const result = assertKeyrackOrgMatchesManifest({
          manifest,
          org: '@this',
        });
        expect(result).toEqual('ehmpathy');
      });
    });

    when('[t1] the manifest org is asked by name', () => {
      then('it passes as itself', () => {
        const result = assertKeyrackOrgMatchesManifest({
          manifest,
          org: 'ehmpathy',
        });
        expect(result).toEqual('ehmpathy');
      });
    });

    when('[t2] a foreign org is asked', () => {
      then('it is refused, and the refusal names both orgs', async () => {
        const error = await getError(() =>
          assertKeyrackOrgMatchesManifest({ manifest, org: 'foreign-org' }),
        );
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain('foreign-org');
        expect(error.message).toContain('ehmpathy');
      });
    });
  });

  given(
    '[case2] a manifest whose org: is an allowlist [ahbode, bhanya] (case=3)',
    () => {
      const manifest = genMockKeyrackRepoManifest({
        orgs: ['ahbode', 'bhanya'],
      });

      when('[t0] @this is asked', () => {
        then('it resolves to the first member, the default', () => {
          const result = assertKeyrackOrgMatchesManifest({
            manifest,
            org: '@this',
          });
          expect(result).toEqual('ahbode');
        });
      });

      when('[t1] a non-default member is asked', () => {
        then('it passes as itself', () => {
          const result = assertKeyrackOrgMatchesManifest({
            manifest,
            org: 'bhanya',
          });
          expect(result).toEqual('bhanya');
        });
      });

      when('[t2] an org off the allowlist is asked', () => {
        then('it is refused, and the refusal names every member', async () => {
          const error = await getError(() =>
            assertKeyrackOrgMatchesManifest({ manifest, org: 'bhnya' }),
          );
          expect(error).toBeInstanceOf(Error);
          expect(error.message).toContain(
            "--org 'bhnya' is not on this manifest's org allowlist",
          );
          expect(error.message).toContain('ahbode, bhanya');
        });
      });
    },
  );
});
