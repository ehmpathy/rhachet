import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { ConstraintError } from 'helpful-errors';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { spawnProbeBetween } from '../.test/infra/spawnProbeBetween';

/**
 * .what = real-node subprocess acceptance proof for importEsmSafe itself (ehmpathy/rhachet#429)
 * .why  = jest refuses native import() without --experimental-vm-modules, and that flag
 *         breaks the whole harness (age-encryption in the shared integration setup). so
 *         the honest runtime proof spawns a real node child against the BUILT dist, where
 *         a genuine import() runs. this file proves importEsmSafe loads an esm-only module
 *         a require() shim cannot (plus cjs + a lexer-undetectable cjs module), and — via
 *         the extraction contract (t3) — the acc#4 RED/GREEN clamp. the peer load-sites get
 *         their own per-subject files: getAvailableBrains / getBrainHooksAdapterByConfigImplicit
 *         / getLinkedRolesWithHooks each carry a peer *.realnode.acceptance.test.ts.
 *
 *         a file:// specifier is used on purpose: it sidesteps bare-specifier node_modules
 *         lookup (a downstream repo-layout concern, proven at the peer sites) so this file
 *         proves importEsmSafe's own esm-capable-load behavior in isolation.
 */
describe('importEsmSafe.realnode.acceptance', () => {
  const distPath = join(
    __dirname,
    '..',
    '..',
    'dist',
    'infra',
    'importEsmSafe',
    'importEsmSafe.js',
  );
  const probePath = join(
    __dirname,
    '..',
    '.test',
    'infra',
    'probe.importEsmSafe.cjs',
  );
  const extractDistPath = join(
    __dirname,
    '..',
    '..',
    'dist',
    'domain.operations',
    'brains',
    'asBrainsFromPackageExports.js',
  );

  given('[case1] the built dist importEsmSafe, run in a real node child', () => {
    const report = useBeforeAll(async () => {
      // the built artifact must exist; acceptance runs after `npm run build`
      if (!existsSync(distPath))
        throw new ConstraintError(
          'built dist/infra/importEsmSafe/importEsmSafe.js absent — run `npm run build` first',
          { distPath },
        );
      if (!existsSync(extractDistPath))
        throw new ConstraintError(
          'built dist asBrainsFromPackageExports.js absent — run `npm run build` first',
          { extractDistPath },
        );

      const workDir = genTempDir({ slug: 'importEsmSafe-realnode' });
      return spawnProbeBetween<{
        esmKeys: string[];
        esmValue: unknown;
        cjsValue: unknown;
        cjsDynKeys: string[];
        cjsDynValue: unknown;
        requireEsmThrew: boolean;
        discoveryOldAtomCount: number;
        discoveryNewAtomCount: number;
        importRejectedOnAbsent: boolean;
      }>({
        args: [probePath, distPath, workDir, extractDistPath],
        label: 'real-node',
      });
    });

    when('[t0] it loads an esm-only module (type:module + top-level await)', () => {
      then('the esm named export enumerates', () => {
        expect(report.esmKeys).toContain('getBrainAtomsByTestFixture');
      });

      then('the esm named export is callable and returns its value', () => {
        expect(report.esmValue).toEqual([{ slug: 'test/fixture' }]);
      });

      then('a require() shim cannot load the same esm module (the RED)', () => {
        expect(report.requireEsmThrew).toBe(true);
      });
    });

    when('[t1] it loads a plain cjs module', () => {
      then('the cjs named export is callable (fix is a superset)', () => {
        expect(report.cjsValue).toEqual([{ slug: 'test/fixture' }]);
      });
    });

    when('[t2] it loads a lexer-undetectable cjs module', () => {
      then('the .default-nested export is hoisted to the top level', () => {
        expect(report.cjsDynKeys).toContain('getBrainAtomsByDynamic');
      });

      then('the hoisted export is callable and returns its value', () => {
        expect(report.cjsDynValue).toEqual([{ slug: 'test/dynamic' }]);
      });
    });

    when(
      '[t3] the getAvailableBrains discovery contract runs both ways on the esm brain',
      () => {
        // acc#4: RED on the old require()-shim path, GREEN on the importEsmSafe fix —
        // proven at the extraction contract (not only the raw import), environment-free.
        then('the old require()-shim path DROPS the esm brain (RED)', () => {
          expect(report.discoveryOldAtomCount).toBe(0);
        });

        then('the importEsmSafe path KEEPS the esm brain (GREEN)', () => {
          expect(report.discoveryNewAtomCount).toBeGreaterThan(0);
        });
      },
    );

    when('[t4] the specifier points at an absent module (negative path)', () => {
      then('importEsmSafe rejects (so callers can fault-isolate + warn)', () => {
        expect(report.importRejectedOnAbsent).toBe(true);
      });
    });

    when('[t5] the full report is captured', () => {
      // snapshot the deterministic case1 report to lock the output contract shape
      // (self-generated fixtures → stable; the peer-site files use explicit assertions
      // since real brain counts vary as packages change).
      then('the report matches the locked snapshot', () => {
        expect(report).toMatchSnapshot();
      });
    });
  });
});
