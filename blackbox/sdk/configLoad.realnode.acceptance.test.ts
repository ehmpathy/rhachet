import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { ConstraintError } from 'helpful-errors';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { spawnProbeBetween } from '../.test/infra/spawnProbeBetween';

/**
 * .what = real-node subprocess acceptance proof for the 3 config-explicit load sites, whose
 *         bare `await import()` was swapped to importEsmSafe at i018→i019 (ehmpathy/rhachet#429, q1)
 * .why  = a user-authored rhachet.use.ts can pull an esm-only dependency graph, so the config
 *         sites face the same #429 failure mode as the package-load sites. jest cannot witness a
 *         real import() (it refuses native import() without --experimental-vm-modules, which
 *         breaks the shared harness), so the honest proof spawns a real node child against the
 *         BUILT dist. this clamps the two invariants the .note on each site promises:
 *         (positive) an esm-only config loads and its getRoleRegistries / getInvokeHooks /
 *         getBrainRepls export is called; (fail-loud) a broken config THROWS out of each site,
 *         it never warn+skips (rule.forbid.failhide).
 */
describe('configLoad.realnode.acceptance', () => {
  const configDistDir = join(
    __dirname,
    '..',
    '..',
    'dist',
    'domain.operations',
    'config',
  );
  const brainsDistPath = join(configDistDir, 'getBrainsByConfigExplicit.js');
  const hooksDistPath = join(
    configDistDir,
    'getRoleHooksOnDispatchByConfigExplicit.js',
  );
  const registriesDistPath = join(
    configDistDir,
    'getRoleRegistriesByConfigExplicit.js',
  );
  const probePath = join(
    __dirname,
    '..',
    '.test',
    'infra',
    'probe.configLoad.cjs',
  );

  given(
    '[case1] the built config-explicit load sites, run in a real node child',
    () => {
      const report = useBeforeAll(async () => {
        // the built artifacts must exist; acceptance runs after `npm run build`
        for (const distPath of [
          brainsDistPath,
          hooksDistPath,
          registriesDistPath,
        ])
          if (!existsSync(distPath))
            throw new ConstraintError(
              'built config-explicit dist absent — run `npm run build` first',
              { distPath },
            );

        const workDir = genTempDir({ slug: 'configLoad-realnode' });
        return spawnProbeBetween<{
          requireEsmConfigThrew: boolean;
          registrySlugs: string[];
          hookAskSlugs: string[] | null;
          brainSlugs: string[];
          registriesThrewOnBroken: boolean;
          hooksThrewOnBroken: boolean;
          brainsThrewOnBroken: boolean;
        }>({
          args: [
            probePath,
            workDir,
            brainsDistPath,
            hooksDistPath,
            registriesDistPath,
          ],
          label: 'real-node',
        });
      });

      when('[t0] the config fixture is genuinely esm-only', () => {
        then('a require() shim cannot load it (proves the esm risk is real)', () => {
          expect(report.requireEsmConfigThrew).toBe(true);
        });
      });

      when('[t1] an esm-only rhachet.use.ts is loaded through each site', () => {
        then('getRoleRegistriesByConfigExplicit returns the config registries', () => {
          expect(report.registrySlugs).toEqual(['test/registry']);
        });

        then('getRoleHooksOnDispatchByConfigExplicit returns the config hooks', () => {
          expect(report.hookAskSlugs).toEqual(['ask/one']);
        });

        then('getBrainsByConfigExplicit returns the config brains', () => {
          expect(report.brainSlugs).toEqual(['test/brain']);
        });
      });

      when('[t2] a broken config is loaded through each site', () => {
        // the .note on all three sites promises fail-loud: a broken config throws, it never
        // warn+skips — proven here as a real import()-time throw that leaves each site uncaught
        then('getRoleRegistriesByConfigExplicit throws (fail-loud, no warn+skip)', () => {
          expect(report.registriesThrewOnBroken).toBe(true);
        });

        then('getRoleHooksOnDispatchByConfigExplicit throws (fail-loud, no warn+skip)', () => {
          expect(report.hooksThrewOnBroken).toBe(true);
        });

        then('getBrainsByConfigExplicit throws (fail-loud, no warn+skip)', () => {
          expect(report.brainsThrewOnBroken).toBe(true);
        });
      });

      when('[t3] the full report is captured', () => {
        // snapshot the deterministic report to lock the output contract shape
        then('the report matches the locked snapshot', () => {
          expect(report).toMatchSnapshot();
        });
      });
    },
  );
});
