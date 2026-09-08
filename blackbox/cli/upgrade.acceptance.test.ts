import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { ConstraintError } from 'helpful-errors';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

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
 * .why = the install captures its child's output and puts the same bytes in two places:
 *   a replay to the terminal, and `metadata.output` on the error it throws. one of those
 *   is owed to the human and the other is owed to a log, so a clamp on the render needs a
 *   token it can follow through both. a token this distinctive cannot arrive by accident,
 *   so a hit is a fact about our own code rather than about the host
 *
 * 🔴 .why a PAIR rather than one token = the error's `output` is bounded to a 20-line TAIL
 *   at its source (`asNpmInstallFailureError`'s `asOutputTail`). a single token cannot
 *   tell a bounded tail from the whole log — it is either in both channels or neither,
 *   whatever the bound does. the pair splits that: the stub prints MORE lines than the
 *   bound keeps, so `HEAD` must fall outside the tail and `TAIL` must sit inside it. a
 *   bound that regressed to keep the WHOLE log reddens on `HEAD`; a bound that regressed
 *   to keep none of it reddens on `TAIL`.
 *
 * .note = deliberately shaped to survive `maskInstallOutput` untouched — they must remain
 *   greppable in a raw stderr read, which is the whole point of them
 */
const PNPM_LOG_MARKER_HEAD = 'RHACHET_TEST_PM_LOG_HEAD_LINE_BEYOND_THE_TAIL';
const PNPM_LOG_MARKER_TAIL = 'RHACHET_TEST_PM_LOG_TAIL_LINE_WITHIN_THE_TAIL';

/**
 * .what = how many filler lines the stub prints between its two markers
 *
 * .why = it must exceed `NPM_INSTALL_OUTPUT_TAIL_LINES` (20), so the head marker is
 *   genuinely pushed out of the tail rather than merely assumed to be. stated as a
 *   comparison rather than a bare number, so a reader can check the claim without a
 *   trip to the source it is calibrated against
 */
const PNPM_LOG_FILLER_LINES = 30;

/**
 * .what = takes the pnpm-presence notice frame out of an upgrade's stdout — its `⚠️`
 *   header, and every row down to the `└──` that terminates the callout
 *
 * .why = the frame is what a human READS, so a snapshot of it catches a broken treestruct,
 *   a lost blank, or a clause in the wrong order — none of which a `toContain` row can see.
 *
 * 🚨 the window closes on the `└──` TERMINATOR, never on a fixed row count. a count is a
 *   second owner of the notice's length, so a row ADDED to the notice falls outside a
 *   counted window and the snapshot stays green over a render that changed — the
 *   unfaithful-fixture defect, inside the clamp meant to catch it. the terminator is the
 *   treestruct's own declaration of where it ends, so it tracks the render by construction.
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

  // summary = lines that start with ✨
  const summaryLines = lines.filter((line) => line.includes('✨'));

  return {
    header: headerLines.join('\n').trim(),
    summary: summaryLines.join('\n').trim(),
  };
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
 * .why  = the install error carries the package manager's WHOLE captured log in
 *   `metadata.output`, and node's own crash renderer prints every metadata field. so an
 *   uncaught install failure dumps a live registry response into this snapshot — here, a
 *   404 body from registry.npmjs.org, complete with its own url and prose.
 *
 *   two properties of this snapshot break if that payload is kept verbatim:
 *   - **determinism** — the text is npm's to reword, and the reword would redden a
 *     snapshot whose declared subject is the lead-dash sentinel decode, never how the
 *     registry words a 404. a red for a reason outside its own subject trains a reader to
 *     resnap without a look, which is how a clamp becomes a decoration
 *   - **legibility** — the field is JSON-encoded, so its ansi codes survive as literal
 *     `\u001b[41m` text. `stripAnsiCodes` cannot reach them (they are no longer control
 *     bytes), and they render as noise (rule.forbid.snapshot-visual-blemishes)
 *
 * .note = it masks the VALUE and keeps the KEY, deliberately. that the error carries the
 *   captured log at all is a real, assertable property of the contract — so the snapshot
 *   still goes red if the field disappears. only the payload it cannot own is dropped.
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
        // 🚨 the ERGONOMICS half of the class split, and it was not designed for —
        //   it was measured when this snapshot moved. `invoke.ts` frames a
        //   `ConstraintError` (a `HelpfulError` leaf) into a clean `✋` report; a
        //   raw `BadRequestError`/bare `Error` still escapes as an uncaught throw.
        //   so before this change a typo'd slug printed a stack trace whose caret
        //   pointed at OUR `return new MalfunctionError(` line, as though our
        //   construction site were the fault.
        //
        //   a stack trace as a human's error output is a blocker under
        //   `rule.require.errors-name-the-fix`, so this row locks the frame rather
        //   than leave it a side effect a later refactor could silently undo.
        //
        //   `MalfunctionError` — the local install's `timed-out`/`unclassified`
        //   family member — now takes the same frame: `invoke.ts` widened its
        //   catch from `BadRequestError` to `HelpfulError`, the base both leaves
        //   share, so the two classes no longer disagree on this path. `[case16]`
        //   below clamps that other leaf directly
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

  // 🚨 THE REAL-BINARY FRAME for the unreadable-probe notice, and the reason it lives at
  //   the acceptance tier rather than beside the renderer: the notice is a bare
  //   `console.log`, so a captured-stream unit clamp proves its PAYLOAD and says naught
  //   about whether a human ever SEES it. **payload ≠ screen** — a render can be correct
  //   and unreachable, and only a run through the compiled binary tells the two apart.
  //
  //   the scene is HERMETIC by construction: three stubs prepended to PATH decide every
  //   ambient read this path makes, so the case reaches no network and never writes into
  //   the host's real global store (`rule.require.hermetic-tests`)
  given('[case15] the pnpm-presence probe never answers', () => {
    const scene = useBeforeAll(async () => {
      const repo = await genTestTempRepo({ fixture: 'minimal' });
      const stubDir = genTempDir({ slug: 'pnpm-probe-wedged' });

      // `rhx` is read as TEXT by getGlobalRhachetVersion, which matches `rhachet@<semver>`.
      // it is what makes the global branch run at all, with no real global install present
      writeFileSync(join(stubDir, 'rhx'), '#!/bin/sh\n# rhachet@1.0.0\n', {
        mode: 0o755,
      });

      // `pnpm` dies by SIGNAL, so the probe yields `unreadable` rather than a verdict.
      // ⚠️ a signal death is chosen over a hang deliberately — it reaches the same branch
      //   in milliseconds, where a hang would cost the probe's full bound, TWICE (it
      //   retries). a test that waits 20s to prove a render is a test nobody keeps
      writeFileSync(join(stubDir, 'pnpm'), '#!/bin/sh\nkill -9 $$\n', {
        mode: 0o755,
      });

      // `npm` is a no-op that exits 0 — the fallback install must not reach the network,
      // and must never touch the real global store of the host that runs this suite
      writeFileSync(join(stubDir, 'npm'), '#!/bin/sh\nexit 0\n', {
        mode: 0o755,
      });

      // ⚠️ `--which global` is REQUIRED, and its absence is what makes this frame subtle:
      //   `--self` alone only adds `rhachet` to the LOCAL list, and the local path never
      //   probes for pnpm. only the global target reaches `getPnpmPresence`, so a run
      //   without this flag renders no notice and would pass a weaker assertion silently
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
        // 🚨 the row acceptance #3 rests on. before this, the only proof the notice
        //   rendered was a captured stream inside the process that wrote it
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
        // 🚨 the `toContain` rows above prove each CLAUSE reached the human; they cannot
        //   prove the frame READS well — a broken treestruct, a lost blank line, or a
        //   clause in the wrong order satisfies every one of them. the peer frame
        //   (`enroll.reach.acceptance.test.ts [case4]`) was snapped and this one was not,
        //   so acceptance #3's second half rested on assertions that cannot see layout.
        //
        // .why sliced, never the whole stdout = the rest of the upgrade output carries a
        //   version and a package list that drift for reasons unrelated to this notice.
        //   the frame itself is invariant — its one variable is the timeout, derived from
        //   `PROBE_TIMEOUT_MS`, so a change to that bound SHOULD redden this row
        expect(
          asPnpmNoticeFrame({ stdout: scene.result.stdout }),
        ).toMatchSnapshot();
      });
    });
  });

  // 🚨 THE CLAMP for the gap `[case2b]` named but never recorded: a `MalfunctionError`
  //   thrown off the LOCAL install path (`execNpmInstallLocal` -> `asNpmInstallFailureError`,
  //   the `timed-out`/`unclassified` rows) had no try/catch above it anywhere in the call
  //   chain, so it escaped `invoke.ts`'s only catch (which matched `BadRequestError` alone)
  //   and surfaced as a raw, unhandled node crash dump — on the DEFAULT upgrade target, for
  //   the one failure kind that carries the most load-bearing hint in the file (a stalled
  //   pnpm may still hold its store lock).
  //
  //   fixed by widening `invoke.ts`'s catch from `BadRequestError` to `HelpfulError`, the
  //   shared base both `ConstraintError` and `MalfunctionError` extend — a single site, no
  //   change to either leaf's own exit code (`getExitCodeFromError` already reads
  //   `.code.exit` generically)
  given('[case16] local install dies by signal (unclassified) — the human sees a framed report, never a raw crash dump', () => {
    const scene = useBeforeAll(async () => {
      const repo = await genTestTempRepo({ fixture: 'minimal' });
      const stubDir = genTempDir({ slug: 'pnpm-local-crash' });

      // `pnpm` dies by SIGNAL rather than hang — it reaches the SAME `unclassified`
      // branch a real 5-minute timeout would (`execNpmInstall`'s `result.signal !== null`
      // row), in milliseconds rather than the full install bound. see `[case15]`'s own
      // note for why a signal death is chosen over a genuine wait
      //
      // 🚨 .why it PRINTS a LOG before it dies = this stub used to be silent, and that
      //   silence is what kept a real defect invisible here. `execNpmInstall` CAPTURES the
      //   package manager's output, replays it to the terminal, then puts the same bytes
      //   into `metadata.output` on the error it throws. so a renderer that mishandles
      //   that field prints the log a SECOND time and buries the one sentence that names
      //   the fix beneath bytes the human just watched scroll past.
      //
      //   ⚠️ a stub with NO output yields empty metadata, so the double print has naught
      //   to double and the case stays green whether or not the defect is present. that is
      //   `rule.require.clamp-edge-cases`'s "a clamp not watched red is a guess", produced
      //   by a fixture rather than by an assertion.
      //
      // 🔴 .why the log is LONGER than the tail bound = the guarantee under test is no
      //   longer "the bytes reach exactly one channel". `asCliErrorFrame` renders metadata
      //   UNREDACTED on purpose — the metadata is where the fix lives — so the tail DOES
      //   reach the human's error, by design. what still must hold is that it arrives
      //   BOUNDED and BELOW the hint. a one-line log cannot tell those apart from a
      //   render that dumps everything, so the stub emits more lines than the bound keeps
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

      // `--which local` isolates the path under test — no global branch to consider,
      // matching `[case15]`'s use of `--which global` for the same reason in reverse
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
        // .why 1, not 2 = `rule.require.exit-code-semantics`: exit 1 reads "may be
        //   transient, retry might help" — the honest claim for a package manager that
        //   died of a signal for a reason this classifier cannot see in its own output
        expect(scene.result.status).toEqual(1);
      });

      then('the human reads a framed report, never a node crash dump', () => {
        // before the `invoke.ts` widening, this exact scene printed a raw unhandled
        // rejection whose caret pointed at `asNpmInstallFailureError`'s own
        // `return new MalfunctionError(` line
        expect(scene.result.stderr).not.toContain('    at ');
        expect(scene.result.stderr).not.toContain('Node.js v');
      });

      then('the message names the cause and a diagnostic next step', () => {
        expect(scene.result.stderr).toContain('cause unclassified');
        expect(scene.result.stderr).toContain('rhx --version');
      });

      // 🚨 THE QUARTET that clamps how the captured log reaches a human. no row proves
      //   it alone, and they are deliberately in tension — two demand the tail be
      //   PRESENT in the error, two demand it be CONTAINED there. a render that drops
      //   metadata satisfies the containment rows and reddens the presence rows; a
      //   render that dumps everything does the reverse.
      //
      // 🔴 .why the old single row is GONE = it asserted the log never appears in stderr
      //   at all, and cited `error.redact(['metadata']).message` as the mechanism. that
      //   render is retired: metadata is now UNREDACTED by contract, because metadata is
      //   where the fix lives (`asCliErrorFrame`'s own `🔴 .note`), so a redact here
      //   would invert `rule.require.errors-name-the-fix`. the CONCERN the row carried —
      //   that the bulk must never bury the fix — is real and outlived its mechanism, so
      //   it is re-clamped below against the two guards that actually deliver it now:
      //   the tail bound at the source, and the hint-first ordering in the frame
      then('the whole package manager log is replayed on stdout — head and tail', () => {
        // the REPLAY channel owes the human every byte their package manager wrote; it
        // is the error's metadata that is bounded, never this
        expect(scene.result.stdout).toContain(PNPM_LOG_MARKER_HEAD);
        expect(scene.result.stdout).toContain(PNPM_LOG_MARKER_TAIL);
      });

      then('the error keeps the log TAIL — metadata is never stripped', () => {
        // .why = the hint says *"read the pnpm output above — its last error line names
        //   the cause"*, so the tail IS the diagnosis. a `--output json` consumer, or a
        //   human whose terminal already scrolled, has no other way to reach it
        expect(scene.result.stderr).toContain(PNPM_LOG_MARKER_TAIL);
      });

      then('but BOUNDS it — the head of the log is outside the tail', () => {
        // 🚨 the row that parts "unredacted" from "unbounded". `asOutputTail` keeps the
        //   last 20 lines, and the stub printed well past that, so a bound that
        //   regressed to the whole log reddens HERE rather than in a reviewer's eye
        expect(scene.result.stderr).not.toContain(PNPM_LOG_MARKER_HEAD);
      });

      then('and never lets the log bury the fix — hint renders first', () => {
        // 🚨 the guarantee that REPLACED the redaction. `JSON.stringify` walks insertion
        //   order and the error writes `output` among its other fields, so without
        //   `asCliErrorFrame`'s hint-first reorder the fix sentence renders UNDERNEATH
        //   the log tail — which is the exact harm the old redact row was defending
        //   against, by the cruder means of dropping the log entirely
        const at = (needle: string): number => scene.result.stderr.indexOf(needle);
        expect(at('"hint"')).toBeGreaterThan(-1);
        expect(at(PNPM_LOG_MARKER_TAIL)).toBeGreaterThan(at('"hint"'));
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

      then('stdout.summary matches snapshot', () => {
        const { summary } = extractRhachetOutput({
          stdout: result.upgradeResult.stdout,
        });
        expect(summary).toMatchSnapshot();
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
});
