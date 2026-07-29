import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getOnePackageEntryUrl } from './getOnePackageEntryUrl';

/**
 * .what = integration coverage for the getOnePackageEntryUrl communicator leaf (#429)
 * .why  = getOnePackageEntryUrl does real i/o (createRequire + require.resolve +
 *         pathToFileURL), so per rule.require.test-coverage-by-grain a communicator earns an
 *         integration test. it is synchronous require.resolve (no import()), so — unlike
 *         importEsmSafe — jest CAN witness it directly against real scaffolded packages.
 *         this pins the three behaviors its docstring promises: honor a default exports
 *         condition, throw on an absent package (so the callers' try/catch absorbs it), and
 *         the documented .boundary — the commonjs lookup cannot reach a bare import-only
 *         exports condition under module:commonjs.
 */
describe('getOnePackageEntryUrl', () => {
  given(
    '[case1] a package reached via a default exports condition (no main)',
    () => {
      const scene = useBeforeAll(async () => {
        const workDir = genTempDir({ slug: 'getOnePackageEntryUrl-default' });
        writeFileSync(
          join(workDir, 'package.json'),
          JSON.stringify({ dependencies: { 'fixture-default': '*' } }),
        );

        // scaffold a package whose exports map exposes only a `default` condition (no main),
        // so a successful lookup proves the commonjs lookup honors the exports map, not a main
        // field
        const pkgDir = join(workDir, 'node_modules', 'fixture-default');
        mkdirSync(pkgDir, { recursive: true });
        writeFileSync(
          join(pkgDir, 'package.json'),
          JSON.stringify({
            name: 'fixture-default',
            exports: { '.': { default: './index.js' } },
          }),
        );
        writeFileSync(join(pkgDir, 'index.js'), 'module.exports = {};\n');

        return { workDir };
      });

      when('[t0] looked up from the workdir package.json', () => {
        then('it yields the exports-declared entry as a file: URL', () => {
          const entryUrl = getOnePackageEntryUrl({
            packageName: 'fixture-default',
            fromPackageJson: join(scene.workDir, 'package.json'),
          });
          expect(entryUrl.startsWith('file://')).toBe(true);
          expect(entryUrl.endsWith('fixture-default/index.js')).toBe(true);
        });
      });
    },
  );

  given('[case2] an absent package', () => {
    const scene = useBeforeAll(async () => {
      const workDir = genTempDir({ slug: 'getOnePackageEntryUrl-absent' });
      writeFileSync(
        join(workDir, 'package.json'),
        JSON.stringify({ dependencies: {} }),
      );
      return { workDir };
    });

    when('[t0] looked up', () => {
      then('it throws, so the callers try/catch absorbs it', () => {
        expect(() =>
          getOnePackageEntryUrl({
            packageName: 'rhachet-fixture-does-not-exist',
            fromPackageJson: join(scene.workDir, 'package.json'),
          }),
        ).toThrow();
      });
    });
  });

  given(
    '[case3] a package whose exports expose ONLY a bare import condition (the documented boundary)',
    () => {
      const scene = useBeforeAll(async () => {
        const workDir = genTempDir({
          slug: 'getOnePackageEntryUrl-import-only',
        });
        writeFileSync(
          join(workDir, 'package.json'),
          JSON.stringify({ dependencies: { 'fixture-import-only': '*' } }),
        );

        // an exports map with ONLY an `import` condition, no `default`/`require`/`main`
        // fallback — the exact shape the commonjs conditions cannot reach
        const pkgDir = join(workDir, 'node_modules', 'fixture-import-only');
        mkdirSync(pkgDir, { recursive: true });
        writeFileSync(
          join(pkgDir, 'package.json'),
          JSON.stringify({
            name: 'fixture-import-only',
            exports: { '.': { import: './index.mjs' } },
          }),
        );
        writeFileSync(join(pkgDir, 'index.mjs'), 'export const x = 1;\n');

        return { workDir };
      });

      when('[t0] looked up under commonjs conditions', () => {
        then(
          'the commonjs lookup cannot reach the import-only entry and throws (the .boundary)',
          () => {
            expect(() =>
              getOnePackageEntryUrl({
                packageName: 'fixture-import-only',
                fromPackageJson: join(scene.workDir, 'package.json'),
              }),
            ).toThrow();
          },
        );
      });
    },
  );
});
