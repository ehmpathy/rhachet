import { UnexpectedCodePathError } from 'helpful-errors';
import { genTempDir, given, then, useThen, when } from 'test-fns';

import { execSync } from 'node:child_process';

import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { setupRoleFixtureRepo } from '@/blackbox/.test/infra/roleFixtureRepo';

import {
  chmodSync,
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

    when('[t2] `enroll claude` (required --roles absent)', () => {
      const run = useThen('exits non-zero', () =>
        invokeRhachetCliBinary({
          args: ['enroll', 'claude'],
          cwd: dir,
          logOnError: false,
        }),
      );
      then('commander reports the required --roles option is absent', () => {
        expect(run.status).not.toEqual(0);
        expect(run.stderr).toContain('--roles');
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
  });
});
