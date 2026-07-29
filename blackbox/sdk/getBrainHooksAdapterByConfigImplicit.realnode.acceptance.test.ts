import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { ConstraintError } from 'helpful-errors';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { spawnProbeBetween } from '../.test/infra/spawnProbeBetween';

/**
 * .what = real-node acceptance proof that an esm-only brain package loads through the peer
 *         site getBrainHooksAdapterByConfigImplicit (ehmpathy/rhachet#429, acc#5)
 * .why  = getBrainHooksAdapterByConfigImplicit is one of the two peer load-sites that load a
 *         third-party package via node's require lookup -> importEsmSafe. this drives that
 *         exact mechanism against an ESM-ONLY fixture (type:module, reached via an `exports`
 *         default condition, no main) to prove the fix loads an esm entry through THIS site,
 *         not only getAvailableBrains. the second peer site (getLinkedRolesWithHooks) is
 *         proven the same way by its own peer file, so both peers carry a per-site esm proof.
 * .scope = this realnode proof is deliberately narrow: it witnesses ONLY the esm-LOAD half
 *         (RED: a require() shim throws; GREEN: the site loads the esm entry through
 *         importEsmSafe). the negative / fault-isolation half (a package that fails to load
 *         is isolated to stderr, the site returns null, a healthy package beside it still
 *         loads — acc#3) is plain union-branch logic that jest CAN witness with a faked
 *         importPackageExports, so it lives at the unit tier and is covered exhaustively there
 *         (getBrainHooksAdapterByConfigImplicit.test.ts case2 load-fail, case3 bad-beside-
 *         healthy isolation, case4 use-phase throw). a realnode negative snapshot would
 *         re-prove that union logic against NO esm load at all (a load failure loads no esm),
 *         so it is intentionally not duplicated here — this site is not a user-faced contract,
 *         it is the per-site esm-load mechanism proof.
 */
describe('getBrainHooksAdapterByConfigImplicit.realnode.acceptance', () => {
  given(
    '[case1] an esm-only brain package, loaded through getBrainHooksAdapterByConfigImplicit',
    () => {
      const adapterDistPath = join(
        __dirname,
        '..',
        '..',
        'dist',
        'domain.operations',
        'config',
        'getBrainHooksAdapterByConfigImplicit.js',
      );
      const esmProbePath = join(
        __dirname,
        '..',
        '.test',
        'infra',
        'probe.getBrainHooksAdapter.esmFixture.cjs',
      );

      const report = useBeforeAll(async () => {
        if (!existsSync(adapterDistPath))
          throw new ConstraintError(
            'built dist getBrainHooksAdapterByConfigImplicit.js absent — run `npm run build` first',
            { adapterDistPath },
          );

        const workDir = genTempDir({ slug: 'brainHooksAdapter-esm-fixture' });
        return spawnProbeBetween<{
          requireShimThrew: boolean;
          adapterLoaded: boolean;
        }>({
          args: [esmProbePath, adapterDistPath, workDir],
          label: 'esm-fixture',
        });
      });

      when('[t0] the fixture is esm-only (a require shim cannot load it)', () => {
        then('a require() of the fixture throws (the RED)', () => {
          expect(report.requireShimThrew).toBe(true);
        });

        then(
          'the peer site loads it and returns the adapter (the GREEN)',
          () => {
            expect(report.adapterLoaded).toBe(true);
          },
        );

        // the fixture report is fully deterministic (a scaffolded esm fixture, not the
        // real installed registry), so lock its shape with a snapshot too — matches the
        // standard set by importEsmSafe's case1/t5.
        then('the report matches the locked snapshot', () => {
          expect(report).toMatchSnapshot();
        });
      });
    },
  );
});
