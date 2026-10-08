import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '../.test/infra/invokeRhachetCliBinary';

/**
 * .what = acceptance tests for the `get.package.format` skill
 * .why = it settles whether a static import of a dual-published esm package is an eager-esm
 *        violation, so its render is a contract (`rule.require.contract-snapshot-exhaustiveness`)
 *
 * .note = every refusal is asserted on stderr; the verdict owns stdout
 * .note = the runtime node version is masked to `node vNODE`; the package `version:` row is
 *   lockfile-pinned, so it stays unmasked
 */
describe('get.package.format', () => {
  const REPO_ROOT = resolve(__dirname, '../..');

  // the repo's own pinned tsx — `npx tsx` looks from the temp cwd, so it would fetch tsx
  // and print the fetch into the snapshotted stderr
  const TSX_BIN = join(REPO_ROOT, 'node_modules', '.bin', 'tsx');

  const invoke = (args: string[]) =>
    invokeRhachetCliBinary({
      binary: 'rhx',
      args: ['get.package.format', ...args],
      cwd: REPO_ROOT,
      logOnError: false,
    });

  given('[case1] an installed dual-published package', () => {
    when('[t0] it is measured', () => {
      // js-tiktoken is the package the budget gate imports lazily — so it is the
      // measurement this skill exists to have produced
      const result = useBeforeAll(async () =>
        invoke(['--package', 'js-tiktoken']),
      );

      then('it exits 0 — a verdict is an answer, never a refusal', () => {
        expect(result.status).toEqual(0);
      });

      then('it names the verdict and the manifest evidence beside it', () => {
        expect(result.stdout).toContain('get.package.format');
        expect(result.stdout).toContain('verdict');
      });

      then('the readout matches its snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });

      // the help (`.sh`) and the verdict (`.ts`) render from two files; this pins that their
      // root glyphs agree (`rule.prefer.emoji-language` — one grain, one glyph)
      then('the verdict roots on the SAME glyph its own help does', async () => {
        const help = await invoke(['help']);

        const rootOfFirstLineWith = (text: string, needle: string): string =>
          text
            .split('\n')
            .find((line) => line.includes(needle))!
            .trim()
            .slice(0, 2);

        expect(
          rootOfFirstLineWith(result.stdout, 'get.package.format --package'),
        ).toEqual(rootOfFirstLineWith(help.stdout, 'get.package.format —'));
      });
    });
  });

  given('[case2] no --package at all', () => {
    when('[t0] it is invoked bare', () => {
      const result = useBeforeAll(async () => invoke([]));

      then('it refuses at exit 2 — an absent arg is the caller to fix', () => {
        expect(result.status).toEqual(2);
      });

      then('the refusal names its class UNABRIDGED, on stderr', () => {
        // `rule.require.unabridged-error-prefix` — the glyph alone is not the class
        expect(result.stderr).toContain('ConstraintError');
        expect(result.stderr).toContain('--package');
      });

      then('the refusal matches its snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case3] --package handed a FLAG as its value', () => {
    /**
     * .what = the arg-mispair guard: a `--*` token is never taken as a package name
     */
    when('[t0] it is invoked with --package --verbose', () => {
      const result = useBeforeAll(async () =>
        invoke(['--package', '--verbose']),
      );

      then('it refuses at exit 2', () => {
        expect(result.status).toEqual(2);
      });

      then('the refusal names the MISPAIR, never a phantom package', () => {
        expect(result.stderr).toContain('ConstraintError');
        expect(result.stderr).toContain('needs a value');
        expect(result.stderr).toContain('--verbose');

        // the refusal names the mispair, never an absent package
        expect(result.stderr).not.toContain('is not installed');
      });

      then('the refusal matches its snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case3b] --package with no value at all', () => {
    /**
     * .what = the guard's empty arm: a final `--package` with naught after it
     */
    when('[t0] it is invoked with --package as the last token', () => {
      const result = useBeforeAll(async () => invoke(['--package']));

      then('it refuses at exit 2', () => {
        expect(result.status).toEqual(2);
      });

      then('the refusal names the absent value, never a phantom package', () => {
        expect(result.stderr).toContain('ConstraintError');
        expect(result.stderr).toContain('--package needs a value');
        expect(result.stderr).not.toContain('is not installed');
      });

      then('the refusal matches its snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case4] a package that is not installed', () => {
    when('[t0] it is measured', () => {
      const result = useBeforeAll(async () =>
        invoke(['--package', 'a-package-that-does-not-exist-here']),
      );

      then(
        'it refuses at exit 2 — it reads node_modules, never the registry',
        () => {
          expect(result.status).toEqual(2);
        },
      );

      then('the refusal names the package, on stderr', () => {
        expect(result.stderr).toContain('ConstraintError');
        expect(result.stderr).toContain('a-package-that-does-not-exist-here');
      });

      then('the refusal matches its snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case5] the help text', () => {
    when('[t0] it is asked for', () => {
      const result = useBeforeAll(async () => invoke(['help']));

      then('it exits 0', () => {
        expect(result.status).toEqual(0);
      });

      then('it renders the three verdicts a caller must tell apart', () => {
        expect(result.stdout).toContain('cjs');
        expect(result.stdout).toContain('dual');
        expect(result.stdout).toContain('esm-only');
      });

      then('the help matches its snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case6] an unknown flag', () => {
    /**
     * .what = the `-*)` arm of the skill's own arbitration
     * .why = an unknown flag dropped in silence reads as applied, so it is named and refused
     */
    when('[t0] it is invoked with --pkg', () => {
      const result = useBeforeAll(async () => invoke(['--pkg', 'js-tiktoken']));

      then('it refuses at exit 2 — a typo is the caller to fix', () => {
        expect(result.status).toEqual(2);
      });

      then('the refusal NAMES the flag rather than drop it', () => {
        expect(result.stderr).toContain('ConstraintError');
        expect(result.stderr).toContain('--pkg');
      });

      then('the refusal matches its snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case7] an unexpected positional argument', () => {
    /**
     * .what = the `*)` arm — a bare word where a flag was owed
     * .why = the refusal names the `--package` form it wanted (`rule.require.errors-name-the-fix`)
     */
    when('[t0] it is invoked with a bare package name', () => {
      const result = useBeforeAll(async () => invoke(['js-tiktoken']));

      then('it refuses at exit 2', () => {
        expect(result.status).toEqual(2);
      });

      then('the refusal names the argument AND the form it wanted', () => {
        expect(result.stderr).toContain('ConstraintError');
        expect(result.stderr).toContain('js-tiktoken');
        expect(result.stderr).toContain('--package');
      });

      then('the refusal matches its snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });

  /**
   * .what = the documented malfunction exit (exit 1), reached via a malformed manifest
   * .note = it spawns the skill's `.ts` directly: the skill reads `process.cwd()/node_modules`,
   *   and an `rhx` skill lookup from the temp dir would refuse for an unrelated cause
   */
  given('[case8] a malformed package.json inside node_modules', () => {
    const dir = genTempDir({ slug: 'get-package-format-malformed' });

    const result = useBeforeAll(async () => {
      const dirPackage = join(dir, 'node_modules', 'broken-manifest');
      mkdirSync(dirPackage, { recursive: true });
      writeFileSync(
        join(dirPackage, 'package.json'),
        '{ "name": "broken-manifest", "version": "1.0.0",, }\n',
        'utf-8',
      );

      const ran = spawnSync(
        TSX_BIN,
        [
          join(
            REPO_ROOT,
            '.agent',
            'repo=.this',
            'role=any',
            'skills',
            'get.package.format.ts',
          ),
          '--package',
          'broken-manifest',
        ],
        { cwd: dir, encoding: 'utf-8' },
      );

      return {
        status: ran.status,
        stdout: ran.stdout ?? '',
        stderr: ran.stderr ?? '',
      };
    });

    when('[t0] it is measured', () => {
      // a malformed manifest is a tree fault, never a caller arg (`rule.require.exit-code-semantics`)
      then('🔴 it exits 1 — the malfunction code, now reachable', () => {
        expect(result.status).toEqual(1);
      });

      // the raw-stack half. the refusal carries its class prefix, never a bare node trace
      // (`rule.require.unabridged-error-prefix`)
      then('🔴 the refusal names its CLASS, unabridged', () => {
        expect(result.stderr).toContain('MalfunctionError');
        expect(result.stderr).not.toContain('at Object.<anonymous>');
      });

      then('it names the package, the cause, and the remedy', () => {
        expect(result.stderr).toContain('broken-manifest');
        expect(result.stderr).toContain('why:');
        // `hint:` is the repo's one label for a remedy row (`rule.forbid.domain-term-synonyms`)
        expect(result.stderr).toContain('hint:');
      });

      // a refusal goes to stderr alone; stdout stays the caller's pipe
      then('it writes NO verdict to stdout', () => {
        expect(result.stdout).not.toContain('verdict');
      });

      // the snapshot key names the direct spawn: the runner banner and footer are absent here
      then('the refusal matches its snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot(
          'stderr-direct-spawn-no-runner-frame',
        );
      });
    });
  });

  /**
   * .what = measure a fixture package, written into a temp dir's node_modules
   * .why = a fixture package pins the `cjs` and `esm-only` verdicts to bytes this suite wrote;
   *        it spawns the `.ts` directly, for the cwd reason `[case8]` states
   */
  const measureFixturePackage = (input: {
    slug: string;
    name: string;
    manifest: Record<string, unknown>;
    entry: string;
  }) => {
    const dir = genTempDir({ slug: input.slug });
    const dirPackage = join(dir, 'node_modules', input.name);
    mkdirSync(dirPackage, { recursive: true });
    writeFileSync(
      join(dirPackage, 'package.json'),
      `${JSON.stringify({ name: input.name, version: '1.0.0', ...input.manifest }, null, 2)}\n`,
      'utf-8',
    );
    writeFileSync(join(dirPackage, 'index.js'), input.entry, 'utf-8');
    const ran = spawnSync(
      TSX_BIN,
      [
        join(
          REPO_ROOT,
          '.agent',
          'repo=.this',
          'role=any',
          'skills',
          'get.package.format.ts',
        ),
        '--package',
        input.name,
      ],
      { cwd: dir, encoding: 'utf-8' },
    );
    return {
      status: ran.status,
      stdout: ran.stdout ?? '',
      stderr: ran.stderr ?? '',
    };
  };

  given('[case9] an installed cjs-only package', () => {
    when('[t0] it is measured', () => {
      const result = useBeforeAll(async () =>
        measureFixturePackage({
          slug: 'get-package-format-cjs',
          name: 'fixture-cjs',
          manifest: { main: 'index.js' },
          entry: 'module.exports = { wave: 1 };\n',
        }),
      );

      then('it exits 0 — a verdict is an answer, never a refusal', () => {
        expect(result.status).toEqual(0);
      });

      then('it renders the cjs verdict', () => {
        expect(result.stdout).toContain('verdict');
        expect(result.stdout).toContain('cjs');
        expect(result.stdout).not.toContain('esm-only');
      });

      then('the readout matches its snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot(
          'stdout-direct-spawn-no-runner-frame',
        );
      });
    });
  });

  given('[case10] an installed esm-only package', () => {
    when('[t0] it is measured', () => {
      const result = useBeforeAll(async () =>
        measureFixturePackage({
          slug: 'get-package-format-esm-only',
          name: 'fixture-esm-only',
          manifest: {
            type: 'module',
            exports: { '.': { import: './index.js' } },
          },
          entry: 'export const wave = 1;\n',
        }),
      );

      then('it exits 0 — a verdict is an answer, never a refusal', () => {
        expect(result.status).toEqual(0);
      });

      then('it renders the esm-only verdict', () => {
        expect(result.stdout).toContain('verdict');
        expect(result.stdout).toContain('esm-only');
      });

      then('the readout matches its snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot(
          'stdout-direct-spawn-no-runner-frame',
        );
      });
    });
  });
});
