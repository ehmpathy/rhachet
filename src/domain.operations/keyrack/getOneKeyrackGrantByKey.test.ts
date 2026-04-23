import { BadRequestError, ConstraintError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { KeyrackRepoManifest } from '@src/domain.objects/keyrack';

import type { ContextKeyrackGrantGet } from './genContextKeyrackGrantGet';
import { getOneKeyrackGrantByKey } from './getOneKeyrackGrantByKey';

// mock daemon SDK to avoid real socket calls in unit tests
jest.mock('./daemon/sdk', () => ({
  daemonAccessGet: jest.fn().mockResolvedValue(null),
}));

/**
 * .what = unit tests for getOneKeyrackGrantByKey
 * .why = verify slug construction and security constraints
 *
 * SECURITY: cross-org access is forbidden except via @all
 * - manifest org must match key org to prevent credential leakage
 * - only @all explicitly bypasses this check (for sudo/admin use)
 */
describe('getOneKeyrackGrantByKey', () => {
  // minimal mock context for slug construction tests
  // uses type assertion since we only test slug construction, not actual grant
  const genMockContext = (
    manifest: KeyrackRepoManifest | null,
  ): ContextKeyrackGrantGet =>
    ({
      repoManifest: manifest,
      owner: null,
      envvarAdapter: { get: async () => null },
      mechAdapters: {},
    }) as unknown as ContextKeyrackGrantGet;

  given('[security] cross-org access prevention', () => {
    /**
     * SECURITY CONVENTION (guidance, not enforcement):
     *
     * cross-org credential access is FORBIDDEN by design.
     *
     * - credentials are scoped to orgs for isolation
     * - org-A keys accessed from org-B repo = credential leakage vulnerability
     * - manifest.org acts as the trust boundary
     * - only @all can bypass (explicit admin override for sudo use)
     *
     * NOTE: this convention protects well-intentioned actors from
     * accidental cross-org access. it cannot stop malicious actors
     * who can simply modify the source code. the goal is to make
     * the safe path obvious and the unsafe path require explicit intent.
     */
    when('[t0] full slug org does not match manifest org', () => {
      const manifest = new KeyrackRepoManifest({
        org: 'orgA',
        envs: [],
        keys: {},
      });

      then(
        'fails fast with ORG_MISMATCH to prevent cross-org leakage',
        async () => {
          const context = genMockContext(manifest);

          try {
            await getOneKeyrackGrantByKey(
              { key: 'orgB.test.SECRET_KEY', env: null },
              context,
            );
            throw new Error('expected to throw');
          } catch (error) {
            expect(error).toBeInstanceOf(BadRequestError);
            expect((error as BadRequestError).message).toContain(
              'does not match manifest org',
            );
          }
        },
      );
    });

    when('[t1] @all org is specified', () => {
      const manifest = new KeyrackRepoManifest({
        org: 'orgA',
        envs: [],
        keys: {},
      });

      then(
        'bypasses manifest validation (explicit admin override)',
        async () => {
          const context = genMockContext(manifest);

          // should not throw - @all bypasses validation
          // will return locked/absent since key doesn't exist, but slug construction succeeds
          const result = await getOneKeyrackGrantByKey(
            { key: 'ANY_KEY', env: 'sudo', org: '@all' },
            context,
          );

          // slug should use @all org
          expect((result as { slug: string }).slug).toBe('@all.sudo.ANY_KEY');
        },
      );
    });

    when('[t2] no org override and manifest exists', () => {
      const manifest = new KeyrackRepoManifest({
        org: 'myorg',
        envs: ['test'],
        keys: {
          'myorg.test.API_KEY': {
            slug: 'myorg.test.API_KEY',
            name: 'API_KEY',
            env: 'test',
            mech: 'PERMANENT_VIA_REPLICA',
            grade: null,
          },
        },
      });

      then('uses manifest org for slug construction', async () => {
        const context = genMockContext(manifest);

        const result = await getOneKeyrackGrantByKey(
          { key: 'API_KEY', env: 'test' },
          context,
        );

        expect((result as { slug: string }).slug).toBe('myorg.test.API_KEY');
      });
    });

    when('[t3] no manifest and raw key (not full slug)', () => {
      then('fails fast with helpful error', async () => {
        const context = genMockContext(null);

        try {
          await getOneKeyrackGrantByKey(
            { key: 'API_KEY', env: 'test' },
            context,
          );
          throw new Error('expected to throw');
        } catch (error) {
          expect(error).toBeInstanceOf(ConstraintError);
          expect((error as ConstraintError).message).toContain(
            'without keyrack.yml',
          );
          expect((error as ConstraintError).message).toContain(
            'full slug format',
          );
        }
      });
    });

    when('[t4] no manifest with env=sudo', () => {
      then('fails fast with sudo-specific hint', async () => {
        const context = genMockContext(null);

        try {
          await getOneKeyrackGrantByKey(
            { key: 'SUDO_TOKEN', env: 'sudo' },
            context,
          );
          throw new Error('expected to throw');
        } catch (error) {
          expect(error).toBeInstanceOf(ConstraintError);
          expect((error as ConstraintError).message).toContain('--org @all');
        }
      });
    });

    when('[t5] no manifest but full slug provided', () => {
      then('extracts slug from full format (no manifest needed)', async () => {
        const context = genMockContext(null);

        const result = await getOneKeyrackGrantByKey(
          { key: 'someorg.test.API_KEY', env: null },
          context,
        );

        expect((result as { slug: string }).slug).toBe('someorg.test.API_KEY');
      });
    });

    when('[t6] org param does not match manifest org', () => {
      const manifest = new KeyrackRepoManifest({
        org: 'orgA',
        envs: ['test'],
        keys: {},
      });

      then('fails fast with org mismatch error', async () => {
        const context = genMockContext(manifest);

        try {
          await getOneKeyrackGrantByKey(
            { key: 'API_KEY', env: 'test', org: 'orgB' },
            context,
          );
          throw new Error('expected to throw');
        } catch (error) {
          expect(error).toBeInstanceOf(ConstraintError);
          expect((error as ConstraintError).message).toContain(
            "org 'orgB' does not match manifest org 'orgA'",
          );
        }
      });
    });

    when('[t7] org param provided without manifest', () => {
      then('constructs slug from org param', async () => {
        const context = genMockContext(null);

        const result = await getOneKeyrackGrantByKey(
          { key: 'API_KEY', env: 'test', org: 'myorg' },
          context,
        );

        expect((result as { slug: string }).slug).toBe('myorg.test.API_KEY');
      });
    });
  });
});
