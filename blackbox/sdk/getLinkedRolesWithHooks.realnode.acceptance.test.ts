import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { ConstraintError } from 'helpful-errors';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { spawnProbeBetween } from '../.test/infra/spawnProbeBetween';

/**
 * .what = real-node acceptance proof that an esm-only role package loads through the peer
 *         site getLinkedRolesWithHooks (ehmpathy/rhachet#429, acc#5)
 * .why  = getLinkedRolesWithHooks is the SECOND peer load-site (beside
 *         getBrainHooksAdapterByConfigImplicit). it loads a linked role package via node's
 *         require lookup -> importEsmSafe. this mirrors the brain-adapter peer file against
 *         an ESM-ONLY role fixture (type:module, `exports` default condition, no main), so
 *         acc#5's per-site promise ("apply the same indirection wherever a brain/plugin
 *         loads that way") holds for BOTH peers, not just one.
 * .scope = this realnode proof is deliberately narrow: it witnesses ONLY the esm-LOAD half
 *         (RED: a require() shim throws; GREEN: the site loads the esm role entry through
 *         importEsmSafe and keeps its hooks.onBrain role). the negative / fault-isolation half
 *         (a repo package that fails to load records a load-phase error, the loop continues, a
 *         healthy repo beside it still loads — acc#3) is plain union-branch logic that jest CAN
 *         witness with a faked importPackageExports, so it lives at the unit tier and is covered
 *         exhaustively there (getLinkedRolesWithHooks.test.ts case3 load-fail, case4 bad-beside-
 *         healthy isolation, case5 use-phase malformed-registry). a realnode negative snapshot
 *         would re-prove that union logic against NO esm load at all (a load failure loads no
 *         esm), so it is intentionally not duplicated here — this site is not a user-faced
 *         contract, it is the per-site esm-load mechanism proof.
 */
describe('getLinkedRolesWithHooks.realnode.acceptance', () => {
  given(
    '[case1] an esm-only role package, loaded through getLinkedRolesWithHooks',
    () => {
      const linkedRolesDistPath = join(
        __dirname,
        '..',
        '..',
        'dist',
        'domain.operations',
        'brains',
        'getLinkedRolesWithHooks.js',
      );
      const esmProbePath = join(
        __dirname,
        '..',
        '.test',
        'infra',
        'probe.getLinkedRolesWithHooks.esmFixture.cjs',
      );

      const report = useBeforeAll(async () => {
        if (!existsSync(linkedRolesDistPath))
          throw new ConstraintError(
            'built dist getLinkedRolesWithHooks.js absent — run `npm run build` first',
            { linkedRolesDistPath },
          );

        const workDir = genTempDir({ slug: 'linkedRoles-esm-fixture' });
        return spawnProbeBetween<{
          requireShimThrew: boolean;
          roleLoaded: boolean;
          errorCount: number;
        }>({
          args: [esmProbePath, linkedRolesDistPath, workDir],
          label: 'esm-fixture',
        });
      });

      when('[t0] the fixture is esm-only (a require shim cannot load it)', () => {
        then('a require() of the fixture throws (the RED)', () => {
          expect(report.requireShimThrew).toBe(true);
        });

        then(
          'the peer site loads it and keeps the hooks.onBrain role (the GREEN)',
          () => {
            expect(report.roleLoaded).toBe(true);
            expect(report.errorCount).toBe(0);
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
