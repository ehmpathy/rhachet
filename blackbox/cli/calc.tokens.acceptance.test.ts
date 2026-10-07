import { chmodSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import { ConstraintError } from 'helpful-errors';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '../.test/infra/invokeRhachetCliBinary';

/**
 * .what = acceptance tests for the `calc.tokens` skill — every surface a caller can reach
 * .why = the budget gate refuses a boot on the counter this skill measures, so its render and
 *        refusals are a contract (`rule.require.contract-snapshot-exhaustiveness`)
 *
 * .note = every refusal is asserted on stderr; a `--format json` caller pipes stdout into jq
 * .note = the corpus is a frozen fixture, so a token count over it is deterministic
 */
describe('calc.tokens', () => {
  const REPO_ROOT = resolve(__dirname, '../..');
  const DIR_CORPUS = 'blackbox/.test/assets/with-calc-tokens-corpus';

  const invoke = (args: string[]) =>
    invokeRhachetCliBinary({
      binary: 'rhx',
      args: ['calc.tokens', ...args],
      cwd: REPO_ROOT,
      logOnError: false,
    });

  given('[case1] a frozen two-file corpus', () => {
    when('[t0] measured as a tree', () => {
      const result = useBeforeAll(async () =>
        invoke([
          '--paths',
          `${DIR_CORPUS}/plain/*.md`,
          '--against',
          'chars-div-4',
          '--top',
          '2',
        ]),
      );

      then('it exits 0', () => {
        expect(result.status).toEqual(0);
      });

      then(
        'the tree names the corpus, the density series, and the estimator error',
        () => {
          // the estimator arm must name the error direction: an undercount passes an over-budget boot
          expect(result.stdout).toContain(
            'undercounts — a gate would pass an over-budget payload',
          );
        },
      );

      then('the readout matches its snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] measured as json', () => {
      const result = useBeforeAll(async () =>
        invoke([
          '--paths',
          `${DIR_CORPUS}/plain/*.md`,
          '--against',
          'chars-div-4',
          '--top',
          '2',
          '--format',
          'json',
        ]),
      );

      then('it exits 0', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout carries a parseable document, and only that', () => {
        // the render prepends rhachet's own `🪨 run solid skill` banner, so the json starts
        // at the first brace. a caller that pipes strips the banner the same way
        const json = result.stdout.slice(result.stdout.indexOf('{'));
        expect(() => JSON.parse(json)).not.toThrow();
      });

      then('the document matches its snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case2] a corpus whose every match is empty', () => {
    when('[t0] measured', () => {
      const result = useBeforeAll(async () =>
        invoke(['--paths', `${DIR_CORPUS}/all-empty/*.md`]),
      );

      then('it refuses with a constraint code', () => {
        // exit 2 — an empty corpus is caller-fixable (`rule.require.exit-code-semantics`)
        expect(result.status).toEqual(2);
      });

      then('the refusal names the cause, and parts it from a zero-match', () => {
        expect(result.stderr).toContain('matched 1 file, and it is empty');
      });

      then('stdout stays empty — a piped caller sees no half-document', () => {
        expect(result.stdout).not.toContain('{');
      });

      then('the refusal matches its snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case3] a glob that matches no file', () => {
    when('[t0] measured', () => {
      const result = useBeforeAll(async () =>
        invoke(['--paths', 'no-such-dir/**/*.md']),
      );

      then('it refuses with a constraint code', () => {
        expect(result.status).toEqual(2);
      });

      then('the refusal names a DIFFERENT cause than an empty corpus', () => {
        // a zero-match and an empty corpus name distinct causes
        expect(result.stderr).toContain('matched 0 files');
        expect(result.stderr).not.toContain('empty');
      });

      then('the refusal matches its snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case4] a malformed argument', () => {
    when('[t0] --top is not an integer', () => {
      const result = useBeforeAll(async () =>
        invoke(['--paths', `${DIR_CORPUS}/plain/*.md`, '--top', 'abc']),
      );

      then('it refuses, and names the valid shape', () => {
        expect(result.status).toEqual(2);
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t1] --against names an estimator that does not exist', () => {
      const result = useBeforeAll(async () =>
        invoke([
          '--paths',
          `${DIR_CORPUS}/plain/*.md`,
          '--against',
          'chars-div-pi',
        ]),
      );

      then('it refuses, and names the set that does', () => {
        expect(result.status).toEqual(2);
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t2] a flag is followed by another flag', () => {
      const result = useBeforeAll(async () => invoke(['--paths', '--top', '3']));

      then(
        'it refuses on the MISPAIRED flag, never on the glob that never arrived',
        () => {
          // a `--*` token is never taken as the value of the flag before it
          expect(result.status).toEqual(2);
          expect(result.stderr).toContain('absent value for --paths');
          expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
        },
      );
    });

    when('[t3] a flag is mistyped', () => {
      const result = useBeforeAll(async () =>
        invoke(['--path', `${DIR_CORPUS}/plain/*.md`]),
      );

      then('it refuses, and names the token it did not know', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('unknown argument: --path');
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t4] --paths is absent entirely', () => {
      const result = useBeforeAll(async () => invoke(['--format', 'json']));

      then('it refuses, and names the required flag', () => {
        expect(result.status).toEqual(2);
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t5] a rhachet-prepended flag trails with no value', () => {
      const result = useBeforeAll(async () =>
        invoke(['--paths', `${DIR_CORPUS}/plain/*.md`, '--skill']),
      );

      then('it refuses loud, rather than dies silent under set -e', () => {
        // a flag with no value refuses with exit 2 and a named cause
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('absent value for --skill');
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t6] --format names a render that does not exist', () => {
      const result = useBeforeAll(async () =>
        invoke(['--paths', `${DIR_CORPUS}/plain/*.md`, '--format', 'bogus']),
      );

      then('it refuses, and names the set that does', () => {
        // a caller who typos `--format jsno` must learn the valid set, never get a tree
        // render they would then pipe into jq
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('invalid format: bogus');
        // stdout carries the rhachet runner banner alone, never a tree the caller would pipe
        expect(result.stdout).not.toContain('🧮');
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });

  /**
   * .what = a corpus whose files are byte-identical, so their densities TIE
   * .why = `fast-glob` yields filesystem order, so a tie must break on path to be reproducible
   * .note = the clamp is one-directional: enumeration order belongs to the filesystem, so the
   *   assertion pins the property (row order is a function of the corpus), never a forced drive
   */
  given('[case5] a corpus whose densities tie', () => {
    when('[t0] measured as json', () => {
      const result = useBeforeAll(async () =>
        invoke([
          '--paths',
          `${DIR_CORPUS}/tied/*.md`,
          '--top',
          '4',
          '--format',
          'json',
        ]),
      );

      then('it exits 0', () => {
        expect(result.status).toEqual(0);
      });

      then('the densest rows are a pure function of the corpus', () => {
        const json = result.stdout.slice(result.stdout.indexOf('{'));
        const parsed = JSON.parse(json) as {
          densest: { path: string }[];
        };

        // every density is equal by construction, so path is the ONLY key left to sort on
        const paths = parsed.densest.map((row) => row.path);
        expect(paths).toEqual([...paths].sort());
        expect(paths).toEqual([
          `${DIR_CORPUS}/tied/alpha.md`,
          `${DIR_CORPUS}/tied/delta.md`,
          `${DIR_CORPUS}/tied/mike.md`,
          `${DIR_CORPUS}/tied/zulu.md`,
        ]);
      });

      then('the tied render is pinned', () => {
        // the order assertion above grades no row shape; this pin does
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot('stdout-tied');
      });
    });
  });

  given('[case6] a caller who asks how to use it', () => {
    when('[t0] help', () => {
      const result = useBeforeAll(async () => invoke(['help']));

      then('it exits 0', () => {
        expect(result.status).toEqual(0);
      });

      then('it documents every flag it accepts, and its exit codes', () => {
        // `rule.require.help-on-demand`: usage, inputs with defaults, and an example
        expect(result.stdout).toContain('required.');
        expect(result.stdout).toContain('non-negative integer');
        expect(result.stdout).toContain('repeatable');
      });

      then('the help matches its snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case7] a matched file that cannot be read', () => {
    const scene = useBeforeAll(async () => {
      // root reads a mode-000 file regardless, so the fault this case clamps cannot arise
      if (process.getuid?.() === 0)
        throw new ConstraintError('[case7] needs a non-root user', {
          hint: 'run the acceptance suite as a non-root user',
        });
      const dir = genTempDir({ slug: 'calc-tokens-unreadable' });
      const file = join(dir, 'locked.md');
      writeFileSync(file, 'a brief no reader may open\n');
      chmodSync(file, 0o000);
      return { dir };
    });

    when('[t0] measured', () => {
      const result = useBeforeAll(async () =>
        invoke(['--paths', `${scene.dir}/*.md`]),
      );

      then('it exits 1, since the server did not anticipate the fault', () => {
        expect(result.status).toEqual(1);
      });

      then('the refusal names its class unabridged', () => {
        expect(result.stderr).toContain('💥 MalfunctionError');
      });

      then('the refusal matches its snapshot', () => {
        // the temp dir name carries a timestamp, so both its names are masked before the pin
        const stderrMasked = result.stderr
          .split(scene.dir)
          .join('/TMP_REPO')
          .split(relative(REPO_ROOT, scene.dir))
          .join('/TMP_REPO');
        expect(asSnapshotSafe(stderrMasked)).toMatchSnapshot();
      });
    });
  });
});
