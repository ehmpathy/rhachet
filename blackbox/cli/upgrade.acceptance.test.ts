import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { ConstraintError } from 'helpful-errors';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { asBrainDirReportSnapshot } from '@/blackbox/.test/infra/asBrainDirReportSnapshot';
import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';

/**
 * .what = two lines the stubbed package manager prints before it dies — the FIRST line of
 *   its log and the LAST — so a test can ask both WHICH CHANNEL those bytes reached and
 *   HOW MUCH of the log each channel carries
 *
 * .why = the install puts the child's output in two places — a replay to the terminal, and
 *   `metadata.output` on the error it throws — and a distinctive token can be followed
 *   through both
 *
 * .note = `asOutputTail` keeps the last 20 lines, so `HEAD` falls outside that tail and
 *   `TAIL` sits inside it
 *
 * .note = both survive `maskInstallOutput` untouched, so a raw stderr read can grep them
 */
const PNPM_LOG_MARKER_HEAD = 'RHACHET_TEST_PM_LOG_HEAD_LINE_BEYOND_THE_TAIL';
const PNPM_LOG_MARKER_TAIL = 'RHACHET_TEST_PM_LOG_TAIL_LINE_WITHIN_THE_TAIL';

/**
 * .what = how many filler lines the stub prints between its two markers
 *
 * .why = it exceeds `NPM_INSTALL_OUTPUT_TAIL_LINES` (20), so the head marker falls outside
 *   the tail
 */
const PNPM_LOG_FILLER_LINES = 30;

/**
 * .what = takes the pnpm-presence notice frame out of an upgrade's stdout — its `⚠️`
 *   header, and every row down to the `└──` that terminates the callout
 *
 * .why = the frame is what a human READS, so a snapshot of it catches a broken treestruct,
 *   a lost blank, or a clause in the wrong order — none of which a `toContain` row can see.
 *
 * .note = the window closes on the `└──` terminator, never a fixed row count, so it tracks
 *   the render's own length
 */
const asPnpmNoticeFrame = (input: { stdout: string }): string => {
  const lines = input.stdout.split('\n');
  const indexOpen = lines.findIndex((line) => line.includes('⚠️'));
  if (indexOpen < 0)
    throw new ConstraintError('no ⚠️ notice in stdout', {
      hint: 'the notice header may have been reworded — re-read printPnpmPresenceUnreadableNotice and follow it here — or the probe read cleanly, in which case this case drove the wrong fixture',
      stdout: input.stdout.slice(0, 400),
    });

  const indexClose = lines.findIndex(
    (line, index) => index > indexOpen && line.includes('└──'),
  );
  if (indexClose < 0)
    throw new ConstraintError('the ⚠️ notice opened but never closed', {
      hint: 'no `└──` row follows its header, so the treestruct is broken — repair the notice render, never this scan',
      stdout: input.stdout.slice(0, 400),
    });

  return lines.slice(indexOpen, indexClose + 1).join('\n');
};

/**
 * .what = extracts rhachet-controlled output from upgrade stdout
 * .why = omits pnpm/npm output which varies between runs
 *
 * .note = returns { header, summary } for snapshot assertions
 */
const extractRhachetOutput = (input: {
  stdout: string;
}): { header: string; summary: string } => {
  const lines = input.stdout.split('\n');

  // header = lines before first pnpm/npm output line
  const headerLines: string[] = [];
  let headerEnded = false;
  for (const line of lines) {
    if (
      !headerEnded &&
      (line.includes('WARN') ||
        line.includes('Progress:') ||
        line.includes('Packages:') ||
        line.includes('dependencies:'))
    ) {
      headerEnded = true;
    }
    if (!headerEnded) headerLines.push(line);
  }

  // summary = each ✨ line, plus the tree rows that hang beneath it (e.g. `✨ hooks` → `└─ 1 created`)
  const summaryLines = lines.filter((line, index) =>
    isSummaryLine({ lines, index }),
  );

  return {
    header: headerLines.join('\n').trim(),
    summary: summaryLines.join('\n').trim(),
  };
};

/**
 * .what = whether a stdout line belongs to the ✨ summary
 * .why = a summary header may carry its counts as tree rows beneath it; a filter on `✨` alone
 *        keeps the header and drops the counts, so the snapshot shows a bare `✨ hooks`
 */
const isSummaryLine = (input: { lines: string[]; index: number }): boolean => {
  const line = input.lines[input.index]!;
  if (line.includes('✨')) return true;

  // a tree row counts only where an unbroken run of tree rows leads back to a ✨ header
  if (!/^ {3}[├└]─ /.test(line)) return false;
  if (input.index === 0) return false;
  return isSummaryLine({ lines: input.lines, index: input.index - 1 });
};

/**
 * .what = drops ansi color escape sequences from a string
 * .why = a raw node error dump carries ansi color codes (e.g. `\u001b[33m`),
 *        which render as garbled `[33m` noise in a snapshot. strip them so the
 *        snapshot stays human-legible (rule.forbid.snapshot-visual-blemishes)
 */
const stripAnsiCodes = (input: string): string =>
  // eslint-disable-next-line no-control-regex
  input.replace(/\u001b\[[0-9;]*m/g, '');

/**
 * .what = masks the node runtime version line to a stable token
 * .why = a raw node crash dump ends with `Node.js vX.Y.Z`, a per-host value
 *        that would make the snapshot non-deterministic across environments
 */
const maskNodeVersion = (input: string): string =>
  input.replace(/Node\.js v\d+\.\d+\.\d+/g, 'Node.js $NODE_VERSION');

/**
 * .what = masks the value of the install error's `output` field to a stable token
 *
 * .why  = `metadata.output` carries the package manager's captured log — a live registry
 *   response this repo does not own, with json-escaped ansi codes `stripAnsiCodes` cannot reach
 * .note = the value is masked and the key kept, so the snapshot still pins the field
 */
const maskInstallOutput = (input: string): string =>
  input.replace(/("output": ")(?:\\.|[^"\\])*(")/g, '$1$OUTPUT_MASKED$2');

/**
 * .what = reads the installed version of a package from package.json
 * .why = verifies upgrade actually changed the version
 */
const getInstalledVersion = (input: {
  cwd: string;
  packageName: string;
}): string => {
  const packageJsonPath = join(
    input.cwd,
    'node_modules',
    input.packageName,
    'package.json',
  );
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  return packageJson.version;
};

describe('rhachet upgrade', () => {
  given('[case1] discoverability: user runs "update"', () => {
    const repo = useBeforeAll(async () =>
      await genTestTempRepo({ fixture: 'minimal' }),
    );

    when('[t0] rhachet update', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['update'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('stderr suggests "upgrade"', () => {
        expect(result.stderr).toContain('upgrade');
      });

      then('stderr shows helpful error message', () => {
        expect(result.stderr).toContain('not a valid command');
      });
    });
  });

  given('[case2] upgrade --roles on repo without rhachet-roles packages', () => {
    const repo = useBeforeAll(async () =>
      await genTestTempRepo({ fixture: 'without-roles-packages' }),
    );

    when('[t0] rhachet upgrade --roles mechanic', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['upgrade', '--roles', 'mechanic'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('stderr contains error about install failure', () => {
        expect(result.stderr).toContain('install failed');
      });
    });
  });

  given('[case2b] upgrade --roles -ghostrole (lead-dash sentinel decode)', () => {
    const repo = useBeforeAll(async () =>
      await genTestTempRepo({ fixture: 'without-roles-packages' }),
    );

    when('[t0] rhachet upgrade --roles -ghostrole', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['upgrade', '--roles', '-ghostrole'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('the argv sentinel is decoded — no null byte leaks', () => {
        // upgrade routes --roles through the shared getRoleDeltaTokens, so a
        // lead-dash token decodes back to `-ghostrole` instead of `\u0000ghostrole`
        expect(result.stderr).not.toContain('\u0000');
        expect(result.stderr.toLowerCase()).toContain('ghostrole');
      });

      then('a typo names the CAUSE, never "cause unclassified"', () => {
        // 🚨 the row this case exists to guard, end to end through the real binary
        //   against the real registry. a typo'd role slug is the most common upgrade
        //   failure there is, and before the `package-absent` classification it
        //   reported as *"cause unclassified. read the pnpm output above"* — the
        //   "go read the noise" guidance `rule.require.errors-name-the-fix` forbids,
        //   on the one failure a human hits most
        expect(result.stderr).toContain('a requested package does not exist');
        expect(result.stderr).not.toContain('cause unclassified');
      });

      then('it exits 2 — the CALLER must repair the slug', () => {
        // .why = `rule.require.exit-code-semantics`. exit 1 means "may be transient,
        //   retry might help"; a retry with the same slug fails identically forever
        expect(result.status).toEqual(2);
      });

      then('the human reads a framed report, never a node crash dump', () => {
        // `invoke.ts` frames any `HelpfulError` into a clean report, never a stack trace
        //   (`rule.require.errors-name-the-fix`); `[case16]` clamps the `MalfunctionError` leaf
        expect(result.stderr).not.toContain('    at ');
        expect(result.stderr).not.toContain('Node.js v');
      });

      then('the decoded error output is locked to a snapshot', () => {
        // strip ansi color codes + mask the node version and the captured install
        // log, so the crash dump snapshots clean and deterministic (no visual
        // blemish, no host drift, no live registry response we do not own)
        expect(
          maskInstallOutput(
            maskNodeVersion(stripAnsiCodes(asSnapshotSafe(result.stderr))),
          ),
        ).toMatchSnapshot();
      });
    });
  });

  // the unreadable-probe notice, as a human sees it through the compiled binary.
  //   three stubs prepended to PATH decide every ambient read this path makes, so the
  //   case reaches no network and writes no global store (`rule.require.hermetic-tests`)
  given('[case15] the pnpm-presence probe never answers', () => {
    const scene = useBeforeAll(async () => {
      const repo = await genTestTempRepo({ fixture: 'minimal' });
      const stubDir = genTempDir({ slug: 'pnpm-probe-wedged' });

      // `rhx` is read as TEXT by getGlobalRhachetVersion, which matches `rhachet@<semver>`.
      // it is what makes the global branch run at all, with no real global install present
      writeFileSync(join(stubDir, 'rhx'), '#!/bin/sh\n# rhachet@1.0.0\n', {
        mode: 0o755,
      });

      // `pnpm` dies by signal, so the probe yields `unreadable` in milliseconds
      writeFileSync(join(stubDir, 'pnpm'), '#!/bin/sh\nkill -9 $$\n', {
        mode: 0o755,
      });

      // `npm` is a no-op that exits 0 — the fallback install must not reach the network,
      // and must never touch the real global store of the host that runs this suite
      writeFileSync(join(stubDir, 'npm'), '#!/bin/sh\nexit 0\n', {
        mode: 0o755,
      });

      // `--which global` is what reaches `getPnpmPresence`; the local path never probes
      const result = invokeRhachetCliBinary({
        args: ['upgrade', '--self', '--which', 'global'],
        cwd: repo.path,
        env: { PATH: `${stubDir}:${process.env.PATH}` },
        logOnError: false,
      });

      return { result };
    });

    when('[t0] rhachet upgrade --which global, with the probe wedged', () => {
      then('the human SEES the notice — it is not swallowed', () => {
        expect(scene.result.stdout).toContain(
          'could not tell whether pnpm is installed',
        );
      });

      then('it names the DATUM, never a host-specific shell command', () => {
        // `rule.forbid.host-specific-cures-in-hints` — this notice reaches darwin, linux
        // AND win32, so `echo $PATH` would fail on the one that spells it `%PATH%`
        expect(scene.result.stdout).toContain('PATH');
        expect(scene.result.stdout).not.toContain('echo $PATH');
        expect(scene.result.stdout).not.toContain('%PATH%');
      });

      then('it wears the neutral callout, never a role mascot', () => {
        // `rhx upgrade` is rhachet's OWN cli, so its output takes `⚠️`
        // (`rule.prefer.emoji-language`)
        expect(scene.result.stdout).toContain('⚠️');
        for (const glyph of ['🐢', '🦉', '🌙', '🐚'])
          expect(scene.result.stdout).not.toContain(glyph);
      });

      then('the upgrade still proceeds — a wedged probe is no refusal', () => {
        // the notice discloses a fallback, it does not abort one
        expect(scene.result.status).toEqual(0);
      });

      then('the WHOLE rendered frame is pinned, not merely its tokens', () => {
        // pins the layout the `toContain` rows cannot see. sliced to the notice frame,
        //   whose one variable is the timeout derived from `PROBE_TIMEOUT_MS`
        expect(
          asPnpmNoticeFrame({ stdout: scene.result.stdout }),
        ).toMatchSnapshot();
      });
    });
  });

  // a `MalfunctionError` off the local install path (`execNpmInstallLocal` ->
  //   `asNpmInstallFailureError`) reaches `invoke.ts`'s `HelpfulError` catch and renders framed
  given('[case16] local install dies by signal (unclassified) — the human sees a framed report, never a raw crash dump', () => {
    const scene = useBeforeAll(async () => {
      const repo = await genTestTempRepo({ fixture: 'minimal' });
      const stubDir = genTempDir({ slug: 'pnpm-local-crash' });

      // `pnpm` dies by signal — the `unclassified` branch (`result.signal !== null`)
      //
      // .why it prints a log = `execNpmInstall` replays the output and also puts it into
      //   `metadata.output`, so an empty stub could not show a double print
      // .why the log exceeds the tail bound = the tail must arrive bounded and below the hint
      writeFileSync(
        join(stubDir, 'pnpm'),
        [
          '#!/bin/sh',
          `echo "${PNPM_LOG_MARKER_HEAD}"`,
          `i=1; while [ $i -le ${PNPM_LOG_FILLER_LINES} ]; do echo "filler line $i"; i=$((i+1)); done`,
          `echo "${PNPM_LOG_MARKER_TAIL}"`,
          'kill -9 $$',
          '',
        ].join('\n'),
        { mode: 0o755 },
      );

      // `--which local` isolates the local install path
      const result = invokeRhachetCliBinary({
        args: ['upgrade', '--self', '--which', 'local'],
        cwd: repo.path,
        env: { PATH: `${stubDir}:${process.env.PATH}` },
        logOnError: false,
      });

      return { result };
    });

    when('[t0] rhachet upgrade --self --which local, with pnpm dead by signal', () => {
      then('exits 1 — the cause is unclassified, ours to diagnose', () => {
        // exit 1 — a signal death is a malfunction, possibly transient
        //   (`rule.require.exit-code-semantics`)
        expect(scene.result.status).toEqual(1);
      });

      then('the human reads a framed report, never a node crash dump', () => {
        // an unhandled rejection would print a node stack; the cli frames it instead
        expect(scene.result.stderr).not.toContain('    at ');
        expect(scene.result.stderr).not.toContain('Node.js v');
      });

      then('the message names the cause and a diagnostic next step', () => {
        expect(scene.result.stderr).toContain('cause unclassified');
        expect(scene.result.stderr).toContain('rhx --version');
      });

      // the next four rows clamp how the captured log reaches a human: two demand the tail
      //   be PRESENT in the error, two demand it be CONTAINED there
      then('the whole package manager log is replayed on stdout — head and tail', () => {
        // the REPLAY channel owes the human every byte their package manager wrote; it
        // is the error's metadata that is bounded, never this
        expect(scene.result.stdout).toContain(PNPM_LOG_MARKER_HEAD);
        expect(scene.result.stdout).toContain(PNPM_LOG_MARKER_TAIL);
      });

      then('the error keeps the log TAIL — metadata is never stripped', () => {
        // the tail holds the last error line, which the hint points to
        expect(scene.result.stderr).toContain(PNPM_LOG_MARKER_TAIL);
      });

      then('but BOUNDS it — the head of the log is outside the tail', () => {
        // `asOutputTail` keeps the last 20 lines, and the stub prints well past that
        expect(scene.result.stderr).not.toContain(PNPM_LOG_MARKER_HEAD);
      });

      then('and never lets the log bury the fix — hint renders first', () => {
        // `asCliErrorFrame` reorders the hint ahead of the log tail
        const at = (needle: string): number => scene.result.stderr.indexOf(needle);
        expect(at('"hint"')).toBeGreaterThan(-1);
        expect(at(PNPM_LOG_MARKER_TAIL)).toBeGreaterThan(at('"hint"'));
      });

      then('the WHOLE framed report is pinned, not merely its tokens', () => {
        // pins the whole `asCliErrorFrame` render, beside the pointwise rows above
        //   (`rule.forbid.failhide`)
        expect(asSnapshotSafe(scene.result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case3] upgrade --help', () => {
    const repo = useBeforeAll(async () =>
      await genTestTempRepo({ fixture: 'minimal' }),
    );

    when('[t0] rhachet upgrade --help', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['upgrade', '--help'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout contains --self option', () => {
        expect(result.stdout).toContain('--self');
      });

      then('stdout contains --roles option', () => {
        expect(result.stdout).toContain('--roles');
      });

      then('stdout contains --brains option', () => {
        expect(result.stdout).toContain('--brains');
      });

      then('stdout contains description', () => {
        expect(result.stdout).toContain('upgrade');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case4] repo with rhachet-roles-ehmpathy@1.17.20 installed', () => {
    const scene = useBeforeAll(async () => {
      // create temp repo and install dependencies
      const repo = await genTestTempRepo({
        fixture: 'with-roles-packages-pinned',
        install: true,
      });

      // capture version before upgrade
      const versionBefore = getInstalledVersion({
        cwd: repo.path,
        packageName: 'rhachet-roles-ehmpathy',
      });

      return { repo, versionBefore };
    });

    when('[t0] before upgrade', () => {
      then('rhachet-roles-ehmpathy is at 1.17.20', () => {
        expect(scene.versionBefore).toEqual('1.17.20');
      });
    });

    when('[t1] rhachet upgrade --roles ehmpathy/mechanic', () => {
      const result = useBeforeAll(async () => {
        // run the upgrade command
        const upgradeResult = invokeRhachetCliBinary({
          args: ['upgrade', '--roles', 'ehmpathy/mechanic'],
          cwd: scene.repo.path,
        });

        // capture version after upgrade
        const versionAfter = getInstalledVersion({
          cwd: scene.repo.path,
          packageName: 'rhachet-roles-ehmpathy',
        });

        return { upgradeResult, versionAfter };
      });

      then('exits with status 0', () => {
        expect(result.upgradeResult.status).toEqual(0);
      });

      then('rhachet-roles-ehmpathy version is at least 1.17.20', () => {
        // version should be >= 1.17.20 (current latest, may be upgraded in future)
        const [major, minor, patch] = result.versionAfter.split('.').map(Number);
        expect(major).toBeGreaterThanOrEqual(1);
        if (major === 1) {
          expect(minor).toBeGreaterThanOrEqual(17);
          if (minor === 17) {
            expect(patch).toBeGreaterThanOrEqual(20);
          }
        }
      });

      then('pnpm was used (default package manager)', () => {
        // stdout should mention pnpm since pnpm is the default
        expect(result.upgradeResult.stdout).toContain('pnpm');
      });

      then('reinit does NOT run (role not linked)', () => {
        // reinit outputs "🔧 init" when it runs - should NOT be present
        expect(result.upgradeResult.stdout).not.toContain('🔧 init');
      });

      then('stdout renders no brain dir tree (no linked role, so none renders)', () => {
        // upgrade re-renders the brain dirs only beside the reinit of a linked role
        expect(result.upgradeResult.stdout).not.toContain('🧠 brain dir');
        // and no census line renders
        expect(result.upgradeResult.stdout).not.toContain('boot.md (');
      });

      then('stdout.header matches snapshot', () => {
        const { header } = extractRhachetOutput({
          stdout: result.upgradeResult.stdout,
        });
        expect(header).toMatchSnapshot();
      });

      then('stdout.summary matches snapshot', () => {
        const { summary } = extractRhachetOutput({
          stdout: result.upgradeResult.stdout,
        });
        expect(summary).toMatchSnapshot();
      });
    });
  });

  given('[case5] upgrade --brains on repo without rhachet-brains packages', () => {
    const repo = useBeforeAll(async () =>
      await genTestTempRepo({ fixture: 'without-roles-packages' }),
    );

    when('[t0] rhachet upgrade --brains anthropic', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['upgrade', '--brains', 'anthropic'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      // ⚠️ exit 2 EXACTLY, never `not.toEqual(0)` — a typo'd `--brains` spec is the
      //   caller's to amend, and a loose non-zero assertion cannot part that from a
      //   server fault (`rule.require.exit-code-semantics`)
      then('exits 2 — the CALLER amends a bad spec, never us', () => {
        expect(result.status).toEqual(2);
      });

      then('it renders the ✋ frame, never the 💥 server-fault glyph', () => {
        expect(result.stderr).toContain('✋ ConstraintError');
        expect(result.stderr).not.toContain('💥');
      });

      then('stderr contains error about brain package not installed', () => {
        expect(result.stderr).toContain('brain package not installed');
      });

      then('the hint names a move that works on ANY package manager', () => {
        expect(result.stderr).toContain('re-install');
        expect(result.stderr).not.toContain('npm install');
      });
    });
  });

  given('[case7] repo with rhachet-brains-anthropic@0.1.0 installed', () => {
    const scene = useBeforeAll(async () => {
      // create temp repo and install dependencies
      const repo = await genTestTempRepo({
        fixture: 'with-brains-packages-pinned',
        install: true,
      });

      // capture version before upgrade
      const versionBefore = getInstalledVersion({
        cwd: repo.path,
        packageName: 'rhachet-brains-anthropic',
      });

      return { repo, versionBefore };
    });

    when('[t0] before upgrade', () => {
      then('rhachet-brains-anthropic is at 0.1.0', () => {
        expect(scene.versionBefore).toEqual('0.1.0');
      });
    });

    when('[t1] rhachet upgrade --brains anthropic', () => {
      const result = useBeforeAll(async () => {
        // run the upgrade command
        const upgradeResult = invokeRhachetCliBinary({
          args: ['upgrade', '--brains', 'anthropic'],
          cwd: scene.repo.path,
        });

        // capture version after upgrade
        const versionAfter = getInstalledVersion({
          cwd: scene.repo.path,
          packageName: 'rhachet-brains-anthropic',
        });

        return { upgradeResult, versionAfter };
      });

      then('exits with status 0', () => {
        expect(result.upgradeResult.status).toEqual(0);
      });

      then('rhachet-brains-anthropic version is at least 0.1.0', () => {
        // version should be >= 0.1.0 (current latest, may be upgraded in future)
        const [major, minor, patch] = result.versionAfter.split('.').map(Number);
        expect(major).toBeGreaterThanOrEqual(0);
        if (major === 0) {
          expect(minor).toBeGreaterThanOrEqual(1);
        }
      });

      then('stdout contains brain upgrade summary', () => {
        expect(result.upgradeResult.stdout).toContain('brain(s) upgraded');
      });

      then('pnpm was used (default package manager)', () => {
        // stdout should mention pnpm since pnpm is the default
        expect(result.upgradeResult.stdout).toContain('pnpm');
      });

      then('stdout.header matches snapshot', () => {
        const { header } = extractRhachetOutput({
          stdout: result.upgradeResult.stdout,
        });
        expect(header).toMatchSnapshot();
      });

      then('stdout.summary matches snapshot', () => {
        const { summary } = extractRhachetOutput({
          stdout: result.upgradeResult.stdout,
        });
        expect(summary).toMatchSnapshot();
      });
    });
  });

  given('[case8] repo with rhachet-roles-ehmpathy in package.json but not linked', () => {
    const scene = useBeforeAll(async () => {
      // create temp repo and install dependencies
      // note: fixture has NO .agent/ directory - roles are not linked
      const repo = await genTestTempRepo({
        fixture: 'with-roles-packages-pinned',
        install: true,
      });

      // capture version before upgrade
      const versionBefore = getInstalledVersion({
        cwd: repo.path,
        packageName: 'rhachet-roles-ehmpathy',
      });

      return { repo, versionBefore };
    });

    when('[t0] before upgrade', () => {
      then('.agent/ has no linked roles', () => {
        // verify the fixture has no .agent directory
        const agentDirExists = existsSync(join(scene.repo.path, '.agent'));
        expect(agentDirExists).toEqual(false);
      });

      then('rhachet-roles-ehmpathy is at 1.17.20', () => {
        expect(scene.versionBefore).toEqual('1.17.20');
      });
    });

    when('[t1] rhachet upgrade --roles *', () => {
      const result = useBeforeAll(async () => {
        // run the upgrade command with wildcard
        // note: quote the * to prevent shell glob expansion
        const upgradeResult = invokeRhachetCliBinary({
          args: ['upgrade', '--roles', '*'],
          cwd: scene.repo.path,
        });

        // capture version after upgrade
        const versionAfter = getInstalledVersion({
          cwd: scene.repo.path,
          packageName: 'rhachet-roles-ehmpathy',
        });

        return { upgradeResult, versionAfter };
      });

      then('exits with status 0', () => {
        expect(result.upgradeResult.status).toEqual(0);
      });

      then('upgrades rhachet-roles-ehmpathy', () => {
        // version should be >= 1.17.20 (package.json discovery works without link)
        const [major, minor, patch] = result.versionAfter.split('.').map(Number);
        expect(major).toBeGreaterThanOrEqual(1);
        if (major === 1) {
          expect(minor).toBeGreaterThanOrEqual(17);
          if (minor === 17) {
            expect(patch).toBeGreaterThanOrEqual(20);
          }
        }
      });

      then('stdout contains role upgrade summary', () => {
        expect(result.upgradeResult.stdout).toContain('role(s) upgraded');
      });

      then('reinit does NOT run (no linked roles)', () => {
        // reinit outputs "🔧 init" when it runs - should NOT be present
        expect(result.upgradeResult.stdout).not.toContain('🔧 init');
      });

      then('stdout.header matches snapshot', () => {
        const { header } = extractRhachetOutput({
          stdout: result.upgradeResult.stdout,
        });
        expect(header).toMatchSnapshot();
      });

      then('stdout.summary matches snapshot', () => {
        const { summary } = extractRhachetOutput({
          stdout: result.upgradeResult.stdout,
        });
        expect(summary).toMatchSnapshot();
      });
    });
  });

  /**
   * upgrade vs reinit guarantee tests:
   * - package upgrade happens regardless of link status (via package.json discovery)
   * - reinit happens ONLY for linked roles (via .agent/ discovery)
   */

  given('[case9] --roles * with linked role', () => {
    const scene = useBeforeAll(async () => {
      // fixture has .agent/repo=ehmpathy/role=mechanic/ (linked)
      const repo = await genTestTempRepo({
        fixture: 'with-roles-linked',
        install: true,
      });

      const versionBefore = getInstalledVersion({
        cwd: repo.path,
        packageName: 'rhachet-roles-ehmpathy',
      });

      return { repo, versionBefore };
    });

    when('[t0] before upgrade', () => {
      then('.agent/ has linked mechanic role', () => {
        const agentDirExists = existsSync(
          join(scene.repo.path, '.agent', 'repo=ehmpathy', 'role=mechanic'),
        );
        expect(agentDirExists).toEqual(true);
      });
    });

    when('[t1] rhachet upgrade --roles *', () => {
      const result = useBeforeAll(async () => {
        const upgradeResult = invokeRhachetCliBinary({
          args: ['upgrade', '--roles', '*'],
          cwd: scene.repo.path,
        });

        const versionAfter = getInstalledVersion({
          cwd: scene.repo.path,
          packageName: 'rhachet-roles-ehmpathy',
        });

        return { upgradeResult, versionAfter };
      });

      then('exits with status 0', () => {
        expect(result.upgradeResult.status).toEqual(0);
      });

      then('upgrades the package', () => {
        const [major, minor, patch] = result.versionAfter.split('.').map(Number);
        expect(major).toBeGreaterThanOrEqual(1);
        if (major === 1) {
          expect(minor).toBeGreaterThanOrEqual(17);
          if (minor === 17) {
            expect(patch).toBeGreaterThanOrEqual(20);
          }
        }
      });

      then('reinit runs for linked roles', () => {
        // reinit outputs "🔧 init" when it runs
        expect(result.upgradeResult.stdout).toContain('🔧 init');
      });

      then('reinit links the role', () => {
        expect(result.upgradeResult.stdout).toContain('role(s) linked');
      });
    });
  });

  given('[case10] --roles ehmpathy/* with unlinked package', () => {
    const scene = useBeforeAll(async () => {
      // fixture has NO .agent/ directory (not linked)
      const repo = await genTestTempRepo({
        fixture: 'with-roles-packages-pinned',
        install: true,
      });

      return { repo };
    });

    when('[t0] before upgrade', () => {
      then('.agent/ does not exist', () => {
        const agentDirExists = existsSync(join(scene.repo.path, '.agent'));
        expect(agentDirExists).toEqual(false);
      });
    });

    when('[t1] rhachet upgrade --roles ehmpathy/*', () => {
      const result = useBeforeAll(async () => {
        const upgradeResult = invokeRhachetCliBinary({
          args: ['upgrade', '--roles', 'ehmpathy/*'],
          cwd: scene.repo.path,
        });

        const versionAfter = getInstalledVersion({
          cwd: scene.repo.path,
          packageName: 'rhachet-roles-ehmpathy',
        });

        return { upgradeResult, versionAfter };
      });

      then('exits with status 0', () => {
        expect(result.upgradeResult.status).toEqual(0);
      });

      then('upgrades the package', () => {
        const [major, minor, patch] = result.versionAfter.split('.').map(Number);
        expect(major).toBeGreaterThanOrEqual(1);
      });

      then('reinit does NOT run (no linked roles)', () => {
        // reinit outputs "🔧 init" when it runs - should NOT be present
        expect(result.upgradeResult.stdout).not.toContain('🔧 init');
      });

      then('stdout.summary matches snapshot', () => {
        const { summary } = extractRhachetOutput({
          stdout: result.upgradeResult.stdout,
        });
        expect(summary).toMatchSnapshot();
      });
    });
  });

  given('[case11] --roles ehmpathy/* with linked role', () => {
    const scene = useBeforeAll(async () => {
      // fixture has .agent/repo=ehmpathy/role=mechanic/ (linked)
      const repo = await genTestTempRepo({
        fixture: 'with-roles-linked',
        install: true,
      });

      return { repo };
    });

    when('[t0] before upgrade', () => {
      then('.agent/ has linked mechanic role', () => {
        const agentDirExists = existsSync(
          join(scene.repo.path, '.agent', 'repo=ehmpathy', 'role=mechanic'),
        );
        expect(agentDirExists).toEqual(true);
      });
    });

    when('[t1] rhachet upgrade --roles ehmpathy/*', () => {
      const result = useBeforeAll(async () => {
        const upgradeResult = invokeRhachetCliBinary({
          args: ['upgrade', '--roles', 'ehmpathy/*'],
          cwd: scene.repo.path,
        });

        return { upgradeResult };
      });

      then('exits with status 0', () => {
        expect(result.upgradeResult.status).toEqual(0);
      });

      then('reinit runs for linked roles', () => {
        expect(result.upgradeResult.stdout).toContain('🔧 init');
      });

      then('stdout.summary matches snapshot', () => {
        const { summary } = extractRhachetOutput({
          stdout: result.upgradeResult.stdout,
        });
        expect(summary).toMatchSnapshot();
      });
    });
  });

  given('[case12] --roles ehmpathy/mechanic with linked role', () => {
    const scene = useBeforeAll(async () => {
      // fixture has .agent/repo=ehmpathy/role=mechanic/ (linked)
      const repo = await genTestTempRepo({
        fixture: 'with-roles-linked',
        install: true,
      });

      return { repo };
    });

    when('[t0] before upgrade', () => {
      then('.agent/ has linked mechanic role', () => {
        const agentDirExists = existsSync(
          join(scene.repo.path, '.agent', 'repo=ehmpathy', 'role=mechanic'),
        );
        expect(agentDirExists).toEqual(true);
      });
    });

    when('[t1] rhachet upgrade --roles ehmpathy/mechanic', () => {
      const result = useBeforeAll(async () => {
        const upgradeResult = invokeRhachetCliBinary({
          args: ['upgrade', '--roles', 'ehmpathy/mechanic'],
          cwd: scene.repo.path,
        });

        return { upgradeResult };
      });

      then('exits with status 0', () => {
        expect(result.upgradeResult.status).toEqual(0);
      });

      then('reinit runs for the linked role', () => {
        expect(result.upgradeResult.stdout).toContain('🔧 init');
      });

      then('the default brain dir reports as a tree, never a census line', () => {
        // the reinit of a linked role re-renders the repo's brain dir; no actor is
        //   enrolled here. a human reads one `🧠 brain dir` treestruct, never a census line
        //   (`rule.require.treestruct-output`)
        expect(result.upgradeResult.stdout).not.toContain('boot.md (default):');

        // and the corpus still landed — the report shape changed, the render did not
        expect(
          existsSync(
            join(
              scene.repo.path,
              '.agent/.actors/actor.via.slug=.default/brain/.claude/boot.md',
            ),
          ),
        ).toEqual(true);
      });

      then('the brain dir tree is locked to a snapshot', () => {
        // pins the tree's order, glyphs, and words, as `init` and `roles link` do
        // (`rule.require.contract-snapshot-exhaustiveness`). paired with the asserts
        // above, never snapshot-only (`rule.forbid.failhide`)
        expect(
          asBrainDirReportSnapshot({ stdout: result.upgradeResult.stdout }),
        ).toMatchSnapshot();
      });

      then('stdout.summary matches snapshot', () => {
        const { summary } = extractRhachetOutput({
          stdout: result.upgradeResult.stdout,
        });
        expect(summary).toMatchSnapshot();
      });
    });
  });

  given('[case12.1] --roles ehmpathy/mechanic where <repo>/.claude and the default dir hold the same name', () => {
    const scene = useBeforeAll(async () => {
      // both <repo>/.claude and the default dir hold a settings.json. rhachet OWNS the
      //   default brain dir, so the shared name is overwritten rather than refused — and
      //   `<repo>/.claude/settings.json` is the copy the role's own init just merged
      //   permissions into, so it is the live one and it must win
      const repo = await genTestTempRepo({
        fixture: 'with-roles-linked',
        install: true,
      });
      mkdirSync(join(repo.path, '.claude'));
      writeFileSync(join(repo.path, '.claude', 'settings.json'), '{"a":1}\n');
      const defaultDir = join(
        repo.path,
        '.agent',
        '.actors',
        'actor.via.slug=.default',
        'brain',
        '.claude',
      );
      mkdirSync(defaultDir, { recursive: true });
      writeFileSync(join(defaultDir, 'settings.json'), '{"b":2}\n');
      return { repo, defaultDir };
    });

    when('[t0] rhachet upgrade --roles ehmpathy/mechanic', () => {
      const result = useBeforeAll(async () => {
        const upgradeResult = invokeRhachetCliBinary({
          args: ['upgrade', '--roles', 'ehmpathy/mechanic'],
          cwd: scene.repo.path,
          logOnError: false,
        });
        return { upgradeResult };
      });

      then('exits 0 — a shared name is no refusal', () => {
        expect({
          status: result.upgradeResult.status,
          stderr: result.upgradeResult.stderr,
        }).toMatchObject({ status: 0 });
      });

      then('the repo-side copy overwrote the default dir, and the stale one is gone', () => {
        // `{"b":2}` was the default dir's copy. the migration carried the repo-side file
        //   over it, so what remains is what `<repo>/.claude` held at sync time — the
        //   role init's merge, never the stale `b`
        const settings = readFileSync(
          join(scene.defaultDir, 'settings.json'),
          'utf8',
        );
        expect(settings).not.toEqual('{"b":2}\n');
        expect(settings).not.toContain('"b"');
      });

      then('the overwritten row is marked, so a human knows what to diff', () => {
        // an overwrite is silent harm unless the report names the row it replaced — the
        //   one line a human may want to check against git
        expect(result.upgradeResult.stdout).toMatch(
          /\.claude\/settings\.json → \S+ \(replaced\)/,
        );
      });

      then('the brain dir tree is locked to a snapshot', () => {
        // the overwrite is a user-faced surface on the upgrade contract, so it is snapped
        // like every other render in this change
        // (`rule.require.contract-snapshot-exhaustiveness`,
        // `rule.require.test-coverage-by-grain` — a contract owes a snapshot). the
        // asserts above fix the substance; this pins the whole frame — the tree layout,
        // the row order, the `(replaced)` marker — so a reword shows in the pr diff
        expect(
          asBrainDirReportSnapshot({ stdout: result.upgradeResult.stdout }),
        ).toMatchSnapshot();
      });

      then('the hook sync still runs, since the default boot.md rendered', () => {
        // a shared name is no refusal, so the render reaches the hook sweep
        expect(
          existsSync(join(scene.defaultDir, 'boot.md')),
        ).toEqual(true);
      });
    });
  });

  given('[case13] --roles ehmpathy/designer with unlinked role (mechanic is linked)', () => {
    const scene = useBeforeAll(async () => {
      // fixture has .agent/repo=ehmpathy/role=mechanic/ (linked)
      // but designer is NOT linked
      const repo = await genTestTempRepo({
        fixture: 'with-roles-linked',
        install: true,
      });

      return { repo };
    });

    when('[t0] before upgrade', () => {
      then('.agent/ has linked mechanic role', () => {
        const agentDirExists = existsSync(
          join(scene.repo.path, '.agent', 'repo=ehmpathy', 'role=mechanic'),
        );
        expect(agentDirExists).toEqual(true);
      });

      then('.agent/ does NOT have designer role', () => {
        const agentDirExists = existsSync(
          join(scene.repo.path, '.agent', 'repo=ehmpathy', 'role=designer'),
        );
        expect(agentDirExists).toEqual(false);
      });
    });

    when('[t1] rhachet upgrade --roles ehmpathy/designer', () => {
      const result = useBeforeAll(async () => {
        const upgradeResult = invokeRhachetCliBinary({
          args: ['upgrade', '--roles', 'ehmpathy/designer'],
          cwd: scene.repo.path,
        });

        return { upgradeResult };
      });

      then('exits with status 0', () => {
        expect(result.upgradeResult.status).toEqual(0);
      });

      then('reinit does NOT run (designer is not linked)', () => {
        // reinit outputs "🔧 init" when it runs - should NOT be present
        expect(result.upgradeResult.stdout).not.toContain('🔧 init');
      });

      then('stdout.summary matches snapshot', () => {
        const { summary } = extractRhachetOutput({
          stdout: result.upgradeResult.stdout,
        });
        expect(summary).toMatchSnapshot();
      });
    });
  });

  given('[case6] inside rhachet-roles-brain repo with file:. self-reference', () => {
    const scene = useBeforeAll(async () => {
      const repo = await genTestTempRepo({
        fixture: 'with-file-dot-dep',
        install: false,
      });

      return { repo };
    });

    when('[t0] rhachet upgrade --roles brain/thinker', () => {
      const result = useBeforeAll(async () => {
        // upgrade tries to resolve the role, which maps to rhachet-roles-brain
        // since rhachet-roles-brain has file:. version, it should be skipped
        const upgradeResult = invokeRhachetCliBinary({
          args: ['upgrade', '--roles', 'brain/thinker'],
          cwd: scene.repo.path,
          logOnError: false,
        });

        const packageJson = JSON.parse(
          readFileSync(join(scene.repo.path, 'package.json'), 'utf-8'),
        );

        return { upgradeResult, packageJson };
      });

      then('package.json still has rhachet-roles-brain as file:.', () => {
        expect(result.packageJson.dependencies['rhachet-roles-brain']).toEqual(
          'file:.',
        );
      });
    });
  });

  given('[case14] inside rhachet-roles-brain repo with link:. self-reference', () => {
    const scene = useBeforeAll(async () => {
      const repo = await genTestTempRepo({
        fixture: 'with-link-dot-dep',
        install: false,
      });

      return { repo };
    });

    when('[t0] rhachet upgrade --roles brain/thinker', () => {
      const result = useBeforeAll(async () => {
        // upgrade tries to resolve the role, which maps to rhachet-roles-brain
        // since rhachet-roles-brain has link:. version, it should be skipped
        const upgradeResult = invokeRhachetCliBinary({
          args: ['upgrade', '--roles', 'brain/thinker'],
          cwd: scene.repo.path,
          logOnError: false,
        });

        const packageJson = JSON.parse(
          readFileSync(join(scene.repo.path, 'package.json'), 'utf-8'),
        );

        return { upgradeResult, packageJson };
      });

      then('package.json still has rhachet-roles-brain as link:.', () => {
        expect(result.packageJson.dependencies['rhachet-roles-brain']).toEqual(
          'link:.',
        );
      });
    });
  });

  /**
   * .note = the written adapter is a test specimen whose subject IS the unclassified path, so
   *   its bare `Error` falls under `rule.forbid.helpful-error-parents`' specimen carve-out; it
   *   lives in `node_modules` of a temp repo, never under `src/.test/` (fulcrum F51)
   */
  given('[case17] a linked role whose brain adapter refuses every hook write', () => {
    // the fixture's deps are `file:` refs, so the upgrade installs naught and needs no network
    const scene = useBeforeAll(async () => {
      const repo = await genTestTempRepo({ fixture: 'with-role-hooks' });

      // link the role first, so the upgrade has a linked role to re-sync
      const linked = invokeRhachetCliBinary({
        args: ['init', '--roles', 'tester'],
        cwd: repo.path,
      });
      if (linked.status !== 0)
        throw new ConstraintError('init --roles tester failed', {
          stderr: linked.stderr,
          hint: 'run `npm run build` so the linked fixture sees a fresh dist, then re-run',
        });

      // swap in an adapter whose reads succeed and whose writes throw, so each hook write faults
      writeFileSync(
        join(repo.path, 'node_modules/rhachet-brains-test/dist/index.js'),
        [
          'const refuse = async () => { throw new Error("adapter refused the hook write"); };',
          'const getBrainHooks = ({ brain }) => {',
          "  if (brain !== 'claude-code' && brain !== 'anthropic/claude/code') return null;",
          '  return {',
          "    slug: 'claude-code',",
          '    dao: {',
          '      get: { one: async () => null, all: async () => [] },',
          '      set: { findsert: refuse, upsert: refuse },',
          '      del: refuse,',
          '    },',
          '  };',
          '};',
          'module.exports = { getBrainHooks };',
        ].join('\n'),
      );

      return { repo };
    });

    when('[t0] rhachet upgrade --roles test/tester --which local', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['upgrade', '--roles', 'test/tester', '--which', 'local'],
          cwd: scene.repo.path,
          logOnError: false,
        }),
      );

      then('exits 1, since a hook sync fault is a malfunction', () => {
        expect(result.status).toEqual(1);
      });

      then('stdout names the fault set under ONE header, once', () => {
        // one fault set renders one way: a single header, with its rows, on one stream
        expect(result.stdout).toContain(
          '💥 MalfunctionError: 1 hook sync error — role hooks may be uninstalled',
        );
        expect(result.stdout.split('hook sync error')).toHaveLength(2);
      });

      then('the fix hint rides the SAME stream as the faults it names', () => {
        expect(result.stdout).toContain(
          'hint: hooks did not land — fix the hook sync faults above, then rerun `rhx upgrade`',
        );
        expect(result.stderr).not.toContain('hook');
      });

      then('stdout.header matches snapshot', () => {
        const { header } = extractRhachetOutput({ stdout: result.stdout });
        expect(asSnapshotSafe(header)).toMatchSnapshot();
      });
    });
  });
});
