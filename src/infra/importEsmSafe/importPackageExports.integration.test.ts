import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { importPackageExports } from './importPackageExports';

/**
 * .what = integration coverage for the importPackageExports resilient-load leaf (#429)
 * .why  = importPackageExports resolves + loads a package and returns a { ok } union instead
 *         of a throw, so a caller loop can continue past a bad package (acc#3). its { ok:false }
 *         path on an ABSENT package is witnessable under jest (require.resolve throws
 *         synchronously, before any native import()), so this pins that the wrapper turns the
 *         throw into data rather than a re-thrown error.
 * .note = the { ok:true } success path loads a real module via importEsmSafe, which jest
 *         cannot run (native import() needs --experimental-vm-modules, which breaks the
 *         harness — see importEsmSafe). that path is proven by the real-node acceptance suites
 *         that call getAvailableBrains / the two peer sites, all of which now route through
 *         this leaf. so this file covers the fault path; the acceptance suites cover success.
 */
describe('importPackageExports', () => {
  given('[case1] an absent package looked up from a real repo', () => {
    const scene = useBeforeAll(async () => {
      const workDir = genTempDir({ slug: 'importPackageExports-absent' });
      writeFileSync(
        join(workDir, 'package.json'),
        JSON.stringify({ dependencies: {} }),
      );
      return { workDir };
    });

    when('[t0] loaded', () => {
      then('it returns a { ok: false } union, never throws', async () => {
        const loaded = await importPackageExports({
          packageName: 'rhachet-fixture-does-not-exist',
          fromPackageJson: join(scene.workDir, 'package.json'),
        });
        expect(loaded.ok).toBe(false);
      });

      then('the union carries the load error', async () => {
        const loaded = await importPackageExports({
          packageName: 'rhachet-fixture-does-not-exist',
          fromPackageJson: join(scene.workDir, 'package.json'),
        });
        // narrow the union: on failure it carries an Error
        if (loaded.ok)
          throw new Error(
            'expected a { ok: false } union for an absent package',
          );
        expect(loaded.error).toBeInstanceOf(Error);
        expect(loaded.error.message).toContain(
          'rhachet-fixture-does-not-exist',
        );
      });
    });
  });
});
