import { ConstraintError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { KeyrackRepoManifest } from '@src/domain.objects/keyrack';

import type { ContextKeyrackGrantGet } from './genContextKeyrackGrantGet';
import { getOneKeyrackGrantByKey } from './getOneKeyrackGrantByKey';

/**
 * ⚠️ .status = a KNOWN VIOLATION of `rule.forbid.unit.remote-boundaries`, recorded with its
 *        remedy — never an exception. that rule grants none: its integration and acceptance
 *        twins each carry a documented-unavoidable escape clause, and this one deliberately
 *        does not. an earlier draft of this comment asserted an exemption the rule does not
 *        offer; that claim was false and is withdrawn. what follows is why a deletion of the
 *        mock does not cure the violation, and what would.
 *
 * .why.mock = the mock is LOAD-BEARING rather than decorative. `getOneKeyrackGrantByKey` reaches
 *        `getKeyrackKeyGrant`, which imports `daemonAccessGet` directly; that operation derives
 *        a socket path from the ambient `HOME` and probes it (`isDaemonReachable`). so with the
 *        mock removed this unit test performs a real socket probe — and on a box where a keyrack
 *        daemon IS live (every acceptance run spawns one) it would talk to it. that is the exact
 *        remote boundary the rule forbids, so to delete the mock would introduce the defect
 *        rather than repair it. verified, not assumed: removed here, the suite still passed —
 *        which is precisely why a real probe would go unnoticed
 * .note = the rule's preferred remedy is injection, and that needs a PROD seam this codebase
 *         lacks: `daemonAccessGet` would have to arrive on `ContextKeyrackGrantGet` rather than
 *         be imported. that is a real refactor of the grant context and its call sites, not a
 *         test-file edit — recorded as a follow-on in `5.3.verification.yield.md`
 */
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
            expect(error).toBeInstanceOf(ConstraintError);
            expect((error as ConstraintError).message).toContain(
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
            reaches: [],
            flags: { isOptionalIfHas: null },
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

  /**
   * .what = the clamp for `ONE decoder answers "is this a full slug?" at this call site`
   * .why = this operation asked that question inline, TWICE, with its own hand-rolled
   *        `parts.length >= 3 && isValidKeyrackEnv(parts[1])`. a second copy of a parser is
   *        precisely how `isKeyrackSlugMachineWide` and `isKeyrackSlugRepoBound` came to
   *        answer differently for one string. the rows below pin the shared decoder's answer
   *        on BOTH branches that consult it, so a re-inline with a looser test goes red here
   */
  given('[case8] a dotted key whose env segment is NOT a valid env', () => {
    when('[t0] the --org @all branch decodes it', () => {
      // .why = `@all.badenv.FOO` LOOKS like a full slug and is not one. a looser test would
      //        pass it through verbatim; the shared decoder composes it as a bare key NAME
      //        that merely holds dots
      then('it is composed as a bare name, never passed through', async () => {
        const result = await getOneKeyrackGrantByKey(
          { key: '@all.badenv.FOO', env: 'camp', org: '@all' },
          genMockContext(null),
        );

        expect((result as { slug: string }).slug).toBe(
          '@all.camp.@all.badenv.FOO',
        );
      });
    });

    when('[t1] the no-manifest branch decodes it', () => {
      // .why = the SECOND site the check was spelled at. both branches must read one string
      //        one way, which is only guaranteed while one decoder serves both
      then('it is composed from --org, never passed through', async () => {
        const result = await getOneKeyrackGrantByKey(
          { key: 'my.api.KEY', env: 'test', org: 'myorg' },
          genMockContext(null),
        );

        expect((result as { slug: string }).slug).toBe('myorg.test.my.api.KEY');
      });
    });

    when('[t2] a VALID env rides the same shape', () => {
      // .why = the paired row. without it, a decoder that called EVERY dotted key bare would
      //        satisfy [t0] and [t1] and still be wrong
      then('it IS a full slug, so it passes through verbatim', async () => {
        const result = await getOneKeyrackGrantByKey(
          { key: '@all.camp.FOO', env: null, org: '@all' },
          genMockContext(null),
        );

        expect((result as { slug: string }).slug).toBe('@all.camp.FOO');
      });
    });
  });
});
