import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import {
  setupEnrollFixture,
  setupRichStubBrainPath,
} from '@/blackbox/.test/infra/enrollCloneHarness';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { spawnRhachetCliBackground } from '@/blackbox/.test/infra/spawnRhachetCliBackground';

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
      // wait until the stub is ready (proves enroll spawned the clone)
      await bg.waitForOutput({
        pattern: /ready serial=([0-9a-f-]{36})/,
        timeoutMs: 20000,
      });
      return { dir, env, bg };
    });
    afterAll(async () => {
      await scene.bg.kill();
    });

    when('[t0] the clone spawns without a name', () => {
      then('a breadcrumb names how the human reaches their own clone', () => {
        // the F7 line names the serial-addressed reach so a bare enroll is not a
        // dead end (rule.require.discoverability); it goes to stderr, mirrored here
        const out = scene.bg.getOutput();
        expect(out).toContain('reach this clone');
        expect(out).toMatch(/rhx clone say @:[0-9a-f-]{36}/);
      });

      then('the bare-enroll breadcrumb tree line is locked (human variant)', () => {
        // the TREE twin of the bare-enroll --output json handoff (case2c) — the human
        // who runs a bare enroll reads THIS breadcrumb, so its shape is locked per
        // rule.require.contract-snapshot-exhaustiveness. the whole pty stream carries
        // brain-boot noise, so extract only the rhachet-authored breadcrumb line and
        // mask its serial — that line alone is the deterministic human contract
        const out = scene.bg.getOutput();
        const breadcrumb = out.match(/🔌 reach this clone[^\n]*/)?.[0] ?? '';
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
      then('NO breadcrumb is shown — a named enroll needs no reach hint', () => {
        // unlike a bare enroll (case1, where the breadcrumb IS the human affordance),
        // a NAMED enroll emits NO rhachet-authored tree line: the human already knows
        // the @:super handle they chose, so the breadcrumb is suppressed by design
        // (invokeEnroll: the `🔌 reach this clone` line is `slug === null` only). the
        // rest of the tree stream is the brain's OWN mirror — nondeterministic, so
        // there is no deterministic rhachet tree contract to snapshot for this variant;
        // the ABSENCE of the breadcrumb is the locked human contract instead
        const out = scene.bg.getOutput();
        expect(out).not.toContain('reach this clone');
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

      // the PRIMARY machine path: `enroll claude --output json` with NO --as, so the
      // handoff carries slug=null — the default (unnamed) machine contract a supervisor
      // consumes when it does not name the clone. distinct from the --as variant above,
      // owed its own snapshot per rule.require.contract-snapshot-exhaustiveness (uc.11)
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
        // lock the MACHINE shape too — the DEAF-say json error is token-free
        // (no serial in a reach-state refusal), so a drifted class/message/hint or a
        // dropped reachState/reachCause field surfaces as a snapshot diff in review
        // (rule.require.contract-snapshot-exhaustiveness — the json twin of the
        // human tree locked below)
        expect(asSnapshotSafe(said.stderr)).toMatchSnapshot();
      });

      then('the DEAF-say human error format is locked (visual spot-check)', () => {
        // the human-visible counterpart of the json refusal above — a caller who does
        // NOT pass --output json reads the `✋ … deaf …` message + its fix on stderr.
        // the unknown-address + dead-clone say errors are snapshotted; this locks the
        // THIRD negative say variant (DEAF) too, so a regression in the deaf error text
        // cannot ship undetected (rule.require.contract-snapshot-exhaustiveness)
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
        // conversation — the human read must NAME the empty state, never blank stdout
        // (a reader tells "no history yet" from "the command silently failed"). this
        // functional assert dogfood-proves the label paired with the snapshot below
        expect(got.stdout).toContain('(no messages yet)');
        // lock the DEAF success-read variant too — `get` on a socketless clone is a
        // DISTINCT output variant (say is refused, but get succeeds), so its stdout
        // is snapped so a regression in the observe-a-DEAF-clone read cannot ship
        // undetected (rule.require.contract-snapshot-exhaustiveness)
        expect(asSnapshotSafe(got.stdout)).toMatchSnapshot();
      });
    });

    when('[t2] a MULTI-LINE message is dispatched via say', () => {
      then('a multi-line say is ACCEPTED at the input layer — no longer refused for its newlines', () => {
        // multi-line `say` is SUPPORTED: asCloneDispatchFrame maps each interior `\n`
        // to the soft-newline escape (Shift/Option-Enter), so the whole block lands as
        // ONE turn. so a multi-line message is NO LONGER refused up front — it proceeds
        // past the input layer to the clone lookup + reach check. `@:plain` is DEAF, so
        // this reaches the reach-state refusal (exit 2, DEAF) — the SAME path a
        // single-line say to this clone takes, so the message's newlines are not what
        // stops it. (a multi-line ROUND-TRIP to a LIVE brain runs against a real claude
        // in clone.saybulk-probe.realbrain.acceptance — the delivery self-verify there
        // confirms the whole block left the input buffer)
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
});
