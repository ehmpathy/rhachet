import { genTempDir, given, then, useBeforeAll, useThen, when } from 'test-fns';

import { asSummaryBlock } from '@/blackbox/.test/infra/asSummaryBlock';
import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import {
  isRoleLinked,
  setupRoleFixtureRepo,
} from '@/blackbox/.test/infra/roleFixtureRepo';

describe('rhx', () => {
  given('[case1] repo with skills', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-skills' }),
    );

    when('[t0] rhx say-hello', () => {
      const rhxResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['say-hello'],
          cwd: repo.path,
        }),
      );
      const rhachetResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['run', '--skill', 'say-hello'],
          cwd: repo.path,
        }),
      );

      then('rhx exits with status 0', () => {
        expect(rhxResult.status).toEqual(0);
      });

      then('rhx output matches rhachet run --skill output', () => {
        expect(rhxResult.stdout).toEqual(rhachetResult.stdout);
      });

      then('rhx exit code matches rhachet run --skill exit code', () => {
        expect(rhxResult.status).toEqual(rhachetResult.status);
      });
    });

    when('[t1] rhx say-hello with positional arg', () => {
      const rhxResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['say-hello', 'claude'],
          cwd: repo.path,
        }),
      );
      const rhachetResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['run', '--skill', 'say-hello', 'claude'],
          cwd: repo.path,
        }),
      );

      then('rhx exits with status 0', () => {
        expect(rhxResult.status).toEqual(0);
      });

      then('rhx output matches rhachet run --skill output', () => {
        expect(rhxResult.stdout).toEqual(rhachetResult.stdout);
      });
    });

    when('[t2] rhx nonexistent', () => {
      const rhxResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['nonexistent'],
          cwd: repo.path,
          logOnError: false,
        }),
      );
      const rhachetResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['run', '--skill', 'nonexistent'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('rhx exits with non-zero status', () => {
        expect(rhxResult.status).not.toEqual(0);
      });

      then('rhx stderr contains error message', () => {
        expect(rhxResult.stderr).toContain('nonexistent');
      });

      then('rhx exit code matches rhachet run --skill exit code', () => {
        expect(rhxResult.status).toEqual(rhachetResult.status);
      });
    });

    when('[t3] rhx echo-args with multiple args', () => {
      const rhxResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['echo-args', 'foo', 'bar', 'baz'],
          cwd: repo.path,
        }),
      );
      const rhachetResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['run', '--skill', 'echo-args', 'foo', 'bar', 'baz'],
          cwd: repo.path,
        }),
      );

      then('rhx exits with status 0', () => {
        expect(rhxResult.status).toEqual(0);
      });

      then('rhx output matches rhachet run --skill output', () => {
        expect(rhxResult.stdout).toEqual(rhachetResult.stdout);
      });
    });
  });

  given('[case2] repo with exit-code skill', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-skills' }),
    );

    when('[t0] rhx exit-code --code 0', () => {
      const rhxResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['exit-code', '--code', '0'],
          cwd: repo.path,
        }),
      );

      then('rhx exits with status 0', () => {
        expect(rhxResult.status).toEqual(0);
      });
    });

    when('[t1] rhx exit-code --code 7', () => {
      const rhxResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['exit-code', '--code', '7'],
          cwd: repo.path,
          logOnError: false,
        }),
      );
      const rhachetResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['run', '--skill', 'exit-code', '--code', '7'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('rhx exit code matches rhachet run --skill exit code', () => {
        expect(rhxResult.status).toEqual(rhachetResult.status);
      });

      then('rhx preserves original exit code', () => {
        expect(rhxResult.status).toEqual(7);
      });
    });
  });

  given('[case3] stacked flags passthrough', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-skills' }),
    );

    when('[t0] rhx echo-args with repeated --flag', () => {
      const rhxResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['echo-args', '--flag', 'A', '--flag', 'B'],
          cwd: repo.path,
        }),
      );

      then('rhx exits with status 0', () => {
        expect(rhxResult.status).toEqual(0);
      });

      then('both flags reach the skill', () => {
        // echo-args outputs: "args: --flag A --flag B"
        expect(rhxResult.stdout).toContain('--flag A');
        expect(rhxResult.stdout).toContain('--flag B');
      });

      then('flags are in correct order', () => {
        const stdout = rhxResult.stdout;
        const flagAIndex = stdout.indexOf('--flag A');
        const flagBIndex = stdout.indexOf('--flag B');
        expect(flagAIndex).toBeLessThan(flagBIndex);
      });
    });

    when('[t1] rhx echo-args with stacked --scope (real usecase)', () => {
      const rhxResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['echo-args', '--scope', 'invoice', '--scope', 'name://should create'],
          cwd: repo.path,
        }),
      );

      then('rhx exits with status 0', () => {
        expect(rhxResult.status).toEqual(0);
      });

      then('both scopes reach the skill', () => {
        expect(rhxResult.stdout).toContain('--scope invoice');
        expect(rhxResult.stdout).toContain('--scope name://should create');
      });
    });
  });

  given('[case4] rhx upgrade short-circuit', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'minimal' }),
    );

    when('[t0] rhx upgrade --help', () => {
      const rhxResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['upgrade', '--help'],
          cwd: repo.path,
        }),
      );
      const rhachetResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['upgrade', '--help'],
          cwd: repo.path,
        }),
      );

      then('rhx exits with status 0', () => {
        expect(rhxResult.status).toEqual(0);
      });

      then('rhx output matches rhachet upgrade output', () => {
        expect(rhxResult.stdout).toEqual(rhachetResult.stdout);
      });

      then('rhx exit code matches rhachet upgrade exit code', () => {
        expect(rhxResult.status).toEqual(rhachetResult.status);
      });

      then('stdout contains --self option (confirms upgrade command)', () => {
        expect(rhxResult.stdout).toContain('--self');
      });

      then('stdout contains --roles option (confirms upgrade command)', () => {
        expect(rhxResult.stdout).toContain('--roles');
      });
    });

    when('[t1] rhx upgrade (without args)', () => {
      const rhxResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['upgrade'],
          cwd: repo.path,
          logOnError: false,
        }),
      );
      const rhachetResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['upgrade'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('does NOT fail with "skill not found" error', () => {
        // if rhx upgrade went through skill path, it would fail with "not found"
        // since there's no skill called "upgrade"
        expect(rhxResult.stderr).not.toContain('not found');
        expect(rhxResult.stderr).not.toContain('skill');
      });

      then('rhx output matches rhachet upgrade output', () => {
        expect(rhxResult.stdout).toEqual(rhachetResult.stdout);
      });

      then('rhx exit code matches rhachet upgrade exit code', () => {
        expect(rhxResult.status).toEqual(rhachetResult.status);
      });
    });
  });

  // the `rhx init` bare-sigil alias: a front `+role`/`-role` on `rhx init`
  // expands to `run init --keys --hooks --roles <tokens>`, so a bare sigil
  // enrolls a ready-to-use role (symlink + keyrack manifest + brain hooks) in
  // one command. explicit flags, bare absolute names, and help must NOT expand.
  //
  // .markers = stdout `🔑 keyrack init` proves --keys was injected; stdout
  //   `🔭 search for linked roles with hooks` proves --hooks was injected.
  given('[case5] rhx init bare-sigil alias', () => {
    when('[t0] `rhx init +architect` (x1 fresh bare add)', () => {
      const testDir = genTempDir({ slug: 'rhx-init-alias-add' });
      beforeAll(() => setupRoleFixtureRepo({ dir: testDir }));

      const run = useThen('exits 0', () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['init', '+architect'],
          cwd: testDir,
        }),
      );

      then('architect is linked (routed to init, not the skill proxy)', () => {
        expect(run.status).toEqual(0);
        expect(isRoleLinked({ dir: testDir, role: 'architect' })).toEqual(true);
      });

      then('--keys was injected (keyrack init ran)', () => {
        expect(run.stdout).toContain('🔑 keyrack init');
      });

      then('--hooks was injected (hook sync ran)', () => {
        expect(run.stdout).toContain('search for linked roles with hooks');
      });

      then('the alias success-path summary matches snapshot', () => {
        // snap the deterministic incremental summary (+ the keys/hooks blocks the
        // alias adds) so the proxy's routed output is locked for drift detection
        // (rule.require.test-coverage-by-grain: contract-layer cli output + snap)
        expect(
          asSummaryBlock({ stdout: run.stdout, dir: testDir }),
        ).toMatchSnapshot();
      });
    });

    when('[t1] `rhx init --roles +architect` (x2 explicit, no inject)', () => {
      const testDir = genTempDir({ slug: 'rhx-init-alias-explicit' });
      beforeAll(() => setupRoleFixtureRepo({ dir: testDir }));

      const run = useThen('exits 0', () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['init', '--roles', '+architect'],
          cwd: testDir,
        }),
      );

      then('architect is linked', () => {
        expect(run.status).toEqual(0);
        expect(isRoleLinked({ dir: testDir, role: 'architect' })).toEqual(true);
      });

      then('--keys was NOT injected (no keyrack init)', () => {
        expect(run.stdout).not.toContain('🔑 keyrack init');
      });

      then('--hooks was NOT injected (no hook sync)', () => {
        expect(run.stdout).not.toContain('search for linked roles with hooks');
      });
    });

    // .note = the alias auto-injects --hooks, which errors when a linked role
    //   declares hooks for a brain the fixture has no adapter for. so these
    //   remove/multi cases use stub roles (architect, ergonomist) that declare
    //   no hooks — the alias route is what's under test, not brain adapters.
    when('[t2] `rhx init -ergonomist` (x3 remove bare sigil)', () => {
      const testDir = genTempDir({ slug: 'rhx-init-alias-remove' });
      beforeAll(() => {
        setupRoleFixtureRepo({ dir: testDir });
        invokeRhachetCliBinary({
          args: ['init', '--roles', 'architect', 'ergonomist'],
          cwd: testDir,
        });
      });

      const run = useThen('exits 0', () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['init', '-ergonomist'],
          cwd: testDir,
        }),
      );

      then('ergonomist is removed, architect untouched', () => {
        expect(run.status).toEqual(0);
        expect(isRoleLinked({ dir: testDir, role: 'ergonomist' })).toEqual(
          false,
        );
        expect(isRoleLinked({ dir: testDir, role: 'architect' })).toEqual(true);
      });

      then('the alias remove-path summary matches snapshot', () => {
        // the remove-sigil path also routes through the alias (+keys +hooks); snap
        // its deterministic summary so the proxy's remove output is drift-locked
        expect(
          asSummaryBlock({ stdout: run.stdout, dir: testDir }),
        ).toMatchSnapshot();
      });
    });

    when('[t3] `rhx init +architect -ergonomist` (x4 multi-sigil)', () => {
      const testDir = genTempDir({ slug: 'rhx-init-alias-multi' });
      beforeAll(() => {
        setupRoleFixtureRepo({ dir: testDir });
        invokeRhachetCliBinary({
          args: ['init', '--roles', 'ergonomist'],
          cwd: testDir,
        });
      });

      const run = useThen('exits 0', () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['init', '+architect', '-ergonomist'],
          cwd: testDir,
        }),
      );

      then('architect added, ergonomist removed', () => {
        expect(run.status).toEqual(0);
        expect(isRoleLinked({ dir: testDir, role: 'architect' })).toEqual(true);
        expect(isRoleLinked({ dir: testDir, role: 'ergonomist' })).toEqual(
          false,
        );
      });

      then('--keys and --hooks were injected once', () => {
        expect(run.stdout).toContain('🔑 keyrack init');
        expect(run.stdout).toContain('search for linked roles with hooks');
      });
    });

    when('[t4] `rhx init architect ergonomist` (x5 bare absolute names)', () => {
      const testDir = genTempDir({ slug: 'rhx-init-alias-absolute' });
      beforeAll(() => setupRoleFixtureRepo({ dir: testDir }));

      // bare absolute names carry no recognized flag, so the alias expands them
      // to `run init --keys --hooks --roles architect ergonomist` — the absolute
      // form that replaces the set. mode select is flag-driven: tokens-only tail
      // (bare names or sigils) => alias mode; a recognized flag => passthrough.
      const run = useThen('exits 0', () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['init', 'architect', 'ergonomist'],
          cwd: testDir,
        }),
      );

      then('both roles are linked (absolute set via the alias)', () => {
        expect(run.status).toEqual(0);
        expect(isRoleLinked({ dir: testDir, role: 'architect' })).toEqual(true);
        expect(isRoleLinked({ dir: testDir, role: 'ergonomist' })).toEqual(
          true,
        );
      });

      then('--keys and --hooks were injected (ready-to-use)', () => {
        expect(run.stdout).toContain('🔑 keyrack init');
        expect(run.stdout).toContain('search for linked roles with hooks');
      });
    });

    when('[t5] `rhx init --help` (x6 help not mistaken for sigil)', () => {
      const testDir = genTempDir({ slug: 'rhx-init-alias-help' });
      beforeAll(() => setupRoleFixtureRepo({ dir: testDir }));

      const runHelpLong = useThen('exits 0', () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['init', '--help'],
          cwd: testDir,
        }),
      );
      const runHelpShort = useThen('exits 0', () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['init', '-h'],
          cwd: testDir,
        }),
      );

      then('--help shows init usage, not a keyrack/hook side effect', () => {
        expect(runHelpLong.status).toEqual(0);
        expect(runHelpLong.stdout).toContain('--roles');
        expect(runHelpLong.stdout).not.toContain('🔑 keyrack init');
      });

      then('-h is not read as a remove-sigil', () => {
        expect(runHelpShort.status).toEqual(0);
        expect(runHelpShort.stdout).toContain('--roles');
        expect(runHelpShort.stdout).not.toContain('🔑 keyrack init');
      });

      then('the alias --help output matches snapshot', () => {
        // snap the passthrough help so the alias's help contract is drift-locked
        // (rule.require.contract-snapshot-exhaustiveness: the help variant of the
        // new `rhx init` contract). masked for the temp cwd only; help is static
        const masked = runHelpLong.stdout.split(testDir).join('$TESTDIR');
        expect(masked).toMatchSnapshot();
      });
    });

    // .note = the alias routes errors through unchanged; snap one negative path
    //   so the `rhx init` contract's error variant is drift-locked too
    //   (rule.require.contract-snapshot-exhaustiveness). the availableRoles list
    //   is version-fragile, so redact it, same as init.incremental case7.
    when('[t6] `rhx init +nonesuch` (x7 unknown-role error path)', () => {
      const testDir = genTempDir({ slug: 'rhx-init-alias-error' });
      beforeAll(() => setupRoleFixtureRepo({ dir: testDir }));

      const run = useThen('exits non-zero', () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['init', '+nonesuch'],
          cwd: testDir,
        }),
      );

      then('the alias surfaces the base not-found error', () => {
        expect(run.status).not.toEqual(0);
        expect(run.stderr).toContain('availableRoles');
      });

      then('the alias error block matches snapshot', () => {
        const masked = run.stderr
          .split(testDir)
          .join('$TESTDIR')
          .replace(
            /("availableRoles":\s*)\[[\s\S]*?\]/,
            '$1[ "$AVAILABLE_ROLES" ]',
          );
        expect(masked).toMatchSnapshot();
      });
    });
  });
});
