import { ConstraintError } from 'helpful-errors';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import {
  asCliErrorFrameFromOutput,
  asCliErrorJsonFromOutput,
  asCloneReachBreadcrumbFromOutput,
  asCloneSocketTraceFromOutput,
} from '@/blackbox/.test/infra/asCliErrorReadouts';
import {
  setupEnrollFixture,
  setupRichStubBrainPath,
} from '@/blackbox/.test/infra/enrollCloneHarness';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { spawnRhachetCliBackground } from '@/blackbox/.test/infra/spawnRhachetCliBackground';
// the ONE owner of the crumb's text. an exact-text read through it beats a shape regex:
// the regex re-derives the short-serial rule in a second place, and matches ANY clone
import { asCloneReachBreadcrumb } from '@src/domain.operations/clone/asCloneReachBreadcrumb';
import { asPtyAddonFileName } from '@src/.test/assets/asPtyAddonFileName';

import { accessSync, constants } from 'node:fs';
import { join } from 'node:path';

/**
 * .what = refuses, loudly, on a host whose pty-support verdict is not the one the
 *   class-split cases assert
 *
 * 🚨 `[case4]`–`[case6]` pin an exit code and a glyph that `getPtyPlatformSupport` decides
 *   from the HOST. a darwin runner answers `supported` whatever the libc stub says, and a
 *   freebsd one answers `unsupported` — so the same rows would report a host mismatch as a
 *   defect in the class split.
 *
 * ⚠️ it FAILS, never skips. an absent precondition is a blocker here, not a pass
 *   (`rule.forbid.faked-or-quarantined-acceptance`), and the hint names who must act.
 */
const assertGlibcLinuxHost = (input: { label: string }): void => {
  if (process.platform === 'linux') return;
  throw new ConstraintError(
    `${input.label} pins a linux/glibc pty-support verdict, and this host is not one`,
    {
      hint: 'run this case on a linux runner — on darwin every libc reads `supported`, and on freebsd every libc reads `unsupported`, so neither can drive the class split',
      platform: process.platform,
      arch: process.arch,
    },
  );
};

/**
 * .what = a runtime dir that EXISTS, is short, and cannot be written to — so a clone
 *   socket derived beneath it faults at `bind` with a real, structured errno
 *
 * 🚨 .why a HOST dir rather than a scratch one, which reads backwards until the arithmetic
 *   is done = a unix address is capped at ~107 bytes of `sun_path`, and
 *   `getCloneSocketPath` appends `/clone.<serial:36>.<homeHash:8>.sock` — 57 bytes — to
 *   whatever `$XDG_RUNTIME_DIR` holds. so the runtime dir must fit in ~50 bytes, and
 *   `genTempDir` cannot: its own base is `<gitroot>/.temp/genTempDir.symlink/<stamp>.<slug>.<hash>`
 *   at 149 bytes here, and its physical `/tmp/test-fns/<repo>/.temp/...` twin is ~89. both
 *   overrun the cap before a single byte of the socket name is written.
 *
 * 🚨 .why that is not a nuisance but the WHOLE reason this helper exists = an over-cap path
 *   does NOT fault. measured 2026-09-05: node fires `'listening'`, having bound at a
 *   silently TRUNCATED address, and the fault surfaces later as an unrelated `chmod`
 *   `ENOENT`. so a scratch-dir fixture would not have produced a weaker bind fault — it
 *   would have produced a DIFFERENT defect and asserted against the wrong one.
 *
 * ✅ `/proc` creates no file and removes none. it is mode `555` on every linux host, and
 *   procfs refuses a create even for uid 0 — so unlike `/` (mode `755`) this cannot silently
 *   BIND in a root container and leave an orphan socket behind. the writability is asserted
 *   rather than assumed, so a host that breaks that premise fails loud instead of green.
 */
const getUnwritableShortRuntimeDir = (input: { label: string }): string => {
  const dir = '/proc';

  // ⚠️ FAIL, never skip — a host where this is writable would bind successfully and turn
  //   the case into a silent pass over an unexercised path
  //   (`rule.forbid.faked-or-quarantined-acceptance`)
  const refusal = ((): NodeJS.ErrnoException | null => {
    try {
      accessSync(dir, constants.W_OK);
      return null;
    } catch (error) {
      return error as NodeJS.ErrnoException;
    }
  })();

  if (!refusal)
    throw new ConstraintError(
      `${input.label} needs an unwritable runtime dir to fault the bind, and ${dir} is writable on this host`,
      {
        hint: `run this case as a non-root user on a host with a read-only ${dir}`,
        dir,
        uid: process.getuid?.() ?? null,
      },
    );

  // 🚨 allowlist the refusal, never absorb it. EACCES/EPERM/EROFS each mean the dir EXISTS
  //   and refuses a write — which IS the premise. every other code means the premise is
  //   absent, above all ENOENT on a host with no procfs, and a bare `catch → false` reads
  //   that as "unwritable" and lets the case proceed over an unexercised path
  //   (`rule.forbid.failhide`). the docblock above claims this helper fails loud rather
  //   than green; the allowlist is what makes that claim true
  if (!['EACCES', 'EPERM', 'EROFS'].includes(refusal.code ?? ''))
    throw new ConstraintError(
      `${input.label} needs ${dir} to exist and refuse a write, and the probe failed for another reason`,
      {
        hint: `run this case on a linux host, where ${dir} is procfs at mode 555`,
        dir,
        code: refusal.code ?? null,
        probeError: refusal.message,
      },
    );

  return dir;
};

/**
 * .what = blackbox acceptance for the enroll REACH surfaces — the outputs a human or
 *   machine reads off an enroll so a clone is not a dead end: the bare-enroll F7
 *   breadcrumb, the `--output json` machine handoff, and the `--no-socket` fallback
 * .why =
 *   - these surfaces need a REAL tty (the socket + the mirror only exist under a
 *     pty), so they are proven through the OUTER pty spawn — never a spawnSync
 *   - each traces to a criteria usecase.11 line: the bare-enroll breadcrumb (a
 *     human reaches their own clone), the json handoff (a supervisor reads the
 *     serial), and the socketless clone marked DEAF in list
 */
describe('rhx enroll reach surfaces (acceptance)', () => {
  given('[case1] a bare enroll with NO --as name', () => {
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'enroll-bare' });
      const configDir = genTempDir({ slug: 'enroll-bare-cfg' });
      setupEnrollFixture({ dir });
      const stubPath = setupRichStubBrainPath({ dir });
      const env = { PATH: stubPath, CLAUDE_CONFIG_DIR: configDir };

      // enroll with NO --as, through the outer pty; the F7 breadcrumb is emitted
      const bg = spawnRhachetCliBackground({
        args: ['enroll', 'claude'],
        cwd: dir,
        env,
      });
      // wait until the stub is ready (proves enroll spawned the clone), and KEEP the
      // serial it announced — the breadcrumb assert below reads the expected crumb from
      // its one owner, which needs the clone's identity rather than a shape guess
      const [, serial] = await bg.waitForOutput({
        pattern: /ready serial=([0-9a-f-]{36})/,
        timeoutMs: 20000,
      });
      return { dir, env, bg, serial: serial! };
    });
    afterAll(async () => {
      await scene.bg.kill();
    });

    when('[t0] the clone spawns without a name', () => {
      then('a breadcrumb names how the human reaches their own clone', () => {
        // the F7 crumb names the serial-addressed reach so a bare enroll is not a dead
        // end (rule.require.discoverability); it goes to stderr, mirrored into the pty
        const crumb = asCloneReachBreadcrumbFromOutput({
          output: scene.bg.getOutput(),
        });

        /**
         * 🚨 an EXACT-TEXT read against the crumb's one owner, never a shape regex. a
         *   `/@:[0-9a-f]{8}\s/` proves only that SOME 8 hex chars sit there — it cannot
         *   tell the right clone's prefix from any other, and it re-derives the
         *   short-serial rule a second time, in a second place, from a second owner
         *   (`rule.require.named-transformers`). the owner already carries that rule and
         *   is unit-clamped on it, so this row asserts the cli emits ITS answer.
         */
        expect(crumb).toEqual(
          asCloneReachBreadcrumb({
            slug: null,
            serial: scene.serial,
            reachable: true,
          }),
        );

        /**
         * ⚠️ the regression guard the equality does NOT subsume. an equality reddens on
         *   any drift; this row names WHICH drift matters most here — a return to the
         *   36-char form (`rule.require.short-serial-for-unslugged-clones`) — so the
         *   failure reads as "the full uuid came back" rather than as a text diff.
         */
        expect(crumb).not.toContain(scene.serial);
      });

      then('the bare-enroll breadcrumb tree is locked (human variant)', () => {
        // the tree twin of case2c's bare-enroll json handoff
        // (rule.require.contract-snapshot-exhaustiveness). the pty stream carries
        // brain-boot noise, so only the rhachet-authored breadcrumb rows, serial
        // masked, are deterministic enough to snap
        const breadcrumb = asCloneReachBreadcrumbFromOutput({
          output: scene.bg.getOutput(),
        });
        expect(asSnapshotSafe(breadcrumb)).toMatchSnapshot();
      });
    });
  });

  given('[case2] an enroll with --output json (the machine handoff)', () => {
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'enroll-json' });
      const configDir = genTempDir({ slug: 'enroll-json-cfg' });
      setupEnrollFixture({ dir });
      const stubPath = setupRichStubBrainPath({ dir });
      const env = { PATH: stubPath, CLAUDE_CONFIG_DIR: configDir };

      const bg = spawnRhachetCliBackground({
        args: ['enroll', 'claude', '--as', '@:super', '--output', 'json'],
        cwd: dir,
        env,
      });
      // wait for the json handoff line the supervisor consumes
      const handoff = await bg.waitForOutput({
        pattern: /\{"outcome":[^\n]*\}/,
        timeoutMs: 20000,
      });
      return { dir, env, bg, handoffRaw: handoff[0] };
    });
    afterAll(async () => {
      await scene.bg.kill();
    });

    when('[t0] the machine reads stdout', () => {
      then('a parseable handoff carries the clone`s serial + reachability', () => {
        const parsed = JSON.parse(scene.handoffRaw) as {
          outcome: string;
          serial: string;
          slug: string | null;
          socketEligible: boolean;
        };
        expect(parsed.outcome).toEqual('baked');
        expect(parsed.serial).toMatch(/^[0-9a-f-]{36}$/);
        expect(parsed.slug).toEqual('super');
        expect(parsed.socketEligible).toEqual(true);
      });

      then('the json handoff shape is locked (machine contract)', () => {
        // the serial (a uuid) is masked; outcome/slug/socketEligible are stable —
        // this locks the machine handoff a supervisor parses against field drift
        expect(asSnapshotSafe(scene.handoffRaw)).toMatchSnapshot();
      });
    });
  });

  given('[case2t] a NAMED enroll in DEFAULT tree mode (the human variant)', () => {
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'enroll-named-tree' });
      const configDir = genTempDir({ slug: 'enroll-named-tree-cfg' });
      setupEnrollFixture({ dir });
      const stubPath = setupRichStubBrainPath({ dir });
      const env = { PATH: stubPath, CLAUDE_CONFIG_DIR: configDir };

      // the tree twin of case2's --as json handoff: enroll the SAME named clone in
      // default (tree) mode, so we lock the human experience of a NAMED enroll
      const bg = spawnRhachetCliBackground({
        args: ['enroll', 'claude', '--as', '@:super'],
        cwd: dir,
        env,
      });
      await bg.waitForOutput({
        pattern: /ready serial=([0-9a-f-]{36})/,
        timeoutMs: 20000,
      });
      return { dir, env, bg };
    });
    afterAll(async () => {
      await scene.bg.kill();
    });

    when('[t0] the NAMED clone spawns in tree mode', () => {
      /**
       * 🚨 .what = a NAMED enroll emits the reach breadcrumb, addressed by its SLUG
       *
       * .why = this case asserted the OPPOSITE until 2026-09-06 — `not.toContain`,
       *   under the comment *"a named enroll needs no reach hint"*. that comment was
       *   a driver's scope call written as though settled, and the wisher reversed it.
       *
       *   ⚠️ the old row was a test that proved an ABSENCE, which is the weakest shape
       *   a clamp can take: it passes for the right reason and for every wrong one
       *   (a crashed enroll emits no breadcrumb either). the row now pins a PRESENCE
       *   and the exact address, so it fails if the line is dropped OR misaddressed.
       *
       * .why the slug, not the serial = `@:<slug>` is the clone's unique ref — the
       *   address the human typed at `--as` and will retype (define.address-sigils)
       */
      then('the breadcrumb is shown, addressed by the slug the human chose', () => {
        const out = scene.bg.getOutput();
        expect(out).toContain('😶 clone enrolled');
        expect(out).toContain('rhx clone say @:super --what');

        // the read-back half carries the SAME address — a split would hand the human a
        // say that reaches one clone and a get that reads another
        expect(out).toContain('rhx clone get @:super --tail');
      });
    });
  });

  given('[case2c] a bare enroll (no --as) with --output json — the DEFAULT machine handoff', () => {
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'enroll-json-default' });
      const configDir = genTempDir({ slug: 'enroll-json-default-cfg' });
      setupEnrollFixture({ dir });
      const stubPath = setupRichStubBrainPath({ dir });
      const env = { PATH: stubPath, CLAUDE_CONFIG_DIR: configDir };

      // no --as, so the handoff carries slug=null — the default machine contract, a
      // distinct variant from the --as one above
      // (rule.require.contract-snapshot-exhaustiveness, uc.11)
      const bg = spawnRhachetCliBackground({
        args: ['enroll', 'claude', '--output', 'json'],
        cwd: dir,
        env,
      });
      const handoff = await bg.waitForOutput({
        pattern: /\{"outcome":[^\n]*\}/,
        timeoutMs: 20000,
      });
      return { dir, env, bg, handoffRaw: handoff[0] };
    });
    afterAll(async () => {
      await scene.bg.kill();
    });

    when('[t0] the machine reads stdout', () => {
      then('a parseable handoff carries the serial + a NULL slug (unnamed default)', () => {
        const parsed = JSON.parse(scene.handoffRaw) as {
          outcome: string;
          serial: string;
          slug: string | null;
          socketEligible: boolean;
        };
        expect(parsed.outcome).toEqual('baked');
        expect(parsed.serial).toMatch(/^[0-9a-f-]{36}$/);
        // NO --as → the clone is unnamed, so the machine handoff reports slug=null
        expect(parsed.slug).toEqual(null);
        expect(parsed.socketEligible).toEqual(true);
      });

      then('the default json handoff shape is locked (slug=null machine contract)', () => {
        // the serial (a uuid) is masked; outcome/slug/socketEligible are stable — this
        // locks the DEFAULT (unnamed) machine handoff, distinct from the --as variant
        expect(asSnapshotSafe(scene.handoffRaw)).toMatchSnapshot();
      });
    });
  });

  given('[case3] an enroll with --no-socket (the fallback)', () => {
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'enroll-nosock' });
      const configDir = genTempDir({ slug: 'enroll-nosock-cfg' });
      setupEnrollFixture({ dir });
      const stubPath = setupRichStubBrainPath({ dir });
      const env = { PATH: stubPath, CLAUDE_CONFIG_DIR: configDir };

      const bg = spawnRhachetCliBackground({
        args: ['enroll', 'claude', '--as', '@:plain', '--no-socket'],
        cwd: dir,
        env,
      });
      await bg.waitForOutput({
        pattern: /ready serial=([0-9a-f-]{36})/,
        timeoutMs: 20000,
      });
      return { dir, env, bg };
    });
    afterAll(async () => {
      await scene.bg.kill();
    });

    when('[t0] `clone list` after a socketless enroll', () => {
      then('the clone appears DEAF (no socket stood up)', () => {
        const listed = invokeRhachetCliBinary({
          args: ['clone', 'list'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        });
        expect(listed.status).toEqual(0);
        expect(listed.stdout).toContain('plain');
        expect(listed.stdout).toContain('DEAF');
      });

      then('the socketless clone-list format is locked (visual spot-check)', () => {
        const listed = invokeRhachetCliBinary({
          args: ['clone', 'list'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        });
        expect(asSnapshotSafe(listed.stdout)).toMatchSnapshot();
      });

      then('`clone list --output json` carries reachState=DEAF as a field', () => {
        // machine parity: a cron/comms consumer reads reach-state off a json field,
        // never a tree glyph — so a DEAF clone must serialize `reachState: "DEAF"`
        // in the machine view, not only render "DEAF" in the human tree
        const listed = invokeRhachetCliBinary({
          args: ['clone', 'list', '--output', 'json'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        });
        expect(listed.status).toEqual(0);
        const parsed = JSON.parse(listed.stdout) as {
          actors: { clones: { slug: string | null; reachState: string }[] }[];
        };
        const clonePlain = parsed.actors
          .flatMap((actor) => actor.clones)
          .find((clone) => clone.slug === 'plain');
        expect(clonePlain).toBeDefined();
        expect(clonePlain!.reachState).toEqual('DEAF');
      });

      /**
       * 🚨 .why this row exists = every row above reads the clone AFTER the fact, through
       *   `clone list`. not one of them read what the ENROLL ITSELF printed — so the enroll
       *   could confirm success and name `rhx clone say` on a clone that cannot hear it, and
       *   this whole case would stay green.
       *
       *   ⇒ that gap was live in the tree and the `r010` lane raised it as a blocker at
       *   i075: *"it asserts `clone list` shows DEAF and that `say`/`get` behave correctly,
       *   but never asserts what the enroll's own breadcrumb printed."*
       *
       * ⚠️ the unit clamp in `asCloneReachBreadcrumb.test.ts` `[case5]` proves the VALUE is
       *   right for a `reachable: false` input. it cannot prove the INVOKER passes that
       *   input — a hardcoded `reachable: true` at the call site would leave every unit row
       *   green. only a real enroll, read off its real stderr, closes that seam
       */
      then('the ENROLL ITSELF never promised a say it cannot honor', () => {
        const emitted = scene.bg.getOutput();

        // the confirmation is still owed — a deaf clone did enroll, and silence would read
        // to a human as a failure
        expect(emitted).toContain('clone enrolled');

        // 🔴 the defect this row clamps: the say is the command a DEAF clone refuses, so a
        //   breadcrumb that names it sends the human straight into a loud refusal
        expect(emitted).not.toContain('rhx clone say @:plain');

        // and the cause is named, so the absent branch reads as deliberate rather than lost
        expect(emitted).toContain('deaf');

        // `get` STAYS — a deaf clone is still observable, so the human keeps a real move
        expect(emitted).toContain('rhx clone get @:plain');
      });
    });

    when('[t1] the DEAF clone is addressed by say vs get', () => {
      then('`clone say` is refused loud — a DEAF clone cannot hear a say', () => {
        // the security contract: a socketless clone has no channel to hear a
        // dispatch, so `say` fails loud with the DEAF cause + a fix, never a
        // silent drop (define.invariant.clone-socket-brain-cli-only)
        const said = invokeRhachetCliBinary({
          args: [
            'clone',
            'say',
            '@:plain',
            '--what',
            'hello',
            '--output',
            'json',
          ],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        });
        expect(said.status).toEqual(2);
        const parsed = JSON.parse(said.stderr) as {
          class: string;
          reachState: string;
          reachCause: string;
          message: string;
        };
        expect(parsed.class).toEqual('ConstraintError');
        expect(parsed.reachState).toEqual('DEAF');
        // the finer reachCause surfaces end-to-end through the real cli, so a
        // machine consumer branches on the exact fault (here DEAF == the coarse
        // state, but wedged/exited/cross-host would carry only reachCause)
        expect(parsed.reachCause).toEqual('DEAF');
        expect(parsed.message).toContain('deaf');
        // the DEAF-say json error is token-free (a reach-state refusal carries no
        // serial), so the raw stderr snaps as-is
        // (rule.require.contract-snapshot-exhaustiveness)
        expect(asSnapshotSafe(said.stderr)).toMatchSnapshot();
      });

      then('the DEAF-say human error format is locked (visual spot-check)', () => {
        // the human counterpart of the json refusal above — with no --output json the
        // caller reads the `✋ … deaf …` message plus its fix on stderr
        // (rule.require.contract-snapshot-exhaustiveness)
        const said = invokeRhachetCliBinary({
          args: ['clone', 'say', '@:plain', '--what', 'hello'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        });
        expect(said.status).toEqual(2);
        expect(said.stderr.toLowerCase()).toContain('deaf');
        expect(asSnapshotSafe(said.stderr)).toMatchSnapshot();
      });

      then('`clone get` still observes it — DEAF is observe-only, not dead', () => {
        // get reads the brain-cli`s own transcript, not the socket, so a DEAF
        // clone stays observable (exit 0) even with no dispatch channel
        const got = invokeRhachetCliBinary({
          args: ['clone', 'get', '@:plain'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        });
        expect(got.status).toEqual(0);
        // rule.require.status-feedback: a DEAF clone that took no say has an empty
        // conversation, and the read must NAME that state rather than print blank
        // stdout
        expect(got.stdout).toContain('(no messages yet)');
        // `get` on a socketless clone is a DISTINCT output variant — say is refused,
        // get succeeds (rule.require.contract-snapshot-exhaustiveness)
        expect(asSnapshotSafe(got.stdout)).toMatchSnapshot();
      });
    });

    when('[t2] a MULTI-LINE message is dispatched via say', () => {
      then('a multi-line say is ACCEPTED at the input layer — no longer refused for its newlines', () => {
        // multi-line `say` is SUPPORTED: asCloneDispatchFrame maps each interior `\n`
        // to the soft-newline escape (Shift/Option-Enter), so the whole block lands as
        // ONE turn. `@:plain` is DEAF, so this lands on the reach-state refusal (exit
        // 2, DEAF) — the SAME path a single-line say takes, which is what proves the
        // newlines are not what stopped it
        const said = invokeRhachetCliBinary({
          args: ['clone', 'say', '@:plain', '--what', '@stdin', '--output', 'json'],
          cwd: scene.dir,
          env: scene.env,
          stdin: 'line one\nline two\n',
          logOnError: false,
        });
        expect(said.status).toEqual(2);
        const parsed = JSON.parse(said.stderr) as {
          class: string;
          reachState: string;
        };
        // it got PAST the input layer to the DEAF reach refusal — NOT a multi-line refusal
        expect(parsed.reachState).toEqual('DEAF');
        expect(said.stderr.toLowerCase()).not.toContain('multi-line');
      });

      then('a single-line say with a lone TAIL newline is NOT refused', () => {
        // a lone tail newline precedes the submit `\r` and is harmless — the guard
        // must trim one tail newline before the interior check, so a normal piped
        // single-line message (which arrives with a tail `\n`) still dispatches.
        // the clone is DEAF, so this reaches the reach-state refusal (exit 2, DEAF),
        // NOT the multi-line refusal — proof the newline guard let it through
        const said = invokeRhachetCliBinary({
          args: ['clone', 'say', '@:plain', '--what', '@stdin', '--output', 'json'],
          cwd: scene.dir,
          env: scene.env,
          stdin: 'just one line\n',
          logOnError: false,
        });
        expect(said.status).toEqual(2);
        const parsed = JSON.parse(said.stderr) as {
          class: string;
          reachState: string;
        };
        // it got PAST the multi-line guard to the DEAF reach refusal
        expect(parsed.reachState).toEqual('DEAF');
      });
    });
  });

  given('[case4] an interactive enroll on a host whose pty addon will NOT load', () => {
    // the verbatim shape node-pty's OWN loader emits when all six candidate dirs miss
    // (`lib/utils.js` → `loadNativeModule`). `isPtyAddonLoadError` matches by EMITTED
    // SHAPE, never by a loose `.node` token, so only the real text drives the marker.
    // the addon filename comes from its ONE owner (`asPtyAddonFileName`) — it is
    // `conpty.node` on win32, and a literal here would be wrong there
    const ptyLoadError = [
      `Failed to load native module: ${asPtyAddonFileName(process.platform)},`,
      `checked: build/Release, build/Debug,`,
      `prebuilds/${process.platform}-${process.arch}:`,
      `Error: Cannot find module`,
      `'./prebuilds/${process.platform}-${process.arch}//${asPtyAddonFileName(process.platform)}'`,
    ].join(' ');

    const scene = useBeforeAll(async () => {
      assertGlibcLinuxHost({ label: '[case4]' });
      const dir = genTempDir({ slug: 'enroll-pty-absent' });
      const configDir = genTempDir({ slug: 'enroll-pty-absent-cfg' });
      setupEnrollFixture({ dir });
      const stubPath = setupRichStubBrainPath({ dir });

      // 🚨 the fault is injected INSIDE the child: the pty addon loads out of rhachet's
      //   own dependency tree, which no env var relocates, so a PATH stub cannot reach
      //   it. a `--require` preload is the one seam that can, and `bin/run.jit` is
      //   plain node, so NODE_OPTIONS is honored
      const preload = join(
        __dirname,
        '../../src/.test/assets/stubPtyAddonAbsent.cjs',
      );
      const env = {
        PATH: stubPath,
        CLAUDE_CONFIG_DIR: configDir,
        NODE_OPTIONS: `--require ${preload}`,
        RHACHET_TEST_PTY_LOAD_ERROR: ptyLoadError,
      };

      // through the OUTER pty, because the report only fires when a socket is WANTED:
      // isCloneSocketEligible = socketCapable ∧ interactive ∧ ¬noSocket. a spawnSync run
      // is non-interactive, so it takes the quiet deaf path and never reaches here
      const bg = spawnRhachetCliBackground({
        args: ['enroll', 'claude'],
        cwd: dir,
        env,
      });
      const exitCode = await bg.waitForExit({ timeoutMs: 30000 });

      // the MACHINE channel of the same fault — a second run, `--output json`. it is
      // what the class split is FOR: a consumer branches on `class`, never on prose
      const bgJson = spawnRhachetCliBackground({
        args: ['enroll', 'claude', '--output', 'json'],
        cwd: dir,
        env,
      });
      const exitCodeJson = await bgJson.waitForExit({ timeoutMs: 30000 });

      return {
        dir,
        bg,
        bgJson,
        exitCode,
        exitCodeJson,
        output: bg.getOutput(),
        outputJson: bgJson.getOutput(),
      };
    });
    afterAll(async () => {
      await scene.bg.kill();
      await scene.bgJson.kill();
    });

    when('[t0] the human reads their terminal', () => {
      then('the enroll is refused LOUD — no clone, no silent degrade', () => {
        // the wish's core complaint inverted: a capability that cannot stand up must SAY
        // so on screen, never hand back a clone that only half works
        expect(scene.output).toContain('the reach socket is unavailable');
        // and no clone was baked — the throw precedes every dir/spawn in genCloneOndisk
        expect(scene.output).not.toContain('😶 clone enrolled');
      });

      then('the GLYPH names whose defect it is — 💥 ours, on a supported host', () => {
        // 🚨 asserted as a RELATION — 💥 present AND `✋ the reach socket` absent —
        //   because a lone `toContain` on one glyph is trivially true for BOTH classes
        //   and can never redden on a misclassification. `asCliErrorGlyph` reads the
        //   glyph off the error's own class.
        //
        //   this host is linux-x64, a platform we ship a prebuild for, so an
        //   unloadable addon is OUR broken artifact: MalfunctionError, 💥
        expect(scene.output).toContain('💥');
        expect(scene.output).not.toContain('✋ the reach socket');
      });

      then('the frame names a fix, and the fix is not the DEAD one', () => {
        // 🚨 `pnpm rebuild node-pty` cannot serve the global case at all (`pnpm
        //   rebuild` has no --global flag), so it is a cure that exits 0 and repairs
        //   naught. its absence is asserted on the RENDERED screen
        expect(scene.output).not.toContain('pnpm rebuild');

        // 🚨 the fix is asserted by its SUBSTANCE, never by the branch marker it renders under.
        //   this row once read `toMatch(/└─ \S/)` — a check that SOME non-space follows a box
        //   character, which is a claim about the frame's LAYOUT and not about whether a fix
        //   reached the human. it passed for any hint at all, a wrong one as readily as the
        //   right one, and it reddened when `asCliErrorFrame` began to render metadata as a
        //   json block rather than a `└─` branch — a change that made the fix MORE visible
        expect(scene.output).toContain('reinstall rhachet');
      });

      then('the exit code carries the CLASS — who must act, for a machine', () => {
        // the class split's machine half. this fixture is DETERMINISTIC: the runner is a
        // glibc host, so it lands on the `supported` row every time — the prebuild ships
        // in the tarball, so an absent addon is OUR broken artifact
        // (MalfunctionError → 1), never the caller's to amend
        //
        // 🚨 ONE exact code, never `expect([1, 2]).toContain(...)` — a set of accepted
        //   codes is the failhide shape (`rule.forbid.failhide`), and it would leave a
        //   flip to 2 green here while the `[t1]` json twin reddened
        expect(scene.exitCode).toEqual(1);
        // …and that it is NOT an unhandled throw: a HelpfulError renders its frame and
        // sets process.exitCode; a raw crash would print a stack trace instead
        expect(scene.output).not.toContain('at Object.<anonymous>');
      });

      then('the pty-absent enroll frame is locked (visual spot-check)', () => {
        // the pty stream carries fixture + brain-boot noise, so only the rhachet-authored
        // error frame — the `<glyph> <Class>: <message>` line plus its metadata block — is
        // deterministic. a payload snapshot cannot pin it: a correct error object rendered through a wrong
        // glyph, a swallowed hint, or a truncated line is still a defect
        // (rule.forbid.snapshot-visual-blemishes)
        const frame = asCliErrorFrameFromOutput({ output: scene.output });
        expect(asSnapshotSafe(frame)).toMatchSnapshot();
      });
    });

    when('[t1] a MACHINE reads the same fault via --output json', () => {
      then('the payload carries the CLASS a consumer branches on', () => {
        // the machine half of the class split: a cron/comms consumer cannot read a
        // glyph — it reads `class`, and on a supported host that must be the
        // MalfunctionError that says "do not retry; this install is broken"
        const parsed = asCliErrorJsonFromOutput({ output: scene.outputJson });
        expect(parsed.class).toEqual('MalfunctionError');
        expect(parsed.message).toContain('the reach socket is unavailable');
      });

      then('the hint survives the json projection, with its datum inline', () => {
        // 🚨 `CliErrorJson` carries no `rhachetRealpath` key, so a hint that POINTS at
        //   that field sends the reader to compare a line this channel never prints.
        //   the datum must stay inline in the hint text
        const parsed = asCliErrorJsonFromOutput({ output: scene.outputJson });
        expect(parsed.hint).toContain('reinstall rhachet');
        expect(parsed.hint).not.toContain('the `rhachetRealpath` above');
      });

      then('the exit code matches the class the payload names', () => {
        // both channels must agree on the party: MalfunctionError → 1. a screen, a
        // payload, and a code that disagree are three reports of one fault
        expect(scene.exitCodeJson).toEqual(1);
      });
    });
  });

  given(
    '[case5] the SAME fault on a host whose libc ships no upstream binary',
    () => {
      // 🚨 the OTHER side of the class split. `[case4]` drives the supported-host row
      //   (💥 ours to repair); this drives the unsupported row (✋ the caller's to
      //   amend). the two carry OPPOSITE cures — "reinstall rhachet" vs "pass
      //   --no-socket" — so a fault that picks the wrong row hands a human a confident
      //   cure that cannot work.
      //
      // .how with no alpine runner = the row turns on `getLibcFromProcess`, which reads
      //   `process.report` — a plain node api on a mutable object. so a musl host is not
      //   needed; a musl-shaped REPORT is. `stubHostLibc.cjs` answers with one, and it
      //   composes with the pty preload as a second `--require` because each asset
      //   injects exactly one fault.
      //
      // ⚠️ it does NOT claim a real alpine host behaves this way — alpine is out of
      //   scope per the vision's A9. it claims that GIVEN a musl libc read, the real
      //   binary renders the constraint frame a human meets.
      const ptyLoadError = [
        `Failed to load native module: ${asPtyAddonFileName(process.platform)},`,
        `checked: build/Release, build/Debug,`,
        `prebuilds/${process.platform}-${process.arch}:`,
        `Error: Cannot find module`,
        `'./prebuilds/${process.platform}-${process.arch}//${asPtyAddonFileName(process.platform)}'`,
      ].join(' ');

      const scene = useBeforeAll(async () => {
        assertGlibcLinuxHost({ label: '[case5]' });
        const dir = genTempDir({ slug: 'enroll-pty-musl' });
        const configDir = genTempDir({ slug: 'enroll-pty-musl-cfg' });
        setupEnrollFixture({ dir });
        const stubPath = setupRichStubBrainPath({ dir });

        const preloadPty = join(
          __dirname,
          '../../src/.test/assets/stubPtyAddonAbsent.cjs',
        );
        const preloadLibc = join(
          __dirname,
          '../../src/.test/assets/stubHostLibc.cjs',
        );
        const env = {
          PATH: stubPath,
          CLAUDE_CONFIG_DIR: configDir,
          NODE_OPTIONS: `--require ${preloadPty} --require ${preloadLibc}`,
          RHACHET_TEST_PTY_LOAD_ERROR: ptyLoadError,
          RHACHET_TEST_HOST_LIBC: 'musl',
        };

        const bg = spawnRhachetCliBackground({
          args: ['enroll', 'claude'],
          cwd: dir,
          env,
        });
        const exitCode = await bg.waitForExit({ timeoutMs: 30000 });

        const bgJson = spawnRhachetCliBackground({
          args: ['enroll', 'claude', '--output', 'json'],
          cwd: dir,
          env,
        });
        const exitCodeJson = await bgJson.waitForExit({ timeoutMs: 30000 });

        return {
          dir,
          bg,
          bgJson,
          exitCode,
          exitCodeJson,
          output: bg.getOutput(),
          outputJson: bgJson.getOutput(),
        };
      });
      afterAll(async () => {
        await scene.bg.kill();
        await scene.bgJson.kill();
      });

      when('[t0] the human reads their terminal', () => {
        then('the GLYPH says the caller must amend — ✋, never 💥', () => {
          // the assertion that proves the SPLIT rather than the report: swap the row and
          // `[case4]` still passes, only this reddens
          expect(scene.output).toContain('✋');
          expect(scene.output).not.toContain('💥');
        });

        then('the message names the CAUSE this row actually has', () => {
          // and not the supported row's cause — a row swap must change the words on
          // screen, not only the class
          expect(scene.output).toContain(
            'node-pty ships no prebuilt addon for this platform',
          );
          expect(scene.output).not.toContain('this install is damaged');
        });

        then('the fix is the OPT-OUT, never a reinstall that cannot help', () => {
          // 🚨 "reinstall rhachet" runs clean on a musl host and repairs naught, so the
          //   ABSENCE of the wrong cure is asserted, never only the presence of the right
          expect(scene.output).toContain('--no-socket');
          expect(scene.output).not.toContain('reinstall rhachet');
          expect(scene.output).not.toContain('pnpm rebuild');
        });

        then('the exit code carries the CLASS — the caller must act', () => {
          // ConstraintError → 2. a collapse of both rows into one class leaves
          // `[case4]` green and reddens only here
          expect(scene.exitCode).toEqual(2);
          expect(scene.output).not.toContain('at Object.<anonymous>');
        });

        then('the unsupported-host frame is locked (visual spot-check)', () => {
          const frame = asCliErrorFrameFromOutput({ output: scene.output });
          expect(asSnapshotSafe(frame)).toMatchSnapshot();
        });
      });

      when('[t1] a MACHINE reads the same fault via --output json', () => {
        then('the payload names the class the caller branches on', () => {
          const parsed = asCliErrorJsonFromOutput({
            output: scene.outputJson,
          });
          // the whole point of the split, for a consumer that cannot read a glyph
          expect(parsed.class).toEqual('ConstraintError');
          expect(parsed.hint).toContain('--no-socket');
        });

        then('both channels agree on the party', () => {
          expect(scene.exitCodeJson).toEqual(2);
        });
      });
    },
  );

  given(
    '[case6] the SAME fault on a host whose libc could not be read at all',
    () => {
      // 🚨 the THIRD row of the class split, and the only one whose hint names TWO cures.
      //   `[case4]` proves the supported row (💥 reinstall) and `[case5]` the unsupported
      //   row (✋ --no-socket). here we do NOT know which of the two applies, so the hint
      //   names a DIAGNOSTIC (`ldd --version`) and routes each answer to its own cure.
      //   every assertion the peers make by ABSENCE is inverted here.
      //
      // ⚠️ LINUX-ONLY BY CONSTRUCTION, as `[case5]` is. `getPtyPlatformSupport` reaches
      //   `unknown` only when the platform is linux AND the libc read returned naught —
      //   on darwin the platform alone decides `supported`. a `process.platform` override
      //   would stub the very read the decision turns on, so a green row would prove the
      //   stub rather than the code.
      const ptyLoadError = [
        `Failed to load native module: ${asPtyAddonFileName(process.platform)},`,
        `checked: build/Release, build/Debug,`,
        `prebuilds/${process.platform}-${process.arch}:`,
        `Error: Cannot find module`,
        `'./prebuilds/${process.platform}-${process.arch}//${asPtyAddonFileName(process.platform)}'`,
      ].join(' ');

      const scene = useBeforeAll(async () => {
        assertGlibcLinuxHost({ label: '[case6]' });
        const dir = genTempDir({ slug: 'enroll-pty-libc-unreadable' });
        const configDir = genTempDir({
          slug: 'enroll-pty-libc-unreadable-cfg',
        });
        setupEnrollFixture({ dir });
        const stubPath = setupRichStubBrainPath({ dir });

        const preloadPty = join(
          __dirname,
          '../../src/.test/assets/stubPtyAddonAbsent.cjs',
        );
        const preloadLibc = join(
          __dirname,
          '../../src/.test/assets/stubHostLibc.cjs',
        );
        const env = {
          PATH: stubPath,
          CLAUDE_CONFIG_DIR: configDir,
          NODE_OPTIONS: `--require ${preloadPty} --require ${preloadLibc}`,
          RHACHET_TEST_PTY_LOAD_ERROR: ptyLoadError,
          RHACHET_TEST_HOST_LIBC: 'unreadable',
        };

        const bg = spawnRhachetCliBackground({
          args: ['enroll', 'claude'],
          cwd: dir,
          env,
        });
        const exitCode = await bg.waitForExit({ timeoutMs: 30000 });

        const bgJson = spawnRhachetCliBackground({
          args: ['enroll', 'claude', '--output', 'json'],
          cwd: dir,
          env,
        });
        const exitCodeJson = await bgJson.waitForExit({ timeoutMs: 30000 });

        return {
          dir,
          bg,
          bgJson,
          exitCode,
          exitCodeJson,
          output: bg.getOutput(),
          outputJson: bgJson.getOutput(),
        };
      });
      afterAll(async () => {
        await scene.bg.kill();
        await scene.bgJson.kill();
      });

      when('[t0] the human reads their terminal', () => {
        then('the GLYPH says the caller acts next — ✋, never 💥', () => {
          // ⚠️ a constraint because the NEXT MOVE is theirs (run one command), never
          //   because we judged the defect theirs
          expect(scene.output).toContain('✋');
          expect(scene.output).not.toContain('💥');
        });

        then('the message ADMITS the read failed, rather than guess a row', () => {
          expect(scene.output).toContain("this host's libc could not be read");
          // neither peer cause may be stated as fact here — to pick one is to hand a
          // confident cure we cannot back
          expect(scene.output).not.toContain('this install is damaged');
          expect(scene.output).not.toContain(
            'node-pty ships no prebuilt addon for this platform',
          );
        });

        then('the fix is a DIAGNOSTIC that settles which row applies', () => {
          // 🚨 one command that works on BOTH branches, rather than a cure that runs
          //   clean and repairs naught on the branch we guessed wrong
          //   (`rule.require.errors-name-the-fix`)
          expect(scene.output).toContain('ldd --version');
        });

        then('and it carries BOTH cures, each gated on that answer', () => {
          // ⚠️ the inversion of `[case4]`/`[case5]`: each of those asserts the ABSENCE
          //   of the other's cure, and this is the one row where both must be present
          expect(scene.output).toContain('reinstall rhachet');
          expect(scene.output).toContain('--no-socket');
        });

        then('the exit code carries the CLASS — the caller acts next', () => {
          expect(scene.exitCode).toEqual(2);
          expect(scene.output).not.toContain('at Object.<anonymous>');
        });

        then('the unreadable-libc frame is locked (visual spot-check)', () => {
          const frame = asCliErrorFrameFromOutput({ output: scene.output });
          expect(asSnapshotSafe(frame)).toMatchSnapshot();
        });
      });

      when('[t1] a MACHINE reads the same fault via --output json', () => {
        then('the payload carries the diagnostic as a non-null hint', () => {
          const parsed = asCliErrorJsonFromOutput({
            output: scene.outputJson,
          });
          expect(parsed.class).toEqual('ConstraintError');
          expect(parsed.hint).toContain('ldd --version');
        });

        then('both channels agree on the party', () => {
          expect(scene.exitCodeJson).toEqual(2);
        });
      });
    },
  );

  given(
    '[case7] an interactive enroll where the addon LOADS and the host refuses a device',
    () => {
      // 🚨 the FOURTH classified pty report, and the only one whose cause sits on the
      //   other side of the load. `[case4]`/`[case5]`/`[case6]` all vary one question —
      //   *why could the addon not load?* — so all three route through
      //   `asCloneSocketOmissionReasonError`. here the addon loads FINE and the kernel has no
      //   pty to hand it, which is the sole path that reaches `asPtyDeviceRefusedError`:
      //   its own sentence, its own hint, its own party.
      //
      // ⚠️ the SPAWN is stubbed, never the device: a genuine pty exhaustion needs a fork
      //   bomb against `/dev/ptmx`, a hazard to the runner. so the CONDITION is taken as
      //   given and the MESSAGE is node-pty's own verbatim text from `pty.cc` — the same
      //   source `isPtyDeviceRefusedError` quotes its markers from, so the two agree by
      //   construction rather than by luck.
      const ptySpawnError = 'forkpty(3) failed.';

      const scene = useBeforeAll(async () => {
        const dir = genTempDir({ slug: 'enroll-pty-refused' });
        const configDir = genTempDir({ slug: 'enroll-pty-refused-cfg' });
        setupEnrollFixture({ dir });
        const stubPath = setupRichStubBrainPath({ dir });

        // the TWIN preload of `stubPtyAddonAbsent.cjs` — that one makes the addon
        // unloadable, this one makes it load and refuse. same seam, because the pty
        // loads out of rhachet's own dependency tree and no env var relocates it
        const preload = join(
          __dirname,
          '../../src/.test/assets/stubPtyDeviceRefused.cjs',
        );
        const env = {
          PATH: stubPath,
          CLAUDE_CONFIG_DIR: configDir,
          NODE_OPTIONS: `--require ${preload}`,
          RHACHET_TEST_PTY_SPAWN_ERROR: ptySpawnError,
        };

        // through the OUTER pty, as every peer row is: the guard sits inside the branch
        // `isCloneSocketEligible` gates, and eligibility needs an interactive tty
        const bg = spawnRhachetCliBackground({
          args: ['enroll', 'claude'],
          cwd: dir,
          env,
        });
        const exitCode = await bg.waitForExit({ timeoutMs: 30000 });

        const bgJson = spawnRhachetCliBackground({
          args: ['enroll', 'claude', '--output', 'json'],
          cwd: dir,
          env,
        });
        const exitCodeJson = await bgJson.waitForExit({ timeoutMs: 30000 });

        return {
          dir,
          bg,
          bgJson,
          exitCode,
          exitCodeJson,
          output: bg.getOutput(),
          outputJson: bgJson.getOutput(),
        };
      });
      afterAll(async () => {
        await scene.bg.kill();
        await scene.bgJson.kill();
      });

      when('[t0] the human reads their terminal', () => {
        then('the enroll is refused LOUD — no clone, no silent degrade', () => {
          expect(scene.output).toContain(
            'the pty device could not be allocated',
          );
          // and no clone survived: the staged temp dir is reaped before the throw, so a
          // refused spawn must leave neither a breadcrumb nor a dir behind
          expect(scene.output).not.toContain('😶 clone enrolled');
        });

        then('the message names the DEVICE, never the addon', () => {
          // 🚨 what separates this row from all three peers: each of those reports an
          //   addon that would not LOAD, this one an addon that loaded fine. a collapse
          //   of the two causes into one sentence sends a human to reinstall a package
          //   that is already correct
          expect(scene.output).not.toContain('node-pty failed to load');
          expect(scene.output).not.toContain('ships no prebuilt addon');
        });

        then('the GLYPH says the caller acts next — ✋, never 💥', () => {
          // ⚠️ a constraint because a kernel with no pty to give is not ours to repair,
          //   and a retry with the same request fails identically. checked ON SCREEN,
          //   never on the error object — a payload test cannot see the rendered glyph
          expect(scene.output).toContain('✋');
          expect(scene.output).not.toContain('💥');
        });

        then("the hint carries node-pty's OWN words inline", () => {
          // 🚨 inline, never merely in metadata. the frame renders metadata unredacted,
          //   so a cause left there does reach the screen — but it reaches it inside a
          //   json blob, under whatever key it was filed. the hint is the one row a human
          //   reads first, and the emitter's own words are what part `forkpty` from
          //   `posix_spawn` from a conpty fault
          expect(scene.output).toContain(ptySpawnError);
          // and the fix that actually works on this host, since the addon is fine
          expect(scene.output).toContain('--no-socket');
          expect(scene.output).not.toContain('reinstall rhachet');
          expect(scene.output).not.toContain('pnpm rebuild');
        });

        then('the exit code carries the CLASS — the caller must act', () => {
          // ConstraintError → 2, and NOT an unhandled throw: the guard is allowlisted,
          // so a shape it does not recognize would reach the human as a bare stack
          expect(scene.exitCode).toEqual(2);
          expect(scene.output).not.toContain('at Object.<anonymous>');
        });

        then('the device-refused frame is locked (visual spot-check)', () => {
          const frame = asCliErrorFrameFromOutput({ output: scene.output });
          expect(asSnapshotSafe(frame)).toMatchSnapshot();
        });
      });

      when('[t1] a MACHINE reads the same fault via --output json', () => {
        then('the payload names the class a consumer branches on', () => {
          const parsed = asCliErrorJsonFromOutput({
            output: scene.outputJson,
          });
          // a retry-safe distinction: ConstraintError says "the request cannot succeed
          // as posed", where the peer rows' MalfunctionError says "this install is broken"
          expect(parsed.class).toEqual('ConstraintError');
          expect(parsed.message).toContain(
            'the pty device could not be allocated',
          );
        });

        then('the cause survives the json projection', () => {
          const parsed = asCliErrorJsonFromOutput({
            output: scene.outputJson,
          });
          expect(parsed.hint).toContain(ptySpawnError);
          expect(parsed.hint).toContain('--no-socket');
        });

        then('both channels agree on the party', () => {
          expect(scene.exitCodeJson).toEqual(2);
        });
      });
    },
  );

  given(
    '[case8] an interactive enroll where the addon loads, the device is granted, and the BIND faults',
    () => {
      // 🚨 the FIFTH classified report, and the last of the family to reach a screen.
      //   `[case4]`–`[case6]` vary *why the addon would not load*; `[case7]` loads it and
      //   is refused a device. this one clears BOTH gates and then cannot bind — the sole
      //   path to `asCloneSocketBindFaultError`, and the only member whose party is OURS.
      //
      // 🚨 .why it is owed = the round's own audit named the class `payload ≠ screen` and
      //   repaired it three times, then listed four covered frames while this one had a
      //   payload test and no rendered assertion at all. a glyph and an exit code are
      //   decided by the render, and no payload test can see either.
      //
      // ✅ the fault is REAL, never stubbed. `getCloneSocketPath` derives its path under
      //   `$XDG_RUNTIME_DIR`, so a runtime dir with no write bit makes node's own `bind`
      //   fault with a genuine structured `syscall` — which is exactly the field
      //   `isCloneSocketBindFaultError` reads. no preload, no forged errno.
      const scene = useBeforeAll(async () => {
        assertGlibcLinuxHost({ label: '[case8]' });

        const dir = genTempDir({ slug: 'enroll-bind-fault' });
        const configDir = genTempDir({ slug: 'enroll-bind-fault-cfg' });

        // ⚠️ a dir that EXISTS and is unwritable, never an absent one. the gate
        //   (`computeCloneSocketOmissionReason`) reads only whether a path can be DERIVED,
        //   which is pure string work — so an absent dir would still clear it and fault
        //   the same way. an extant-but-unwritable dir pins the syscall that faults to
        //   `bind` rather than leave it to the host's lookup order
        //
        // 🚨 it is also SHORT, and that is load-bearing rather than incidental — see the
        //   helper's own note on the ~107-byte `sun_path` cap and the silent truncation
        //   an over-cap path takes instead of a fault
        const runtimeDir = getUnwritableShortRuntimeDir({ label: '[case8]' });

        setupEnrollFixture({ dir });
        const stubPath = setupRichStubBrainPath({ dir });

        const env = {
          PATH: stubPath,
          CLAUDE_CONFIG_DIR: configDir,
          XDG_RUNTIME_DIR: runtimeDir,
        };

        const bg = spawnRhachetCliBackground({
          args: ['enroll', 'claude'],
          cwd: dir,
          env,
        });
        const exitCode = await bg.waitForExit({ timeoutMs: 30000 });

        const bgJson = spawnRhachetCliBackground({
          args: ['enroll', 'claude', '--output', 'json'],
          cwd: dir,
          env,
        });
        const exitCodeJson = await bgJson.waitForExit({ timeoutMs: 30000 });

        return {
          bg,
          bgJson,
          exitCode,
          exitCodeJson,
          output: bg.getOutput(),
          outputJson: bgJson.getOutput(),
        };
      });
      afterAll(async () => {
        await scene.bg.kill();
        await scene.bgJson.kill();
      });

      when('[t0] the human reads their terminal', () => {
        then('the enroll is refused LOUD — no clone, no silent degrade', () => {
          expect(scene.output).toContain('its socket could not be bound');
          expect(scene.output).not.toContain('😶 clone enrolled');
        });

        then('the message names the BIND, never the addon or the device', () => {
          // 🚨 the row this case exists for. all three causes end the same enroll, and a
          //   sentence that collapsed them would send a human to reinstall a package that
          //   loaded fine, or to blame a kernel that granted the device it was asked for
          expect(scene.output).not.toContain('node-pty failed to load');
          expect(scene.output).not.toContain('ships no prebuilt addon');
          expect(scene.output).not.toContain(
            'the pty device could not be allocated',
          );
        });

        then('the GLYPH says OURS to repair — 💥, never ✋', () => {
          // 🚨 the inverse of `[case7]`, and the whole reason a rendered assertion is owed:
          //   by the time a bind can fault, our own gate has already cleared a socket for
          //   this enroll — so the defect is ours and a retry as posed fails identically.
          //   checked ON SCREEN, because the glyph is a property of the render alone
          expect(scene.output).toContain('💥');
          expect(scene.output).not.toContain('✋');
        });

        then('the hint owns the defect and still names the way forward', () => {
          // ⚠️ `--no-socket` is offered as the way FORWARD, never as the fix — the report
          //   says outright that the repair is ours, rather than hand the caller a
          //   workaround dressed as a cure
          expect(scene.output).toContain('a defect in rhachet');
          expect(scene.output).toContain('--no-socket');
          expect(scene.output).not.toContain('pnpm rebuild');
        });

        then('the errno reaches the screen INLINE, not only in metadata', () => {
          // the one value that tells a maintainer which syscall faulted. a hint that named
          // the class without it would be unactionable on a bug report
          //
          // 🚨 the read is scoped to the HINT LINE, and that scoping is the whole assertion.
          //   `asCliErrorFrame` renders metadata unredacted, so `socketErrno` puts `EACCES`
          //   on screen whatever the hint says — a bare `output).toContain('EACCES')` passes
          //   with the hint stripped bare, which was MEASURED (2026-09-05 dogfood: the
          //   inline cause was deleted and this row alone stayed green). so it would assert
          //   the metadata it names as the thing it must not settle for.
          const hintLine = scene.output
            .split('\n')
            .find((line) => line.includes('"hint"'));
          expect(hintLine).toBeDefined();
          expect(hintLine).toContain('EACCES');
        });

        then('the exit code carries the CLASS — the server must act', () => {
          expect(scene.exitCode).toEqual(1);
          expect(scene.output).not.toContain('at Object.<anonymous>');
        });

        then('the bind-fault frame is locked (visual spot-check)', () => {
          const frame = asCliErrorFrameFromOutput({ output: scene.output });
          expect(asSnapshotSafe(frame)).toMatchSnapshot();
        });

        then('the RAW trace line above the frame is locked too', () => {
          /**
           * 🚨 the row that makes the human's WHOLE screen reviewable. the frame snapshot
           *   above spans from the glyph line down, so a reader of it sees a clean single
           *   report — while a human on this exact fault reads an unframed diagnostic
           *   FIRST. two differently-shaped outputs for one failure, and no snapshot
           *   showed the pair (raised by the r009 lane at i076).
           *
           * ⚠️ this row does NOT bless that shape. it makes the cost visible so the trade
           *   can be judged on a rendered screen rather than on a docblock's word for it —
           *   the trade itself is litigated at `genCloneSocketServer`'s `ready.catch`,
           *   which keeps the line because a `ready` NO caller awaits would otherwise lose
           *   a named fault entirely (`rule.forbid.failhide`).
           */
          const trace = asCloneSocketTraceFromOutput({ output: scene.output });
          expect(trace).toContain('a bind fault');
          expect(trace).not.toContain('an unclassified fault');

          // the ORDER is the friction: the bare line lands ahead of the framed report,
          // so a human reads the diagnostic before the report that explains it
          expect(scene.output.indexOf(trace)).toBeLessThan(
            scene.output.indexOf('💥'),
          );

          expect(asSnapshotSafe(trace)).toMatchSnapshot();
        });
      });

      when('[t1] a MACHINE reads the same fault via --output json', () => {
        then('the payload names the class a consumer branches on', () => {
          const parsed = asCliErrorJsonFromOutput({
            output: scene.outputJson,
          });
          expect(parsed.class).toEqual('MalfunctionError');
          expect(parsed.message).toContain('its socket could not be bound');
        });

        then('the cause survives the json projection', () => {
          const parsed = asCliErrorJsonFromOutput({
            output: scene.outputJson,
          });
          expect(parsed.hint).toContain('EACCES');
          expect(parsed.hint).toContain('--no-socket');
        });

        then('both channels agree on the party', () => {
          expect(scene.exitCodeJson).toEqual(1);
        });
      });
    },
  );
});
