import { chmodSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestPathWithout } from '../.test/infra/genTestPathWithout';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '../.test/infra/invokeRhachetCliBinary';

/**
 * .what = acceptance tests for the `install.age` skill
 * .why = its `show_help()` is its one usage doc, and its refusals are a human surface
 *        (`rule.always.resnap-the-help-a-skill-renders`,
 *        `rule.require.contract-snapshot-exhaustiveness`)
 *
 * .note = the plan render branches on whether `age` is on PATH; each case constructs the
 *   absent or present branch it grades, so no case depends on whether the host has `age`
 * .note = every refusal is asserted on stderr
 */
/**
 * .what = collapse a farm's random `mkdtemp` suffix, which `asSnapshotSafe` leaves intact
 *   (`rule.require.mask-both-names-of-a-temp-dir`)
 */
const asFarmSafe = (output: string): string =>
  output.replace(/install-age-farm-[A-Za-z0-9]+/g, 'install-age-farm-MASKED');

/**
 * .what = a PATH that carries every real binary except the ones named
 */
const genOnePathWithout = (input: { binaries: string[] }): string =>
  genTestPathWithout({
    binaries: input.binaries,
    into: mkdtempSync(join(tmpdir(), 'install-age-farm-')),
    path: process.env.PATH ?? '',
  });

/**
 * .what = a farm with the named binaries withheld and the named stubs written in their place
 * .why = the apply arms call `sudo` and `apt-get`; the stubs stand in for both, so no case
 *        installs onto the host (`rule.require.safe-by-default`)
 */
const genOnePathWithStubs = (input: {
  withheld: string[];
  stubs: Record<string, string>;
}): string => {
  const farm = genOnePathWithout({
    binaries: [...input.withheld, ...Object.keys(input.stubs)],
  });
  for (const [name, body] of Object.entries(input.stubs)) {
    const at = join(farm, name);
    writeFileSync(at, `#!/usr/bin/env bash\n${body}\n`);
    chmodSync(at, 0o755);
  }
  return farm;
};

describe('install.age', () => {
  const REPO_ROOT = resolve(__dirname, '../..');

  const invoke = (
    args: string[],
    options?: { path?: string; env?: Record<string, string> },
  ) =>
    invokeRhachetCliBinary({
      binary: 'rhx',
      args: ['install.age', ...args],
      cwd: REPO_ROOT,
      logOnError: false,
      // the harness merges over `process.env`, so this overrides only the named keys
      env: {
        ...(options?.path ? { PATH: options.path } : {}),
        ...options?.env,
      },
    });

  given('[case1] plan mode — the default, with age ABSENT', () => {
    /**
     * .what = the safety clamp: a bare invocation is read-only (`rule.require.safe-by-default`)
     */
    const pathWithoutAge = genOnePathWithout({ binaries: ['age'] });

    when('[t0] it is invoked bare', () => {
      const result = useBeforeAll(async () =>
        invoke([], { path: pathWithoutAge }),
      );

      then('it exits 0 — plan reports, it never installs', () => {
        expect(result.status).toEqual(0);
      });

      then('it names the absent binary and the command it WOULD run', () => {
        // `PATH` stays capitalized as the env var's own name (`rule.prefer.lowercase`)
        expect(result.stdout).toContain('age: not on PATH');
        expect(result.stdout).toContain('sudo apt-get install -y age');
      });

      then('it roots every line on the artifact glyph', () => {
        expect(result.stdout).toContain('📦 install.age');
      });

      then('it writes NO refusal to stderr', () => {
        expect(result.stderr).not.toContain('Error');
      });

      then('the absent-branch plan render is pinned', () => {
        // this branch holds no volatile field once its precondition is constructed
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot(
          'stdout-plan-age-absent',
        );
      });
    });
  });

  given('[case1b] plan mode — the default, with age PRESENT', () => {
    /**
     * .what = the idempotence clamp: an `age` already on PATH is a no-op
     * .note = presence comes from a stub, so the `version:` line is a fixed string
     */
    const pathWithStubAge = genOnePathWithout({ binaries: ['age'] });
    const stub = join(pathWithStubAge, 'age');
    writeFileSync(stub, '#!/usr/bin/env bash\necho "age 1.0.0-stub"\n');
    chmodSync(stub, 0o755);

    when('[t0] it is invoked bare', () => {
      const result = useBeforeAll(async () =>
        invoke([], { path: pathWithStubAge }),
      );

      then('it exits 0 — an extant age is a no-op', () => {
        expect(result.status).toEqual(0);
      });

      then('it reports presence rather than a command to run', () => {
        expect(result.stdout).toContain('already on PATH');
        expect(result.stdout).not.toContain('would run');
      });

      then('it writes NO refusal to stderr', () => {
        expect(result.stderr).not.toContain('Error');
      });

      then('the present-branch plan render is pinned', () => {
        // the `where:` line carries the farm path, so both of its volatile names are masked
        expect(asFarmSafe(asSnapshotSafe(result.stdout))).toMatchSnapshot(
          'stdout-plan-age-present',
        );
      });
    });
  });

  given('[case1c] an age on PATH whose --version fails', () => {
    /**
     * .what = the failhide clamp: a broken binary surfaces as a malfunction, never a quiet
     *   placeholder version beside an exit 0 (`rule.forbid.failhide`)
     */
    const pathWithBrokenAge = genOnePathWithout({ binaries: ['age'] });
    const stub = join(pathWithBrokenAge, 'age');
    writeFileSync(
      stub,
      '#!/usr/bin/env bash\necho "age: exec format error" >&2\nexit 126\n',
    );
    chmodSync(stub, 0o755);

    when('[t0] it is invoked bare', () => {
      const result = useBeforeAll(async () =>
        invoke([], { path: pathWithBrokenAge }),
      );

      then('it exits 1 — a broken binary is a malfunction', () => {
        expect(result.status).toEqual(1);
      });

      then('it names the class and carries the cli own error', () => {
        expect(result.stderr).toContain('💥 MalfunctionError:');
        expect(result.stderr).toContain('age: exec format error');
      });

      then('its hint names a cure that runs on any host, never the apt-only one', () => {
        // this row fires before the apt gate, so it reaches hosts with no apt-get
        expect(result.stderr).toContain(
          'https://github.com/FiloSottile/age#installation',
        );
        expect(result.stderr).not.toContain('apt-get');
      });

      then('it never reports presence on stdout', () => {
        expect(result.stdout).not.toContain('already on PATH');
      });

      then('the refusal render is pinned', () => {
        expect(asFarmSafe(asSnapshotSafe(result.stderr))).toMatchSnapshot(
          'stderr-age-version-fails',
        );
      });
    });
  });

  given('[case2] the help text', () => {
    when('[t0] it is asked for', () => {
      const result = useBeforeAll(async () => invoke(['help']));

      then('it exits 0', () => {
        expect(result.status).toEqual(0);
      });

      then('it quotes the EXACT command cicd runs', () => {
        // the skill mirrors `.github/workflows/.test.yml:209`; a drift shows in one diff
        expect(result.stdout).toContain('sudo apt-get install -y age');
        expect(result.stdout).toContain('.github/workflows/.test.yml:209');
      });

      then('it names the npm NAME-COLLISION trap it exists to close', () => {
        // the npm package named `age` is an unrelated game engine with no `bin`
        expect(result.stdout).toContain('game engine');
      });

      then('it names the two suites that REQUIRE it', () => {
        expect(result.stdout).toContain(
          'sshPrikeyToAgeIdentity.integration.test.ts',
        );
        expect(result.stdout).toContain('recipient.integration.test.ts');
      });

      then('the help matches its snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case3] an invalid --mode value', () => {
    when('[t0] it is invoked with --mode sideways', () => {
      const result = useBeforeAll(async () => invoke(['--mode', 'sideways']));

      then('it refuses at exit 2 — a bad value is the caller to fix', () => {
        expect(result.status).toEqual(2);
      });

      then('the refusal names its class UNABRIDGED, and the valid set', () => {
        // `rule.require.unabridged-error-prefix` — the glyph alone is not the class
        expect(result.stderr).toContain('ConstraintError');
        expect(result.stderr).toContain('sideways');
        expect(result.stderr).toContain('plan or apply');
      });

      then('the refusal matches its snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case4] --mode handed a FLAG as its value', () => {
    /**
     * .what = the `require_val` mispair guard: a `--*` token is never taken as a mode
     */
    when('[t0] it is invoked with --mode --verbose', () => {
      const result = useBeforeAll(async () => invoke(['--mode', '--verbose']));

      then('it refuses at exit 2', () => {
        expect(result.status).toEqual(2);
      });

      then('the refusal names the ABSENT VALUE and the valid set', () => {
        expect(result.stderr).toContain('ConstraintError');
        expect(result.stderr).toContain('absent value');
        expect(result.stderr).toContain('plan or apply');

        // the refusal names the absent value, never an invalid mode
        expect(result.stderr).not.toContain('invalid mode');
      });

      then('the refusal matches its snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case6] apply mode, on a platform with no apt-get', () => {
    const pathNoApt = genOnePathWithout({ binaries: ['age', 'apt-get'] });

    when('[t0] it is invoked with --mode apply', () => {
      const result = useBeforeAll(async () =>
        invoke(['--mode', 'apply'], { path: pathNoApt }),
      );

      then('it refuses at exit 2 — the platform is the caller to change', () => {
        expect(result.status).toEqual(2);
      });

      then('the refusal names its class and a portable fix', () => {
        expect(result.stderr).toContain('ConstraintError');
        expect(result.stderr).toContain('apt-get not found');
        expect(result.stderr).toContain('https://github.com/FiloSottile/age#installation');
      });

      then('the refusal matches its snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case7] apply mode, with apt-get but no sudo', () => {
    const pathNoSudo = genOnePathWithStubs({
      withheld: ['age', 'sudo'],
      stubs: { 'apt-get': 'exit 0' },
    });

    when('[t0] it is invoked with --mode apply', () => {
      const result = useBeforeAll(async () =>
        invoke(['--mode', 'apply'], { path: pathNoSudo }),
      );

      then('it refuses at exit 2 — a human holds the key', () => {
        expect(result.status).toEqual(2);
      });

      then('the refusal hands the human the exact command', () => {
        expect(result.stderr).toContain('ConstraintError');
        expect(result.stderr).toContain('sudo not found');
        expect(result.stderr).toContain('apt-get install -y age');
      });

      then('the refusal matches its snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case8] apply mode, where apt-get fails', () => {
    /**
     * .note = the stub `sudo` answers the passwordless probe (`sudo -n true`) with exit 0,
     *   then fails the install itself — so the case reaches the apt arm with no tty and no
     *   real package manager involved
     */
    const pathAptFails = genOnePathWithStubs({
      withheld: ['age'],
      stubs: {
        'apt-get': 'exit 0',
        sudo: '[[ "$1" == "-n" ]] && exit 0\nexit 100',
      },
    });

    when('[t0] it is invoked with --mode apply', () => {
      const result = useBeforeAll(async () =>
        invoke(['--mode', 'apply'], { path: pathAptFails }),
      );

      then('it exits 1 — the package manager malfunctioned', () => {
        expect(result.status).toEqual(1);
      });

      then('the refusal names its class and the likely cause', () => {
        expect(result.stderr).toContain('MalfunctionError');
        expect(result.stderr).toContain('apt-get failed');
        expect(result.stderr).toContain('sudo apt-get update');
      });

      then('the refusal matches its snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case9] apply mode, where apt reports success and leaves no age', () => {
    /**
     * .why = the verify arm is the defect the skill exists to catch: a zero exit that left no
     *   binary on PATH (`rule.forbid.mechanism-inferred-from-outcome`)
     */
    const pathAptLies = genOnePathWithStubs({
      withheld: ['age'],
      stubs: { 'apt-get': 'exit 0', sudo: 'exit 0' },
    });

    when('[t0] it is invoked with --mode apply', () => {
      const result = useBeforeAll(async () =>
        invoke(['--mode', 'apply'], { path: pathAptLies }),
      );

      then('it exits 1 — a zero exit is not a binary on PATH', () => {
        expect(result.status).toEqual(1);
      });

      then('the refusal names the gap between the exit and the PATH', () => {
        expect(result.stderr).toContain('MalfunctionError');
        expect(result.stderr).toContain('age is not on PATH');
      });

      then('the stdout names the command it ran', () => {
        expect(result.stdout).toContain('📦 install.age');
        expect(result.stdout).toContain('sudo apt-get install -y age');
      });

      then('the refusal matches its snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case10] apply mode, where sudo needs a password and no tty exists', () => {
    /**
     * .why = sudo wants a password and no tty exists: a constraint, never an apt malfunction
     * .note = `INSTALL_AGE_TEST_TTY_PATH` points the tty probe at a path that cannot open
     */
    const pathSudoNeedsPassword = genOnePathWithStubs({
      withheld: ['age'],
      stubs: {
        'apt-get': 'exit 0',
        sudo: '[[ "$1" == "-n" ]] && exit 1\nexit 0',
      },
    });

    when('[t0] it is invoked with --mode apply', () => {
      const result = useBeforeAll(async () =>
        invoke(['--mode', 'apply'], {
          path: pathSudoNeedsPassword,
          env: { INSTALL_AGE_TEST_TTY_PATH: '/nonexistent/install-age-tty' },
        }),
      );

      then('it refuses at exit 2 — a human holds the key', () => {
        expect(result.status).toEqual(2);
      });

      then('the refusal names the absent tty and hands over the command', () => {
        expect(result.stderr).toContain('ConstraintError');
        expect(result.stderr).toContain(
          'sudo needs a password, and this shell has no tty',
        );
        expect(result.stderr).toContain('sudo apt-get install -y age');

        // the tty refusal is a constraint, never an apt failure
        expect(result.stderr).not.toContain('apt-get failed');
      });

      then('the refusal matches its snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case11] apply mode, where the install succeeds', () => {
    /**
     * .why = the one success render this skill has (`rule.require.contract-snapshot-exhaustiveness`)
     * .note = the stub `apt-get` writes an `age` stub beside itself, so the verify arm finds it
     */
    const pathAptInstalls = genOnePathWithStubs({
      withheld: ['age'],
      stubs: {
        'apt-get': [
          'at="$(dirname "$0")/age"',
          `printf '#!/usr/bin/env bash\\necho "age 1.0.0-stub"\\n' > "$at"`,
          'chmod +x "$at"',
        ].join('\n'),
        sudo: '[[ "$1" == "-n" ]] && exit 0\nexec "$@"',
      },
    });

    when('[t0] it is invoked with --mode apply', () => {
      const result = useBeforeAll(async () =>
        invoke(['--mode', 'apply'], { path: pathAptInstalls }),
      );

      then('it exits 0 — the binary landed on PATH', () => {
        expect(result.status).toEqual(0);
      });

      then('it names the command it ran, then the installed binary', () => {
        expect(result.stdout).toContain('sudo apt-get install -y age');
        expect(result.stdout).toContain('installed');
        expect(result.stdout).toContain('age 1.0.0-stub');
      });

      then('it writes NO refusal to stderr', () => {
        expect(result.stderr).not.toContain('Error');
      });

      then('the success render is pinned', () => {
        // the `where:` line carries the farm path, so both of its volatile names are masked
        expect(asFarmSafe(asSnapshotSafe(result.stdout))).toMatchSnapshot(
          'stdout-apply-installed',
        );
      });
    });
  });

  given('[case5] an unknown argument', () => {
    /**
     * .why = an unknown flag dropped in silence reads as applied, and plan-vs-apply must be explicit
     */
    when('[t0] it is invoked with --node apply', () => {
      const result = useBeforeAll(async () => invoke(['--node', 'apply']));

      then('it refuses at exit 2 — a typo is the caller to fix', () => {
        expect(result.status).toEqual(2);
      });

      then('the refusal NAMES the argument rather than drop it', () => {
        expect(result.stderr).toContain('ConstraintError');
        expect(result.stderr).toContain('--node');
        expect(result.stderr).toContain('unknown argument');
      });

      then('the refusal points at help — the one source of usage', () => {
        // `rule.require.errors-name-the-fix` — a rejection with no route forward is half an error
        expect(result.stderr).toContain('rhx install.age help');
      });

      then('the refusal matches its snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });

});
