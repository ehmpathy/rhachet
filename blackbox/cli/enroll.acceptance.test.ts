import { UnexpectedCodePathError } from 'helpful-errors';
import { genTempDir, given, then, useThen, when } from 'test-fns';

import { execSync } from 'node:child_process';

import {
  asCloneSayHeadSnapshotSafe,
  expectCloneSaySuccessTree,
  setupEnrollFixture,
  setupRichStubBrainPath,
} from '@/blackbox/.test/infra/enrollCloneHarness';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { setupRoleFixtureRepo } from '@/blackbox/.test/infra/roleFixtureRepo';

import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

/**
 * .what = replaces any test-fns temp dir path with a stable `$TESTDIR` token
 * .why = some errors embed the resolved gitroot (a per-run temp path) as metadata.
 *        the subprocess `process.cwd()` canonicalizes symlinks, so it can diverge
 *        from the `dir` we passed. a regex over the whole temp-path shape masks it
 *        deterministically regardless of that divergence.
 */
const maskTempPaths = (input: string): string =>
  input.replace(/\/(?:private\/)?tmp\/test-fns\/[^\s"]+/g, '$TESTDIR');

/**
 * .what = writes a stub `claude` executable into a fresh bin dir and returns a
 *         PATH that finds it first
 * .why = enroll's terminal action spawns the brain CLI. to prove the POSITIVE
 *        delta (`-driver` drops driver) end-to-end without a live, interactive
 *        `claude`, we shadow `claude` with a no-op stub that exits 0. the config
 *        artifact is authored BEFORE the spawn, so a 0-exit stub lets the whole
 *        run complete deterministically and leaves the artifact to assert on.
 */
const setupStubBrainPath = (input: { dir: string }): string => {
  const binDir = join(input.dir, '.stub-bin');
  mkdirSync(binDir, { recursive: true });
  const stubPath = join(binDir, 'claude');
  writeFileSync(stubPath, '#!/usr/bin/env bash\nexit 0\n', 'utf-8');
  chmodSync(stubPath, 0o755);
  return `${binDir}:${process.env.PATH ?? ''}`;
};

/**
 * .what = seeds a `.claude/settings.json` whose SessionStart hooks are authored
 *         by distinct roles (driver, mechanic, architect)
 * .why = genBrainCliConfigArtifact retains only the hooks whose `author` names an
 *        ENROLLED role. so the authored `settings.enroll.*.json` is a direct,
 *        observable readout of the computed role set: drop driver ⇒ its hook is
 *        gone, keep mechanic/architect ⇒ their hooks remain.
 */
const seedRoleAuthoredHooks = (input: { dir: string }): void => {
  const settings = {
    hooks: {
      SessionStart: [
        {
          matcher: '*',
          hooks: [
            { type: 'command', command: 'true', author: 'repo=bhrain/role=driver' },
          ],
        },
        {
          matcher: '*',
          hooks: [
            {
              type: 'command',
              command: 'true',
              author: 'repo=ehmpathy/role=mechanic',
            },
          ],
        },
        {
          matcher: '*',
          hooks: [
            {
              type: 'command',
              command: 'true',
              author: 'repo=ehmpathy/role=architect',
            },
          ],
        },
      ],
    },
  };
  const claudeDir = join(input.dir, '.claude');
  mkdirSync(claudeDir, { recursive: true });
  writeFileSync(
    join(claudeDir, 'settings.json'),
    JSON.stringify(settings, null, 2) + '\n',
    'utf-8',
  );
};

/**
 * .what = reads the authored enrollment config artifact for a repo
 * .why = the positive-path proof asserts on the retained hook authors
 */
const readEnrollmentConfig = (input: { dir: string }): string => {
  const claudeDir = join(input.dir, '.claude');
  const file = readdirSync(claudeDir).find(
    (name) => name.startsWith('settings.enroll.') && name.endsWith('.local.json'),
  );
  if (!file)
    throw new UnexpectedCodePathError(
      'no enrollment config artifact was authored',
      {
        dir: claudeDir,
        searchedFilePattern: 'settings.enroll.*.local.json',
        hint: 'check the stub brain exited 0 and that enroll wrote the config before the spawn',
      },
    );
  return readFileSync(join(claudeDir, file), 'utf-8');
};

/**
 * .what = reads the append-only enrollment.jsonl roles log for the one enrolled
 *   actor, parsed to its event objects (latest last)
 * .why = the `--reason` audit motive is recorded to this log BEFORE the spawn, so a
 *   stub-exit-0 run lets the acceptance assert the WHY landed — a spawn-free readout
 *   of the audit trail, the same shape the config-artifact readout uses for roles
 */
const readEnrollmentLog = (input: {
  dir: string;
}): Array<{ roles: string[]; delta: string | null; reason: string | null }> => {
  const actorsRoot = join(input.dir, '.agent', '.actors');
  const actorDir = readdirSync(actorsRoot).find((name) =>
    name.startsWith('actor.via.hash='),
  );
  if (!actorDir)
    throw new UnexpectedCodePathError('no enrolled actor dir was authored', {
      actorsRoot,
      hint: 'check the stub brain exited 0 and that enroll findserted the actor before the spawn',
    });
  const logPath = join(actorsRoot, actorDir, 'roles', 'enrollment.jsonl');
  return readFileSync(logPath, 'utf-8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((raw) => JSON.parse(raw));
};

/**
 * .what = reads the raw enrollment.jsonl line(s) with the per-run wall-clock `at`
 *   stamp masked to a stable `$AT` token
 * .why = the `--reason` audit case snapshots the WHOLE persisted line (not just the
 *   reason field) to honor the suite's snapshot-paired discipline — a field assert
 *   cannot catch a widened/renamed schema, a drifted delta shape, or a lost
 *   `schemaVersion`. the `at` stamp is the one non-deterministic field, so it is
 *   masked; every other field is drift-locked in the pr diff
 */
const readEnrollmentLogRaw = (input: { dir: string }): string => {
  const actorsRoot = join(input.dir, '.agent', '.actors');
  const actorDir = readdirSync(actorsRoot).find((name) =>
    name.startsWith('actor.via.hash='),
  );
  if (!actorDir)
    throw new UnexpectedCodePathError('no enrolled actor dir was authored', {
      actorsRoot,
      hint: 'check the stub brain exited 0 and that enroll findserted the actor before the spawn',
    });
  const logPath = join(actorsRoot, actorDir, 'roles', 'enrollment.jsonl');
  return readFileSync(logPath, 'utf-8').replace(
    /"at":"[^"]+"/g,
    '"at":"$AT"',
  );
};

/**
 * .what = blackbox acceptance for `rhachet enroll <brain> --roles <spec>`
 * .why = the enroll `--roles` delta regression (`-driver` → `\u0000driver`) lived
 *        in the entry-layer argv path (getPreprocessedRoleArgv), which only the
 *        real binary exercises. these subprocess cases prove the sentinel is
 *        decoded end-to-end for enroll, in BOTH the comma and quoted-space forms,
 *        and that the shared `--roles` grammar validations surface.
 *
 * .note = enroll's terminal action spawns the brain CLI (an interactive `claude`
 *   with no `-p`), which would hang a subprocess. the error cases here exit at
 *   parse/validate BEFORE the spawn — fully deterministic, no brain. the POSITIVE
 *   removal (`-driver` drops driver) runs the full path via a stub `claude` on
 *   PATH (setupStubBrainPath) that exits 0, then asserts on the authored config
 *   artifact — a spawn-free readout of the computed role set.
 * .note = enroll's `--roles` is a single-string option (it forwards the rest of
 *   its args to the brain), so the space form arrives as ONE quoted arg
 *   (`--roles "-a +b"`); the comma form is `--roles -a,+b`. both flatten to the
 *   same tokens via getRoleDeltaTokens.
 */
describe('rhx enroll --roles (acceptance)', () => {
  // link a known role set so getLinkedRoleSlugs is non-empty for enroll
  const setupEnrollFixture = (dir: string): void => {
    setupRoleFixtureRepo({ dir });
    invokeRhachetCliBinary({
      args: ['init', '--roles', 'mechanic', 'architect', 'driver'],
      cwd: dir,
    });
  };

  given('[case1] a repo with mechanic + architect + driver linked', () => {
    const dir = genTempDir({ slug: 'enroll-decode' });
    beforeAll(() => setupEnrollFixture(dir));

    when('[t0] `enroll claude --roles -ghostrole` (the regression path)', () => {
      const run = useThen('exits non-zero', () =>
        invokeRhachetCliBinary({
          args: ['enroll', 'claude', '--roles', '-ghostrole'],
          cwd: dir,
          logOnError: false,
        }),
      );
      then('the sentinel is decoded — clean role name, NO null byte', () => {
        expect(run.status).not.toEqual(0);
        // the regression glued a NUL onto the role; the fix removes it
        expect(run.stderr).not.toContain('\u0000');
        expect(run.stderr.toLowerCase()).toContain('ghostrole');
        expect(run.stderr.toLowerCase()).toContain('not found');
      });
      then('the error output is locked to a snapshot', () => {
        expect(asSnapshotSafe(run.stderr)).toMatchSnapshot();
      });
    });

    when('[t0b] `enroll claude --roles -ghostrole --output json` (the machine channel)', () => {
      // the MACHINE counterpart of t0: the human `✋` snapshot above renders the
      // readable fix (the intended withCliOutputErrors contract, criteria uc.1); the
      // STRUCTURED verification lives HERE — a cron/supervisor reads the same failure
      // as a parseable {class,message,hint}, so the structured error shape is drift-
      // locked in the machine channel (usecase.11 addendum 4). the role-not-found path
      // thus owns BOTH its human AND its machine snapshot — exhaustive coverage per
      // rule.require.contract-snapshot-exhaustiveness (this is where the pre-`✋`
      // json debug data is preserved, NOT lost — it moved to --output json)
      const run = useThen('exits non-zero', () =>
        invokeRhachetCliBinary({
          args: ['enroll', 'claude', '--roles', '-ghostrole', '--output', 'json'],
          cwd: dir,
          logOnError: false,
        }),
      );

      then('the failure is a parseable structured error, not human prose', () => {
        expect(run.status).not.toEqual(0);
        // the human tree glyph must NOT appear — this is the machine channel
        expect(run.stderr).not.toContain('✋');
        // stderr parses as json the consumer branches on by field — the structured
        // {class,message,hint} the ergo/mech lenses feared was lost is captured here
        const shape = JSON.parse(run.stderr) as {
          class: string;
          message: string;
          hint: string | null;
        };
        expect(shape.class).toEqual('ConstraintError');
        expect(shape.message.toLowerCase()).toContain('ghostrole');
        expect(shape.message.toLowerCase()).toContain('not found');
        // the rolesLinked context survives — it rides the hint field (never dropped)
        expect(`${shape.hint}`.toLowerCase()).toContain('linked roles');
      });

      then('the structured error is locked to a snapshot', () => {
        expect(asSnapshotSafe(run.stderr)).toMatchSnapshot();
      });
    });

    when('[t1] `enroll claude --roles -ghostrole,+architect` (comma form)', () => {
      const run = useThen('exits non-zero', () =>
        invokeRhachetCliBinary({
          args: ['enroll', 'claude', '--roles', '-ghostrole,+architect'],
          cwd: dir,
          logOnError: false,
        }),
      );
      then('comma form reaches the shared grammar, decoded, no null byte', () => {
        expect(run.status).not.toEqual(0);
        expect(run.stderr).not.toContain('\u0000');
        expect(run.stderr.toLowerCase()).toContain('ghostrole');
        expect(run.stderr.toLowerCase()).toContain('not found');
      });
      then('the error output is locked to a snapshot', () => {
        expect(asSnapshotSafe(run.stderr)).toMatchSnapshot();
      });
    });

    when('[t2] `enroll claude --roles "-ghostrole +architect"` (quoted space form)', () => {
      const run = useThen('exits non-zero', () =>
        invokeRhachetCliBinary({
          args: ['enroll', 'claude', '--roles', '-ghostrole +architect'],
          cwd: dir,
          logOnError: false,
        }),
      );
      then('quoted-space form reaches the shared grammar, decoded, no null byte', () => {
        expect(run.status).not.toEqual(0);
        expect(run.stderr).not.toContain('\u0000');
        expect(run.stderr.toLowerCase()).toContain('ghostrole');
        expect(run.stderr.toLowerCase()).toContain('not found');
      });
      then('the error output is locked to a snapshot', () => {
        expect(asSnapshotSafe(run.stderr)).toMatchSnapshot();
      });
    });

    when('[t3] `enroll claude --roles +mechanic,-mechanic` (contradiction)', () => {
      const run = useThen('exits non-zero', () =>
        invokeRhachetCliBinary({
          args: ['enroll', 'claude', '--roles', '+mechanic,-mechanic'],
          cwd: dir,
          logOnError: false,
        }),
      );
      then('the shared grammar rejects add+remove of the same role', () => {
        expect(run.status).not.toEqual(0);
        expect(run.stderr).not.toContain('\u0000');
        expect(run.stderr.toLowerCase()).toContain('add and remove');
      });
      then('the error output is locked to a snapshot', () => {
        expect(asSnapshotSafe(run.stderr)).toMatchSnapshot();
      });
    });

    when('[t4] `enroll claude --roles mechanic,+architect` (mixed call)', () => {
      const run = useThen('exits non-zero', () =>
        invokeRhachetCliBinary({
          args: ['enroll', 'claude', '--roles', 'mechanic,+architect'],
          cwd: dir,
          logOnError: false,
        }),
      );
      then('the shared grammar rejects a mix of absolute and incremental', () => {
        expect(run.status).not.toEqual(0);
        expect(run.stderr).not.toContain('\u0000');
        expect(run.stderr.toLowerCase()).toContain('mix');
      });
      then('the error output is locked to a snapshot', () => {
        expect(asSnapshotSafe(run.stderr)).toMatchSnapshot();
      });
    });

    when('[t5] `enroll claude --roles +` (empty role after sigil)', () => {
      const run = useThen('exits non-zero', () =>
        invokeRhachetCliBinary({
          args: ['enroll', 'claude', '--roles', '+'],
          cwd: dir,
          logOnError: false,
        }),
      );
      then('the shared grammar rejects a bare sigil with an empty role', () => {
        expect(run.status).not.toEqual(0);
        expect(run.stderr).not.toContain('\u0000');
        expect(run.stderr.toLowerCase()).toContain('empty');
      });
      then('the error output is locked to a snapshot', () => {
        expect(asSnapshotSafe(run.stderr)).toMatchSnapshot();
      });
    });

    when('[t6] `enroll claude --roles ""` (empty spec)', () => {
      const run = useThen('exits non-zero', () =>
        invokeRhachetCliBinary({
          args: ['enroll', 'claude', '--roles', ''],
          cwd: dir,
          logOnError: false,
        }),
      );
      then('the shared grammar rejects an empty spec (no roles specified)', () => {
        expect(run.status).not.toEqual(0);
        expect(run.stderr).not.toContain('\u0000');
        expect(run.stderr.toLowerCase()).toContain('no roles specified');
      });
      then('the error output is locked to a snapshot', () => {
        expect(asSnapshotSafe(run.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case2] the POSITIVE regression path — `-driver` drops driver', () => {
    // this is the exact wish: `enroll claude --roles -driver` must boot the
    // defaults MINUS driver. we run the full path (stub `claude` exits 0) and
    // read the authored config artifact as a spawn-free readout of the role set.
    const dir = genTempDir({ slug: 'enroll-positive-driver' });
    let stubPath: string;
    beforeAll(() => {
      setupEnrollFixture(dir);
      seedRoleAuthoredHooks({ dir });
      stubPath = setupStubBrainPath({ dir });
    });

    when('[t0] `enroll claude --roles -driver` (known role, delta subtract)', () => {
      const run = useThen('exits 0 (valid spec, reaches the stub brain)', () =>
        invokeRhachetCliBinary({
          args: ['enroll', 'claude', '--roles', '-driver'],
          cwd: dir,
          env: { PATH: stubPath },
          logOnError: false,
        }),
      );

      then('no null byte leaks and no "not found" — driver IS a known role', () => {
        expect(run.status).toEqual(0);
        expect(run.stderr).not.toContain('\u0000');
        expect(run.stderr.toLowerCase()).not.toContain('not found');
      });

      then('the authored config drops driver but keeps the other roles', () => {
        const config = readEnrollmentConfig({ dir });
        // driver's hook is filtered out (delta subtract honored)
        expect(config).not.toContain('role=driver');
        // the rest of the defaults survive
        expect(config).toContain('role=mechanic');
        expect(config).toContain('role=architect');
      });

      then('the authored config body is locked to a snapshot', () => {
        // the generated settings.enroll.$hash.local.json IS the wish's real
        // output. snapshot the full filtered-hook set so the retained role set
        // (sort order, retained permissions, dropped driver hook) is drift-locked
        // in the pr diff — the toContain checks above cannot catch a widened
        // filter that keeps too much
        expect(
          asSnapshotSafe(readEnrollmentConfig({ dir })),
        ).toMatchSnapshot();
      });

      then('the success output is locked to a snapshot', () => {
        // the stub brain emits no output; this locks that the success path leaks
        // no unexpected rhachet output to stderr before the spawn
        expect(asSnapshotSafe(run.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case2b] the PRIMARY journey — bare `enroll claude` keeps the DEFAULT roleset', () => {
    // the wish's most common hot path: `rhx enroll claude` with NO --roles. it must
    // boot the repo's FULL default roleset (mechanic + architect + driver) unchanged.
    // the primary user experience owed a snapshot per rule.require.acceptance-journey-
    // coverage — every user-faced contract variant, above all the default one, needs
    // a locked snapshot so a regression in the default behavior cannot ship undetected
    const dir = genTempDir({ slug: 'enroll-default-roles' });
    let stubPath: string;
    beforeAll(() => {
      setupEnrollFixture(dir);
      seedRoleAuthoredHooks({ dir });
      stubPath = setupStubBrainPath({ dir });
    });

    when('[t0] `enroll claude` (no --roles → the default roleset)', () => {
      const run = useThen('exits 0 (valid bare path, reaches the stub brain)', () =>
        invokeRhachetCliBinary({
          args: ['enroll', 'claude'],
          cwd: dir,
          env: { PATH: stubPath },
          logOnError: false,
        }),
      );

      then('no null byte leaks and no "not found" — the bare path is clean', () => {
        expect(run.status).toEqual(0);
        expect(run.stderr).not.toContain('\u0000');
        expect(run.stderr.toLowerCase()).not.toContain('not found');
      });

      then('the authored config keeps ALL default roles (none dropped, none added)', () => {
        const config = readEnrollmentConfig({ dir });
        expect(config).toContain('role=mechanic');
        expect(config).toContain('role=architect');
        expect(config).toContain('role=driver');
      });

      then('the authored default-roleset config body is locked to a snapshot', () => {
        // the default-roleset config IS the primary user experience — snapshot the
        // full authored hook set so a regression that silently drops OR adds a default
        // role surfaces in the pr diff (the toContain checks above cannot catch a
        // widened set that keeps too much)
        expect(
          asSnapshotSafe(readEnrollmentConfig({ dir })),
        ).toMatchSnapshot();
      });

      then('the success output is locked to a snapshot', () => {
        // the stub brain emits no output; this locks that the bare default-roles
        // success path leaks no unexpected rhachet output before the spawn
        expect(asSnapshotSafe(run.stderr)).toMatchSnapshot();
      });
    });

    when('[t1] the same bare enroll with --output json (the machine handoff)', () => {
      // the MACHINE twin of the tree success above — a supervisor that spawns the bare
      // enroll with --output json reads a parseable handoff off stdout. this path runs
      // via spawnSync (NO tty), which is precisely the supervisor's case: it is the
      // DETACHED variant, a peer of the attended pty handoff (case2c), and each owes its
      // own snapshot per rule.require.contract-snapshot-exhaustiveness
      const run = useThen('exits 0 (bare enroll, machine handoff)', () =>
        invokeRhachetCliBinary({
          args: ['enroll', 'claude', '--output', 'json'],
          cwd: dir,
          env: { PATH: stubPath },
          logOnError: false,
        }),
      );

      then('a parseable handoff carries the serial + a NULL slug', () => {
        expect(run.status).toEqual(0);
        const parsed = JSON.parse(run.stdout) as {
          outcome: string;
          serial: string;
          slug: string | null;
          socketEligible: boolean;
        };
        expect(parsed.outcome).toEqual('baked');
        expect(parsed.serial).toMatch(/^[0-9a-f-]{36}$/);
        expect(parsed.slug).toEqual(null);
        // 🔴 REACHABLE, though no tty was present. this line once asserted `false`, with
        //   the comment "no tty under spawnSync → no socket stands up" — it encoded the
        //   defect as the contract. a tty decides how a clone is WATCHED, never whether
        //   it can be REACHED, so a supervisor (which never has one) would have been
        //   handed a clone it could not `say` to — the exact case the flag exists for
        //   (`define.invariant.clone-attendance-is-a-mode-never-a-reach`)
        expect(parsed.socketEligible).toEqual(true);
      });

      then('the detached machine handoff shape is locked (machine contract)', () => {
        // the serial (a uuid) is masked; outcome/slug/socketEligible stay stable — this
        // locks the DETACHED handoff, a peer of the attended pty variant
        expect(asSnapshotSafe(run.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case3] positive replace — bare `mechanic` keeps ONLY mechanic', () => {
    const dir = genTempDir({ slug: 'enroll-positive-replace' });
    let stubPath: string;
    beforeAll(() => {
      setupEnrollFixture(dir);
      seedRoleAuthoredHooks({ dir });
      stubPath = setupStubBrainPath({ dir });
    });

    when('[t0] `enroll claude --roles mechanic` (replace mode)', () => {
      const run = useThen('exits 0 (valid spec, reaches the stub brain)', () =>
        invokeRhachetCliBinary({
          args: ['enroll', 'claude', '--roles', 'mechanic'],
          cwd: dir,
          env: { PATH: stubPath },
          logOnError: false,
        }),
      );

      then('the authored config keeps ONLY mechanic — driver + architect gone', () => {
        expect(run.status).toEqual(0);
        const config = readEnrollmentConfig({ dir });
        expect(config).toContain('role=mechanic');
        expect(config).not.toContain('role=driver');
        expect(config).not.toContain('role=architect');
      });

      then('the authored config body is locked to a snapshot', () => {
        // lock the replace-path retained hook set in the pr diff
        expect(
          asSnapshotSafe(readEnrollmentConfig({ dir })),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case4] positive add — `+architect` keeps the default set', () => {
    const dir = genTempDir({ slug: 'enroll-positive-add' });
    let stubPath: string;
    beforeAll(() => {
      setupEnrollFixture(dir);
      seedRoleAuthoredHooks({ dir });
      stubPath = setupStubBrainPath({ dir });
    });

    when('[t0] `enroll claude --roles +architect` (delta add)', () => {
      const run = useThen('exits 0 (valid spec, reaches the stub brain)', () =>
        invokeRhachetCliBinary({
          args: ['enroll', 'claude', '--roles', '+architect'],
          cwd: dir,
          env: { PATH: stubPath },
          logOnError: false,
        }),
      );

      then('the add path runs clean and the full default set is kept', () => {
        expect(run.status).toEqual(0);
        expect(run.stderr).not.toContain('\u0000');
        const config = readEnrollmentConfig({ dir });
        expect(config).toContain('role=mechanic');
        expect(config).toContain('role=architect');
        expect(config).toContain('role=driver');
      });

      then('the authored config body is locked to a snapshot', () => {
        // lock the full retained hook set for the add path in the pr diff
        expect(
          asSnapshotSafe(readEnrollmentConfig({ dir })),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case5] positive mixed — `-driver,+architect` (comma) drops driver', () => {
    const dir = genTempDir({ slug: 'enroll-positive-mixed-comma' });
    let stubPath: string;
    beforeAll(() => {
      setupEnrollFixture(dir);
      seedRoleAuthoredHooks({ dir });
      stubPath = setupStubBrainPath({ dir });
    });

    when('[t0] `enroll claude --roles -driver,+architect` (comma mixed)', () => {
      const run = useThen('exits 0 (valid spec, reaches the stub brain)', () =>
        invokeRhachetCliBinary({
          args: ['enroll', 'claude', '--roles', '-driver,+architect'],
          cwd: dir,
          env: { PATH: stubPath },
          logOnError: false,
        }),
      );

      then('the comma mixed spec drops driver and keeps mechanic + architect', () => {
        expect(run.status).toEqual(0);
        expect(run.stderr).not.toContain('\u0000');
        const config = readEnrollmentConfig({ dir });
        expect(config).not.toContain('role=driver');
        expect(config).toContain('role=mechanic');
        expect(config).toContain('role=architect');
      });

      then('the authored config body is locked to a snapshot', () => {
        // lock the comma-form retained hook set in the pr diff
        expect(
          asSnapshotSafe(readEnrollmentConfig({ dir })),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case6] positive mixed — `"-driver +architect"` (space) drops driver', () => {
    const dir = genTempDir({ slug: 'enroll-positive-mixed-space' });
    let stubPath: string;
    beforeAll(() => {
      setupEnrollFixture(dir);
      seedRoleAuthoredHooks({ dir });
      stubPath = setupStubBrainPath({ dir });
    });

    when('[t0] `enroll claude --roles "-driver +architect"` (quoted space mixed)', () => {
      const run = useThen('exits 0 (valid spec, reaches the stub brain)', () =>
        invokeRhachetCliBinary({
          args: ['enroll', 'claude', '--roles', '-driver +architect'],
          cwd: dir,
          env: { PATH: stubPath },
          logOnError: false,
        }),
      );

      then('the space mixed spec drops driver and keeps mechanic + architect', () => {
        expect(run.status).toEqual(0);
        expect(run.stderr).not.toContain('\u0000');
        const config = readEnrollmentConfig({ dir });
        expect(config).not.toContain('role=driver');
        expect(config).toContain('role=mechanic');
        expect(config).toContain('role=architect');
      });

      then('the authored config body is locked to a snapshot', () => {
        // lock the space-form retained hook set in the pr diff
        expect(
          asSnapshotSafe(readEnrollmentConfig({ dir })),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case7] the `-r` short alias runs the full path end-to-end', () => {
    // the `-r` sentinel fix (getPreprocessedRoleArgv) was proven only at the unit
    // level; this subprocess case closes the exact blind spot that let the ORIGINAL
    // bug slip — the real binary driven through commander's argv parse.
    const dir = genTempDir({ slug: 'enroll-shortflag-r' });
    let stubPath: string;
    beforeAll(() => {
      setupEnrollFixture(dir);
      seedRoleAuthoredHooks({ dir });
      stubPath = setupStubBrainPath({ dir });
    });

    when('[t0] `enroll claude -r -driver` (short alias + delta subtract)', () => {
      const run = useThen('exits 0 (valid spec via `-r`, reaches the stub brain)', () =>
        invokeRhachetCliBinary({
          args: ['enroll', 'claude', '-r', '-driver'],
          cwd: dir,
          env: { PATH: stubPath },
          logOnError: false,
        }),
      );

      then('the `-r` alias decodes `-driver` cleanly — no null byte, driver dropped', () => {
        expect(run.status).toEqual(0);
        expect(run.stderr).not.toContain('\u0000');
        expect(run.stderr.toLowerCase()).not.toContain('not found');
        const config = readEnrollmentConfig({ dir });
        expect(config).not.toContain('role=driver');
        expect(config).toContain('role=mechanic');
        expect(config).toContain('role=architect');
      });

      then('the authored config body is locked to a snapshot', () => {
        // case7 is the highest-value regression clamp (`-r` short alias through
        // the real argv preprocessor — the exact seam the bug slipped through).
        // lock its authored hook set so the `-r` delta result is drift-proof
        expect(
          asSnapshotSafe(readEnrollmentConfig({ dir })),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case8] a repo with no .agent/ directory', () => {
    const dir = genTempDir({ slug: 'enroll-no-agent' });
    // git-init so the binary passes its repo-root check and reaches the .agent/ guard
    beforeAll(() => execSync('git init', { cwd: dir, stdio: 'pipe' }));

    when('[t0] `enroll claude --roles mechanic` with no .agent/', () => {
      const run = useThen('exits non-zero', () =>
        invokeRhachetCliBinary({
          args: ['enroll', 'claude', '--roles', 'mechanic'],
          cwd: dir,
          logOnError: false,
        }),
      );
      then('errors that no .agent/ was found', () => {
        expect(run.status).not.toEqual(0);
        expect(run.stderr).not.toContain('\u0000');
        expect(run.stderr.toLowerCase()).toContain('no .agent/');
      });
      then('the error output is locked to a snapshot', () => {
        // mask the temp gitroot (varies per run) — the error embeds it as metadata
        expect(maskTempPaths(run.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case9] a repo with an empty .agent/ (no roles linked)', () => {
    const dir = genTempDir({ slug: 'enroll-empty-agent' });
    beforeAll(() => {
      // git-init so the binary reaches the roles guard, then an empty .agent/
      execSync('git init', { cwd: dir, stdio: 'pipe' });
      mkdirSync(join(dir, '.agent'), { recursive: true });
    });

    when('[t0] `enroll claude --roles mechanic` with empty .agent/', () => {
      const run = useThen('exits non-zero', () =>
        invokeRhachetCliBinary({
          args: ['enroll', 'claude', '--roles', 'mechanic'],
          cwd: dir,
          logOnError: false,
        }),
      );
      then('errors that no roles were found', () => {
        expect(run.status).not.toEqual(0);
        expect(run.stderr).not.toContain('\u0000');
        expect(run.stderr.toLowerCase()).toContain('no roles found');
      });
      then('the error output is locked to a snapshot', () => {
        // mask the temp gitroot (varies per run) — the error embeds it as metadata
        expect(maskTempPaths(run.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case10] pre-spawn validation errors on a linked repo', () => {
    const dir = genTempDir({ slug: 'enroll-prespawn-errors' });
    beforeAll(() => setupEnrollFixture(dir));

    when('[t0] `enroll claude --roles mechnic` (replace-mode typo)', () => {
      const run = useThen('exits non-zero', () =>
        invokeRhachetCliBinary({
          args: ['enroll', 'claude', '--roles', 'mechnic'],
          cwd: dir,
          logOnError: false,
        }),
      );
      then('the replace-mode unknown role surfaces a did-you-mean suggestion', () => {
        expect(run.status).not.toEqual(0);
        expect(run.stderr).not.toContain('\u0000');
        expect(run.stderr.toLowerCase()).toContain('not found');
        expect(run.stderr.toLowerCase()).toContain("did you mean 'mechanic'");
      });
      then('the error output is locked to a snapshot', () => {
        expect(asSnapshotSafe(run.stderr)).toMatchSnapshot();
      });
    });

    when('[t1] `enroll openai --roles mechanic` (unsupported brain)', () => {
      const run = useThen('exits non-zero', () =>
        invokeRhachetCliBinary({
          args: ['enroll', 'openai', '--roles', 'mechanic'],
          cwd: dir,
          logOnError: false,
        }),
      );
      then('the unsupported brain is rejected before any spawn', () => {
        expect(run.status).not.toEqual(0);
        expect(run.stderr).not.toContain('\u0000');
        expect(run.stderr.toLowerCase()).toContain('not supported');
      });
      then('the error output is locked to a snapshot', () => {
        expect(asSnapshotSafe(run.stderr)).toMatchSnapshot();
      });
    });

    when('[t2] `enroll claude --brain codex` (brain conflict)', () => {
      // --roles is now OPTIONAL (absent => the default roleset), so the old
      // "required --roles" error no longer exists. the pre-spawn negative this
      // slot now proves is the three-form brain conflict: a positional brain and
      // a `--brain` flag that disagree fail loud, and name BOTH values.
      const run = useThen('exits non-zero', () =>
        invokeRhachetCliBinary({
          args: ['enroll', 'claude', '--brain', 'codex'],
          cwd: dir,
          logOnError: false,
        }),
      );
      then('the conflict fails loud and shows both brain values', () => {
        expect(run.status).not.toEqual(0);
        expect(run.stderr).not.toContain('\u0000');
        expect(run.stderr.toLowerCase()).toContain('brain conflict');
        expect(run.stderr).toContain('claude');
        expect(run.stderr).toContain('codex');
      });
      then('the error output is locked to a snapshot', () => {
        expect(asSnapshotSafe(run.stderr)).toMatchSnapshot();
      });
    });

    when('[t3] `enroll claude --roles -driver -architect` (unquoted space, 2 deltas)', () => {
      // enroll's `--roles` is single-valued, so a SECOND space-separated role is
      // left raw and commander would mangle it into a garbage spec. instead of a
      // misleading "role not found", enroll now fails loud and points at the comma
      // form. this is the friction hazard the space form hides for enroll alone.
      const run = useThen('exits non-zero', () =>
        invokeRhachetCliBinary({
          args: ['enroll', 'claude', '--roles', '-driver', '-architect'],
          cwd: dir,
          logOnError: false,
        }),
      );
      then('enroll fails loud — the extra role and the comma-form fix are shown', () => {
        expect(run.status).not.toEqual(0);
        // no sentinel leak — neither the raw NUL control char NOR its json-escaped
        // TEXT form (`\u0000`, which `JSON.stringify` emits into error metadata).
        // the raw-char check alone is blind to the text form (the real leak surface).
        expect(run.stderr).not.toContain('\u0000');
        expect(run.stderr).not.toContain('\\u0000');
        // the decoded delta is shown to the human, not the encoded form
        expect(run.stderr).toContain('-driver');
        expect(run.stderr).toContain('-architect');
        expect(run.stderr.toLowerCase()).toContain('single spec');
        expect(run.stderr).toContain('--roles -driver,-reviewer');
      });
      then('the error output is locked to a snapshot', () => {
        expect(asSnapshotSafe(run.stderr)).toMatchSnapshot();
      });
    });

    when('[t4] `enroll claude --as @:<uuid>` (an unreachable uuid-shaped handle)', () => {
      // a uuid-shaped --as parses as a SERIAL on every reach path (say/get/list), so
      // a clone named this way would be permanently unreachable by its own address.
      // enroll must reject it at mint time, not let it fail loud only when a caller
      // tries to reach it. isSafeCloneSlug once accepted a lowercase uuid, so the
      // dead end shipped silently
      const run = useThen('exits non-zero', () =>
        invokeRhachetCliBinary({
          args: [
            'enroll',
            'claude',
            '--as',
            '@:12345678-1234-1234-1234-123456789abc',
          ],
          cwd: dir,
          logOnError: false,
        }),
      );
      then('the uuid-shaped --as is rejected pre-spawn, the fix named', () => {
        expect(run.status).not.toEqual(0);
        expect(run.stderr).not.toContain('\u0000');
        expect(run.stderr.toLowerCase()).toContain('uuid-shaped');
        expect(run.stderr.toLowerCase()).toContain('unreachable');
        // the fix names a non-uuid handle
        expect(run.stderr).toContain('--as @:driver');
      });
      then('the error output is locked to a snapshot', () => {
        expect(asSnapshotSafe(run.stderr)).toMatchSnapshot();
      });
    });

    when('[t4b] `enroll claude --as @:<unsafe>` (an unsafe-charset handle)', () => {
      // a slug with uppercase / space / punctuation is rejected at mint time — a
      // handle must be a safe path segment (lowercase, digits, - . _), so it can
      // never traverse or collide. acceptance parity with the uuid case (t4), so
      // BOTH `--as` rejection branches are locked at the blackbox grain
      const runUnsafe = useThen('exits non-zero', () =>
        invokeRhachetCliBinary({
          args: ['enroll', 'claude', '--as', '@:Bad Slug!'],
          cwd: dir,
          logOnError: false,
        }),
      );
      then('the unsafe --as is rejected pre-spawn, the safe charset named', () => {
        expect(runUnsafe.status).not.toEqual(0);
        expect(runUnsafe.stderr).not.toContain('\u0000');
        expect(runUnsafe.stderr.toLowerCase()).toContain('not a safe handle');
        expect(runUnsafe.stderr.toLowerCase()).toContain('lowercase letters');
        expect(runUnsafe.stderr).toContain('--as @:driver');
      });
      then('the error output is locked to a snapshot', () => {
        expect(asSnapshotSafe(runUnsafe.stderr)).toMatchSnapshot();
      });
    });

    when('[t4c] `enroll claude --as <no-marker>` (a dropped @: sigil)', () => {
      // a handle without the `@:` clone-grain marker is rejected with a did-you-mean
      // that names the correct form — the clone grain is never guessed. the
      // acceptance twin of the integration-grade did-you-mean coverage
      const runNoMarker = useThen('exits non-zero', () =>
        invokeRhachetCliBinary({
          args: ['enroll', 'claude', '--as', 'driver'],
          cwd: dir,
          logOnError: false,
        }),
      );
      then('the marker-less --as is rejected with a did-you-mean', () => {
        expect(runNoMarker.status).not.toEqual(0);
        expect(runNoMarker.stderr.toLowerCase()).toContain('not a clone address');
        expect(runNoMarker.stderr).toContain("did you mean '@:driver'");
      });
      then('the error output is locked to a snapshot', () => {
        expect(asSnapshotSafe(runNoMarker.stderr)).toMatchSnapshot();
      });
    });

    when('[t5] `enroll claude --brain codex --output json` (failing enroll, machine channel)', () => {
      // criteria usecase.11 addendum4, second scenario: a supervisor/cron that
      // spawns enroll with --output json must, on FAILURE, get a machine-parseable
      // STRUCTURED error (not human prose) with a non-zero exit — so it branches on
      // error fields the same way it branches on the talk verbs' errors. the brain
      // conflict is the cleanest failing enroll: it throws a ConstraintError at
      // parse (pre-spawn), which withCliOutputErrors renders as json on stderr.
      const run = useThen('exits non-zero', () =>
        invokeRhachetCliBinary({
          args: ['enroll', 'claude', '--brain', 'codex', '--output', 'json'],
          cwd: dir,
          logOnError: false,
        }),
      );

      then('the failure is a parseable structured error, not human prose', () => {
        expect(run.status).not.toEqual(0);
        expect(run.stderr).not.toContain('\u0000');
        // the human tree glyph must NOT appear — this is the machine channel
        expect(run.stderr).not.toContain('✋');
        // stderr parses as json the consumer branches on by field
        const shape = JSON.parse(run.stderr) as {
          class: string;
          message: string;
          hint: string | null;
        };
        expect(shape.class).toEqual('ConstraintError');
        expect(shape.message.toLowerCase()).toContain('brain conflict');
        expect(shape.message).toContain('claude');
        expect(shape.message).toContain('codex');
      });

      then('the structured error is locked to a snapshot', () => {
        expect(asSnapshotSafe(run.stderr)).toMatchSnapshot();
      });
    });
  });
});

/**
 * .what = blackbox acceptance for the clone-enroll DEPTH BUDGET
 *
 * .why = `rhx enroll` is now reachable by a clone (the `attended` axis), so a chain
 *   of clones could otherwise grow without bound. `CLONE_ENROLL_DEPTH_MAX` caps it at
 *   one hop: a human's clone may enroll a peer; that peer may enroll no one.
 *
 * ⚠️ the budget is carried in the CHILD ENV (`RHACHET_CLONE_DEPTH`), never on disk or
 *   in a flag — so the only honest surface test is one that sets that env on the
 *   subprocess, which is exactly what the harness's `env` seam is for.
 *
 * ⚠️ the guard fires BEFORE any clone dir or child process exists, so an over-budget
 *   enroll leaves no half-formed chain behind. that is why `[case1]` needs no stub
 *   brain on PATH — no child is ever spawned.
 *
 * ⚠️ the dogfood, with its reach stated (`rule.require.clamp-edge-cases`):
 *
 *   | mutation of the guard              | this file |
 *   |------------------------------------|-----------|
 *   | the `depth > MAX` check is dropped  | 🔴 `[case1]` red — a depth-2 enroll is admitted |
 *   | `asCloneEnrollDepth` drops its `+1` | 🔴 `[case1]` red — the caller's depth is read as the child's |
 *   | the budget is cut to 0              | 🔴 `[case2]` red — a clone can enroll no peer at all |
 *   | restored                            | 🟢 both green |
 */
describe('rhx enroll depth budget (acceptance)', () => {
  const setupDepthFixture = (dir: string): void => {
    setupRoleFixtureRepo({ dir });
    invokeRhachetCliBinary({
      args: ['init', '--roles', 'mechanic', 'architect', 'driver'],
      cwd: dir,
    });
  };

  given('[case1] a linked repo, the caller is a clone at depth 1', () => {
    const dir = genTempDir({ slug: 'enroll-depth-spent' });
    beforeAll(() => setupDepthFixture(dir));

    when('[t0] it enrolls a peer — which would sit at depth 2', () => {
      const run = useThen('it exits non-zero', () =>
        invokeRhachetCliBinary({
          args: ['enroll', 'claude', '--output', 'json'],
          cwd: dir,
          logOnError: false,
          env: { RHACHET_CLONE_DEPTH: '1' },
          // ⚠️ a cap on the guard: a REFUSED enroll returns in milliseconds, so this
          //   never bites on the green path. it bites when the guard is BROKEN — the
          //   enroll then reaches a real brain spawn and blocks forever, which would
          //   turn the clamp's red into a stalled suite (`rule.forbid.failhide`: a
          //   hang reports no verdict; a timed-out result carries its own output)
          timeoutMs: 20_000,
        }),
      );

      then('it is refused as a CONSTRAINT — the caller amends, exit 2', () => {
        expect(run.status).toEqual(2);
        const shape = JSON.parse(run.stderr) as {
          class: string;
          message: string;
          hint: string | null;
        };
        expect(shape.class).toEqual('ConstraintError');
        expect(shape.message).toContain('depth budget spent');
      });

      then('the refusal names who CAN stand the clone up', () => {
        const shape = JSON.parse(run.stderr) as { hint: string | null };
        expect(shape.hint).toContain('a human');
      });

      then('the structured error is locked to a snapshot', () => {
        expect(asSnapshotSafe(run.stderr)).toMatchSnapshot();
      });
    });

    /**
     * 🚨 .what = the SAME refusal, rendered for a HUMAN — no `--output json`
     *
     * 🔴 .why it is its own case = `[t0]` asserts the MACHINE projection only, and the two
     *   renders share no code past the throw: `asCliErrorJson` builds the json, and
     *   `asCliErrorFrame` builds the human frame on top of it (glyph, class prefix, a
     *   hint-first metadata block). so every property a human actually reads — the `✋`
     *   glyph, the unabridged `ConstraintError:` prefix, the hint promoted above the bulk
     *   — was unsnapped, on the one channel a human sees.
     *
     * ⇒ a regression in the frame (a dropped glyph, an abridged class, a hint buried under
     *   `depthRequested`) would ship green: `[t0]` reads json and never looks at stderr's
     *   human shape. this is the clamp that reads it.
     *
     * .note = the frame is fully deterministic here — no serial, no temp path, no clock —
     *   so it earns a FULL snapshot rather than a masked head. that is what makes it a
     *   vibecheck a reviewer can read without a run (`rule.require.snapshots`).
     */
    when('[t1] the same enroll is refused in TREE mode, for a human', () => {
      const run = useThen('it exits non-zero', () =>
        invokeRhachetCliBinary({
          args: ['enroll', 'claude'],
          cwd: dir,
          logOnError: false,
          env: { RHACHET_CLONE_DEPTH: '1' },
          // the same cap, for the same reason as [t0]
          timeoutMs: 20_000,
        }),
      );

      then('it is refused as a CONSTRAINT — exit 2', () => {
        expect(run.status).toEqual(2);
      });

      then('the human frame carries the glyph + the UNABRIDGED class', () => {
        // ⚠️ asserted on top of the snapshot, never instead of it: a resnap accepts
        //   whatever it is handed, so the properties that must NEVER change are stated
        //   here where a resnap cannot paper over them
        //   (`rule.require.unabridged-error-prefix`)
        expect(run.stderr).toContain(
          '✋ ConstraintError: clone enroll depth budget spent',
        );
      });

      then('the hint sits ABOVE the bulk — the fix reads first', () => {
        // `asMetadataHintFirst` promotes `hint`; a regression that dropped it would bury
        // the one sentence that names the fix under `depthRequested` / `depthMax`
        const out = run.stderr;
        expect(out.indexOf('"hint"')).toBeGreaterThan(-1);
        expect(out.indexOf('"hint"')).toBeLessThan(
          out.indexOf('"depthRequested"'),
        );
      });

      then('the refusal names who CAN stand the clone up', () => {
        expect(run.stderr).toContain('a human');
      });

      then('the TREE render is locked to a snapshot', () => {
        expect(asSnapshotSafe(run.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case2] a linked repo, the caller is a clone at depth 0', () => {
    // 🚨 the row the budget exists to PERMIT. a cap that refused this would make
    //   `rhx enroll` unreachable by a clone at all — the very defect the `attended`
    //   axis repaired — so the permit case carries as much weight as the refusal
    const dir = genTempDir({ slug: 'enroll-depth-left' });
    let stubPath: string;
    beforeAll(() => {
      setupDepthFixture(dir);
      stubPath = setupStubBrainPath({ dir });
    });

    when('[t0] it enrolls a peer — which would sit at depth 1', () => {
      const run = useThen('it runs to completion', () =>
        invokeRhachetCliBinary({
          args: ['enroll', 'claude'],
          cwd: dir,
          logOnError: false,
          env: { RHACHET_CLONE_DEPTH: '0', PATH: stubPath },
        }),
      );

      then('the budget does NOT refuse it', () => {
        expect(run.stderr).not.toContain('depth budget spent');
        expect(run.status).toEqual(0);
      });
    });
  });

  /**
   * .what = the depth a DETACHED host mints its clone at
   * .why =
   *   - a no-tty enroll takes the `async` mode, so the clone is not stood up by the
   *     caller at all — the caller re-execs itself as a detached host, and THAT process
   *     re-derives the depth from its own inherited env (`genCloneEnrollDetached`)
   *   - 🔴 so the budget crosses a process seam, and its only carrier is one inherited
   *     env key. strip `RHACHET_CLONE_DEPTH` from the host's env and it reads 0, so a
   *     depth-0 clone's `--async` peer is minted at depth 0 too — every detached link
   *     resets the counter, and the chain `CLONE_ENROLL_DEPTH_MAX` exists to bound
   *     becomes unbounded
   *   - case1/case2 cannot catch that: both grade the CALLER's refusal, which fires
   *     before the detach. this grades what the HOST handed the child
   *
   * .note = the child's env is unobservable from outside — the pty owns its stdio, and
   *   `clone get` returns a classification rather than screen content. so the stub brain
   *   reports its own clone-identity env to `$CLAUDE_CONFIG_DIR/stub.env.json`, which is
   *   the one instrument that can answer this at all
   *
   * .note = DOGFOOD, the mutation that makes it bite:
   *   | mutation | result |
   *   |---|---|
   *   | `genCloneEnrollDetached` spawns with the depth key stripped | 🔴 red — depth reads `'0'`, never `'1'` |
   */
  given('[case3] a clone at depth 0 enrolls a peer with NO tty', () => {
    const dir = genTempDir({ slug: 'enroll-depth-detached' });
    const configDir = genTempDir({ slug: 'enroll-depth-detached-cfg' });
    let env: Record<string, string>;
    beforeAll(() => {
      setupDepthFixture(dir);
      // ⚠️ the RICH stub, never this file's local `setupStubBrainPath` — that one is an
      //   `exit 0` shim, so its child is dead before it can report an env at all
      env = {
        PATH: setupRichStubBrainPath({ dir }),
        CLAUDE_CONFIG_DIR: configDir,
        RHACHET_CLONE_DEPTH: '0',
      };
    });

    when('[t0] the detached host stands the peer up', () => {
      const run = useThen('the caller is handed an address and exits', () =>
        invokeRhachetCliBinary({
          args: ['enroll', 'claude', '--as', '@:depthkid', '--output', 'json'],
          cwd: dir,
          env,
          timeoutMs: 60_000,
          logOnError: false,
        }),
      );

      afterAll(() => {
        invokeRhachetCliBinary({
          args: ['clone', 'say', '@:depthkid', '--what', 'exit 0'],
          cwd: dir,
          env,
          logOnError: false,
        });
      });

      then('the enroll succeeds', () => {
        expect(run.status).toEqual(0);
        expect(run.stderr).not.toContain('depth budget spent');
      });

      then('🔴 the child was minted at depth 1 — the budget crossed the seam', () => {
        const dumped = JSON.parse(
          readFileSync(join(configDir, 'stub.env.json'), 'utf8'),
        ) as { depth: string | null };
        expect(dumped.depth).toEqual('1');
      });

      then('the child carries its OWN serial and socket, never the caller\u2019s', () => {
        const dumped = JSON.parse(
          readFileSync(join(configDir, 'stub.env.json'), 'utf8'),
        ) as { serial: string | null; socket: string | null };
        const handoff = JSON.parse(run.stdout) as { serial: string };
        expect(dumped.serial).toEqual(handoff.serial);
        expect(dumped.socket).toContain(handoff.serial);
      });
    });
  });

  /**
   * .what = the motive a `--reason @stdin` enroll records when it DETACHES
   * .why =
   *   - 🔴 this one fails SILENTLY, which is what earns it an acceptance clamp on top of
   *     the unit cases in `asCloneDetachHostArgv.test.ts`. the caller drains the pipe
   *     BEFORE it detaches, and the host is spawned with `stdin: 'ignore'` — so a host
   *     handed `--reason @stdin` reads an empty pipe and records NO motive for an enroll
   *     whose caller supplied one
   *   - the unit cases grade the argv transformer in isolation; not one of them proves
   *     it is WIRED into the detach branch. this grades the artifact on disk, across the
   *     process seam, which is the only place the loss would ever have surfaced
   *
   * .note = the enrollment log is `<repo>/.agent/.actors/<hash>/roles/enrollment.jsonl`
   *   — repo-scoped, so it is readable without a reach outside the repo
   *   (`rule.forbid.reads-outside-the-repo`)
   *
   * .note = DOGFOOD, the mutations that make it bite:
   *   | mutation | result |
   *   |---|---|
   *   | the detach branch replays `process.argv.slice(1)` verbatim | 🔴 red — reason reads `null` |
   *   | `asCloneDetachHostArgv` handles only the `=` form | 🔴 red — this uses the SPACE form |
   */
  given('[case4] a detached enroll whose motive arrived down a PIPE', () => {
    const dir = genTempDir({ slug: 'enroll-detach-motive' });
    const configDir = genTempDir({ slug: 'enroll-detach-motive-cfg' });
    const motive = 'a motive that only ever existed on stdin';
    let env: Record<string, string>;
    beforeAll(() => {
      setupDepthFixture(dir);
      env = {
        PATH: setupRichStubBrainPath({ dir }),
        CLAUDE_CONFIG_DIR: configDir,
        RHACHET_CLONE_DEPTH: '0',
      };
    });

    when('[t0] the host is re-execed with the resolved motive', () => {
      const run = useThen('the caller is handed an address and exits', () =>
        invokeRhachetCliBinary({
          args: [
            'enroll',
            'claude',
            '--as',
            '@:motivekid',
            '--reason',
            '@stdin',
            '--output',
            'json',
          ],
          cwd: dir,
          env,
          stdin: motive,
          timeoutMs: 60_000,
          logOnError: false,
        }),
      );

      afterAll(() => {
        invokeRhachetCliBinary({
          args: ['clone', 'say', '@:motivekid', '--what', 'exit 0'],
          cwd: dir,
          env,
          logOnError: false,
        });
      });

      then('the enroll succeeds', () => {
        expect(run.status).toEqual(0);
      });

      then('🔴 the audit records the PIPED motive, never `@stdin` and never null', () => {
        // the actor dir is hash-named, so the log is found by its ARTIFACT rather than
        // by position. ⚠️ that filter carries weight: `.actors/` also holds `.gitignore`
        // and a `.serials/` dir, and each sorts ahead of any hash — a first-entry read
        // picked them and threw, which is a red-BY-ABSENCE, never the red this clamp is for
        const actorsRoot = join(dir, '.agent', '.actors');
        const logs = readdirSync(actorsRoot, { withFileTypes: true })
          .filter((entry) => entry.isDirectory())
          .map((entry) =>
            join(actorsRoot, entry.name, 'roles', 'enrollment.jsonl'),
          )
          .filter((path) => existsSync(path));
        expect(logs.length).toBeGreaterThan(0);

        const reasons = logs.flatMap((path) =>
          readFileSync(path, 'utf8')
            .trim()
            .split('\n')
            .map((line) => (JSON.parse(line) as { reason: string | null }).reason),
        );

        expect(reasons).toContain(motive);
        expect(reasons).not.toContain('@stdin');
      });
    });
  });
});

/**
 * .what = blackbox acceptance for `rhx enroll` invoked with NO tty on stdout
 * .why =
 *   - `define.invariant.clone-attendance-is-a-mode-never-a-reach`: a tty decides how a
 *     clone is WATCHED; it must never decide whether a clone can be REACHED. before this
 *     clamp, a no-tty enroll produced a clone with NO socket, so every peer `say` to it
 *     failed — the exact defect a human named as "our acceptance tests should have caught
 *     this already"
 *   - 🔴 the suite WAS exhaustive over the wrong cube. every extant reach case enrolls via
 *     `spawnRhachetCliBackground`, which allocates a real pty — so every axis was walked
 *     with `tty: true` pinned, and the one value that broke was unreachable by construction
 *   - `invokeRhachetCliBinary` is the missing leg: it is a `spawnSync` with piped stdio, so
 *     the child sees `process.stdout.isTTY === undefined`. the instrument already existed;
 *     no case had ever aimed it at this axis
 *
 * .note = a no-tty enroll takes the `async` mode, which re-execs itself as a DETACHED host
 *   and hands its address back on stdout. so this case terminates on its own — it does not
 *   block on a brain that never exits, which is the second half of the same invariant
 *
 * .note = DOGFOOD, the mutations that make it bite:
 *   | mutation | result |
 *   |---|---|
 *   | `isCloneSocketEligible` reads attendance again | 🔴 red — `socketEligible: false` |
 *   | `computeCloneEnrollMode` returns `watch` with no tty | 🔴 red — the caller blocks on a cli that never exits, and the `timeoutMs` cap fires |
 */
describe('rhx enroll with no tty (acceptance)', () => {
  given('[case1] a linked repo + a live stub brain, enrolled with NO tty', () => {
    const dir = genTempDir({ slug: 'enroll-no-tty' });
    const configDir = genTempDir({ slug: 'enroll-no-tty-cfg' });
    let env: Record<string, string>;
    beforeAll(() => {
      setupEnrollFixture({ dir });
      env = {
        PATH: setupRichStubBrainPath({ dir }),
        CLAUDE_CONFIG_DIR: configDir,
      };
    });

    when('[t0] `enroll claude --output json` runs through a piped stdio spawn', () => {
      const run = useThen('it terminates on its own, exit 0', () =>
        // ⚠️ `invokeRhachetCliBinary` is a spawnSync with PIPED stdio — the child's
        //   `process.stdout.isTTY` is undefined, which is precisely the axis value
        //   the pty-based reach suites can never produce
        invokeRhachetCliBinary({
          args: ['enroll', 'claude', '--as', '@:nottty', '--output', 'json'],
          cwd: dir,
          env,
          timeoutMs: 60_000,
          logOnError: false,
        }),
      );

      // tear the detached host down through the stub's own `exit <code>` contract —
      // an async enroll outlives its caller by design, so a case that leaves one up
      // leaks a live, billed clone onto the host that ran the suite
      afterAll(() => {
        invokeRhachetCliBinary({
          args: ['clone', 'say', '@:nottty', '--what', 'exit 0'],
          cwd: dir,
          env,
          logOnError: false,
        });
      });

      then('the caller is handed the clone address, never a blocked terminal', () => {
        expect(run.status).toEqual(0);
        const handoff = JSON.parse(run.stdout) as {
          serial: string;
          socketEligible: boolean;
        };
        expect(handoff.serial).toMatch(/^[0-9a-f-]{36}$/);
      });

      then('🔴 the clone is REACHABLE — attendance gated no part of it', () => {
        const handoff = JSON.parse(run.stdout) as { socketEligible: boolean };
        expect(handoff.socketEligible).toEqual(true);
      });

      then('🔴 the clone ANSWERS a say — reach is proven, never asserted', () => {
        /**
         * 🔴 .the gap this closes = the row above asserts `socketEligible`, a FLAG the
         *   ENROLLER writes onto its own handoff. it says "i intended a socket", and no
         *   more than that. so a clone whose brain-cli had already EXITED — socket
         *   closed, file unlinked, host loop drained — still satisfied it, and this
         *   suite stayed green while every real `say` to a fresh `--async` clone read
         *   DEAD.
         *
         * ⚠️ .the measured cost of the gap = the whole acceptance tier was green (3606
         *   tests, 2026-09-16) on the same day four consecutive `--async` enrolls each
         *   handed back an address and each was dead within seconds. a flag assertion
         *   cannot catch a dead clone, because the flag is written before the death.
         *
         * ⇒ so this row asserts the one thing intent cannot fake: the clone REPLIES. a
         *   say that returns exit 0 means the socket accepted, the pty took the bytes,
         *   and the brain was alive to be written to
         */
        const said = invokeRhachetCliBinary({
          args: ['clone', 'say', '@:nottty', '--what', 'poke nottty'],
          cwd: dir,
          env,
          logOnError: false,
        });
        expect(said.status).toEqual(0);
        // ⚠️ a bare `/said to|enqueued for/` match is too weak: it admits a tree addressed
        //   to SOME OTHER clone, which is exactly what a serial-collision defect would
        //   render. the harness ties the verdict to THIS clone's address and asserts the
        //   branch's structural tail
        const { serial } = JSON.parse(run.stdout) as { serial: string };
        expectCloneSaySuccessTree({
          stdout: said.stdout,
          serial,
          slug: 'nottty',
        });
        // the masked live vibecheck — a human who reviews this PR sees the shape a real
        // socket + subprocess + stdout write put on a terminal
        expect(
          asCloneSayHeadSnapshotSafe({ stdout: said.stdout }),
        ).toMatchSnapshot();
      });
    });

    when('[t1] `enroll claude --async` with the mode named EXPLICITLY', () => {
      /**
       * 🔴 .the second half of the same gap = [t0] passes no mode flag at all, so the
       *   mode is INFERRED from the absent tty. that path never puts `--watch` or
       *   `--async` on the argv, so it could never exercise the flag-leak class:
       *   `getBrainCliPassthroughArgs` strips every flag enroll consumes off the RAW
       *   argv, and `--watch`/`--async` were absent from its list. a brain cli answers
       *   an unknown option with `error: unknown option '--async'` and EXITS, which
       *   cascades — pty child dies, socket closes and unlinks, detached host's loop
       *   drains, host exits. so the address was handed back and the clone was already
       *   gone (measured 2026-09-17, four clones, one per flag form).
       *
       * ⚠️ .why the explicit form needs its OWN case = an inferred mode and a named
       *   mode reach the same branch by different argv. only the named one puts the
       *   token where the stripper must see it, and that token is the whole defect.
       *   the unit clamp (`invokeEnroll.test.ts`) ties the two lists; this row proves
       *   the tie holds end to end, through a real spawn, at the CLI surface
       */
      const run = useThen(
        'an explicit --async enroll terminates on its own',
        () =>
          invokeRhachetCliBinary({
            args: [
              'enroll',
              'claude',
              '--async',
              '--as',
              '@:asyncflag',
              '--output',
              'json',
            ],
            cwd: dir,
            env,
            timeoutMs: 60_000,
            logOnError: false,
          }),
      );

      afterAll(() => {
        invokeRhachetCliBinary({
          args: ['clone', 'say', '@:asyncflag', '--what', 'exit 0'],
          cwd: dir,
          env,
          logOnError: false,
        });
      });

      then('the caller is handed the clone address, exit 0', () => {
        expect(run.status).toEqual(0);
        const handoff = JSON.parse(run.stdout) as { serial: string };
        expect(handoff.serial).toMatch(/^[0-9a-f-]{36}$/);
      });

      then('🔴 the clone ANSWERS — the explicit flag never reached the brain', () => {
        // the bite: with `--async` absent from BOOLEAN_FLAGS, the stub brain receives
        // it, refuses it, and exits — so this say reads DEAD and the row goes red
        const said = invokeRhachetCliBinary({
          args: ['clone', 'say', '@:asyncflag', '--what', 'poke asyncflag'],
          cwd: dir,
          env,
          logOnError: false,
        });
        expect(said.status).toEqual(0);
        // the same two clamps as [t0]: tie the verdict to THIS clone, then vibecheck the live
        // head render under a mask
        const { serial } = JSON.parse(run.stdout) as { serial: string };
        expectCloneSaySuccessTree({
          stdout: said.stdout,
          serial,
          slug: 'asyncflag',
        });
        expect(
          asCloneSayHeadSnapshotSafe({ stdout: said.stdout }),
        ).toMatchSnapshot();
      });
    });

    when('[t2] `enroll claude --await -p "<prompt>"` — the THIRD mode, stated', () => {
      /**
       * 🔴 .the gap this closes = `await` was DERIVABLE and not STATABLE for a release.
       *   `computeCloneEnrollMode` returned it whenever a print flag rode the passthrough,
       *   so the mode existed, had a name, and had no surface — a caller who wanted *"hand
       *   it this prompt and wait"* had to know that `-p` implies it rather than reach for
       *   rhachet's own word. a settled vocabulary with one value absent from its own
       *   surface teaches the surface rather than the vocabulary.
       *
       * ⚠️ .why the EXPLICIT form needs its own row, beside the inferred one = the same
       *   argument [t1] makes for `--async`. an inferred mode never puts its token on the
       *   argv, so it cannot exercise the strip class: `getBrainCliPassthroughArgs` cuts
       *   every flag enroll consumes off the RAW argv, and a flag absent from that list
       *   reaches the child, which refuses it and exits. so this row proves BOTH that the
       *   mode is askable and that the ask does not poison the child.
       *
       * .the two clamps it ties = the caller gets the child's ANSWER on stdout (never an
       *   enroll banner — the measured l3-lane defect), and the exit code is the child's
       */
      const run = useThen('an explicit --await enroll holds, then returns', () =>
        invokeRhachetCliBinary({
          args: ['enroll', 'claude', '--await', '-p', 'poke awaitflag'],
          cwd: dir,
          env,
          timeoutMs: 60_000,
          logOnError: false,
        }),
      );

      then('the child`s exit code is forwarded, never the enroller`s own', () => {
        expect(run.status).toEqual(0);
      });

      then('🔴 the caller is handed the ANSWER, never an enroll banner', () => {
        // the bite: derive `async` here and this reads the address handoff instead
        expect(run.stdout).toContain('got:poke awaitflag');
        expect(run.stdout).not.toContain('clone enrolled');
      });

      then('🔴 the --await token never reached the brain', () => {
        // the bite: absent from BOOLEAN_FLAGS, the stub answers `unknown option
        // '--await'` and exits 1, so the status row above reddens too
        expect(run.stderr).not.toContain('unknown option');
      });
    });

    when('[t3] two modes stated at once', () => {
      /**
       * 🔴 .the defect this refuses = the prior read was a ternary chain
       *   (`watch ? 'watch' : async ? 'async' : null`), so `--watch --async` returned
       *   `watch`, the second flag VANISHED, and the exit was 0. that is
       *   `define.invariant.an-unknown-flag-is-refused-never-dropped` one grain in — the
       *   flag was RECOGNIZED and then discarded, which costs the caller exactly what a
       *   drop costs and is just as invisible.
       *
       * ⇒ and the cost grew with the axis: two modes have one pair to get wrong, three
       *   have three pairs plus the triple, so a precedence chain hid four asks over one
       */
      const run = useThen('the clash is REFUSED, never resolved', () =>
        invokeRhachetCliBinary({
          args: ['enroll', 'claude', '--watch', '--async'],
          cwd: dir,
          env,
          timeoutMs: 60_000,
          logOnError: false,
        }),
      );

      then('the exit is a caller-fault code, never 0', () => {
        expect(run.status).toEqual(2);
      });

      then('🔴 the refusal NAMES both flags, never merely counts them', () => {
        const rendered = `${run.stdout}${run.stderr}`;
        expect(rendered).toContain('more than one mode');
        expect(rendered).toContain('--watch');
        expect(rendered).toContain('--async');
      });

      then('no clone was stood up — the refusal precedes the spawn', () => {
        expect(`${run.stdout}${run.stderr}`).not.toContain('clone enrolled');
      });
    });
  });
});

/**
 * .what = blackbox acceptance for `rhachet enroll <brain> --reason <text|@stdin>`
 * .why = the wish names enrollment.jsonl as the record of "the history of WHY and
 *   which roles were enrolled" (criteria usecase.11 addendum 6). the reason is
 *   written to that log BEFORE the spawn, so a stub-exit-0 run proves — at the real
 *   CLI surface, spawn-free — that the caller's motive is captured (plain AND piped),
 *   and that an absent reason records as null (a truthful audit, never a fabrication)
 *
 * .note = the reason threads through genCloneOndisk → findsertActorOndisk →
 *   setActorOndiskRolesLog, all of which run before the child spawn, so a stub
 *   `claude` that exits 0 leaves the enrollment.jsonl for a deterministic readout —
 *   the same spawn-free-artifact pattern the `--roles` positive cases use
 */
describe('rhx enroll --reason (acceptance)', () => {
  const setupReasonFixture = (dir: string): string => {
    setupRoleFixtureRepo({ dir });
    invokeRhachetCliBinary({
      args: ['init', '--roles', 'mechanic', 'architect', 'driver'],
      cwd: dir,
    });
    return setupStubBrainPath({ dir });
  };

  given('[case1] a linked repo, `--reason "<text>"` (plain)', () => {
    const dir = genTempDir({ slug: 'enroll-reason-plain' });
    let stubPath: string;
    beforeAll(() => {
      stubPath = setupReasonFixture(dir);
    });

    when('[t0] `enroll claude --reason "nightly cron refresh"` runs', () => {
      const run = useThen('exits 0 (valid enroll, reaches the stub brain)', () =>
        invokeRhachetCliBinary({
          args: ['enroll', 'claude', '--reason', 'nightly cron refresh'],
          cwd: dir,
          env: { PATH: stubPath },
          logOnError: false,
        }),
      );

      then('the audit log records WHY this enrollment happened', () => {
        expect(run.status).toEqual(0);
        const log = readEnrollmentLog({ dir });
        expect(log.at(-1)!.reason).toEqual('nightly cron refresh');
      });

      then('the full persisted audit line is locked to a snapshot', () => {
        // snapshot the WHOLE jsonl line (schemaVersion, roles, delta, reason),
        // not just the reason field — a field assert cannot catch a widened schema
        // or a lost schemaVersion. the wall-clock `at` is the one varying field, so
        // it is masked; everything else is drift-locked in the pr diff
        expect(readEnrollmentLogRaw({ dir })).toMatchSnapshot();
      });
    });
  });

  given('[case2] a linked repo, `--reason @stdin` (piped motive)', () => {
    const dir = genTempDir({ slug: 'enroll-reason-stdin' });
    let stubPath: string;
    beforeAll(() => {
      stubPath = setupReasonFixture(dir);
    });

    when('[t0] `enroll claude --reason @stdin` with the motive piped in', () => {
      const run = useThen('exits 0 (valid enroll, reaches the stub brain)', () =>
        invokeRhachetCliBinary({
          args: ['enroll', 'claude', '--reason', '@stdin'],
          cwd: dir,
          env: { PATH: stubPath },
          stdin: 'payload-heavy motive from a pipe\nwith a second line',
          logOnError: false,
        }),
      );

      then('the piped motive is captured in the audit log (trimmed)', () => {
        expect(run.status).toEqual(0);
        const log = readEnrollmentLog({ dir });
        expect(log.at(-1)!.reason).toEqual(
          'payload-heavy motive from a pipe\nwith a second line',
        );
      });
    });
  });

  given('[case3] a linked repo, a bare enroll with NO `--reason`', () => {
    const dir = genTempDir({ slug: 'enroll-reason-absent' });
    let stubPath: string;
    beforeAll(() => {
      stubPath = setupReasonFixture(dir);
    });

    when('[t0] `enroll claude` runs with no motive', () => {
      const run = useThen('exits 0 (valid enroll, reaches the stub brain)', () =>
        invokeRhachetCliBinary({
          args: ['enroll', 'claude'],
          cwd: dir,
          env: { PATH: stubPath },
          logOnError: false,
        }),
      );

      then('the reason records as null — a truthful audit, never a fabrication', () => {
        expect(run.status).toEqual(0);
        const log = readEnrollmentLog({ dir });
        expect(log.at(-1)!.reason).toBeNull();
      });
    });
  });
});

/**
 * .what = blackbox acceptance for the global `--as @:<slug>` collision — a slug
 *   claimed by one actor cannot be re-claimed by a DIFFERENT actor
 * .why = the `.slugs/` index is GLOBAL-unique across actors (criteria usecase.2 /
 *   usecase.5 addressing). the collision was proven only at integration grain
 *   (genCloneOndisk / setCloneSlugIndex); this drives it through the REAL cli and
 *   snapshots the fail-loud error, matching the snapshot discipline its sibling
 *   negative (the uuid-shaped `--as` rejection, case10 t4) already follows.
 *
 * .note = spawn-free-ish: both enrolls run the full path via a stub `claude` (exit
 *   0). enroll 1 (default roleset) bakes a clone and writes `.slugs/foreman`; enroll
 *   2 (a DIFFERENT roleset via `-driver`, so a different actor hash) hits the
 *   collision at genCloneOndisk BEFORE its own spawn — a deterministic fail-loud, no brain
 */
describe('rhx enroll --as slug collision (acceptance)', () => {
  const setupCollisionFixture = (dir: string): string => {
    setupRoleFixtureRepo({ dir });
    invokeRhachetCliBinary({
      args: ['init', '--roles', 'mechanic', 'architect', 'driver'],
      cwd: dir,
    });
    return setupStubBrainPath({ dir });
  };

  given('[case1] `@:foreman` already claimed by the default-roleset actor', () => {
    const dir = genTempDir({ slug: 'enroll-slug-collision' });
    let stubPath: string;
    beforeAll(() => {
      stubPath = setupCollisionFixture(dir);
      // enroll 1: default roleset → actor H1, claims `.slugs/foreman`
      invokeRhachetCliBinary({
        args: ['enroll', 'claude', '--as', '@:foreman'],
        cwd: dir,
        env: { PATH: stubPath },
        logOnError: false,
      });
    });

    when('[t0] a DIFFERENT actor tries `--as @:foreman` (`-driver` roleset)', () => {
      const run = useThen('exits non-zero', () =>
        invokeRhachetCliBinary({
          args: ['enroll', 'claude', '--roles', '-driver', '--as', '@:foreman'],
          cwd: dir,
          env: { PATH: stubPath },
          logOnError: false,
        }),
      );

      then('the second actor is refused — the slug is globally claimed', () => {
        expect(run.status).not.toEqual(0);
        expect(run.stderr).not.toContain('\u0000');
        expect(run.stderr.toLowerCase()).toContain(
          'already claimed by a different actor',
        );
        expect(run.stderr).toContain('foreman');
        // the fix names the two ways forward: a new slug, or reach the extant clone
        expect(run.stderr).toContain('--as @:<slug>');
      });

      then('the collision error is locked to a snapshot', () => {
        expect(asSnapshotSafe(run.stderr)).toMatchSnapshot();
      });
    });

    when('[t1] the same collision under `--output json` (the machine twin)', () => {
      // a supervisor/cron that bakes with `--as @:<slug> --output json` must read a
      // global slug collision as a structured error field, symmetric with the talk
      // verbs — NOT scrape the human tree (usecase.11 addendum 4, second scenario).
      // `.slugs/foreman` is still owned by the default-roleset actor from setup, so
      // the `-driver` actor is refused again, deterministically
      const run = useThen('exits non-zero with a machine shape', () =>
        invokeRhachetCliBinary({
          args: [
            'enroll',
            'claude',
            '--roles',
            '-driver',
            '--as',
            '@:foreman',
            '--output',
            'json',
          ],
          cwd: dir,
          env: { PATH: stubPath },
          logOnError: false,
        }),
      );

      then('the collision is a parseable structured error, not prose', () => {
        expect(run.status).toEqual(2);
        expect(run.stderr).not.toContain('✋');
        const parsed = JSON.parse(run.stderr) as {
          class: string;
          message: string;
        };
        expect(parsed.class).toEqual('ConstraintError');
        expect(parsed.message.toLowerCase()).toContain(
          'already claimed by a different actor',
        );
      });

      then('the collision json error shape is locked (machine contract)', () => {
        expect(asSnapshotSafe(run.stderr)).toMatchSnapshot();
      });
    });
  });
});

/**
 * .what = a bare `rhx enroll --help` (no brain named) must render enroll's OWN
 *   usage — its flags stay discoverable (rule.require.help-on-demand)
 * .why = enroll disables the built-in --help so `enroll <brain> --help` forwards
 *   to the brain (the wish's passthrough mandate). that would leave a bare
 *   `enroll --help` a dead end, so the no-brain case renders enroll help instead.
 *   this clamps that fix: a human who explores enroll learns its flags, no source
 */
describe('rhx enroll --help (acceptance)', () => {
  given('[case1] a bare `enroll --help` with NO brain', () => {
    const dir = genTempDir({ slug: 'enroll-help' });

    when('[t0] the human asks for help without a brain', () => {
      const run = useThen('exits 0', () =>
        invokeRhachetCliBinary({
          args: ['enroll', '--help'],
          cwd: dir,
          logOnError: false,
        }),
      );

      then('enroll renders its own usage + every registered flag', () => {
        expect(run.status).toEqual(0);
        expect(run.stdout).toContain('--brain');
        expect(run.stdout).toContain('--roles');
        expect(run.stdout).toContain('--as');
        expect(run.stdout).toContain('--no-socket');
        expect(run.stdout).toContain('--reason');
        expect(run.stdout).toContain('--output');
      });

      then('the help format is locked (visual spot-check)', () => {
        expect(asSnapshotSafe(run.stdout)).toMatchSnapshot();
      });
    });
  });
});
