import { genTempDir, given, then, useBeforeAll, useThen, when } from 'test-fns';

import {
  enrollCloneAndWaitReady,
  pollForCloneListState,
  setupEnrollFixture,
  setupRichStubBrainPath,
} from '@/blackbox/.test/infra/enrollCloneHarness';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
  invokeRhachetCliBinaryAsync,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';

/**
 * .what = a clone's life past its first enroll — a re-enroll of a live slug, and a dead clone
 * .note = split from `clone.acceptance.test.ts` so it runs on its own jest worker; the
 *   describe name is kept, so each snapshot key is the one it held before the split
 */
describe('rhx clone reach (acceptance)', () => {
  given('[case3] a SECOND enroll of a still-live --as slug (idempotent reuse)', () => {
    // the idempotent-cron-retry path: a supervisor re-runs `enroll --as @:driver`
    // against a clone that is already LIVE. no new brain is spawned — the extant
    // clone is handed back — and `--output json` still emits the SAME machine handoff
    // a fresh spawn would, so the caller reads the reused clone's address with no
    // second command and never a blank stdout (uc.11 addendum 4 — the machine handoff)
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'clone-reuse' });
      const configDir = genTempDir({ slug: 'clone-reuse-cfg' });
      setupEnrollFixture({ dir });
      const stubPath = setupRichStubBrainPath({ dir });
      const env = { PATH: stubPath, CLAUDE_CONFIG_DIR: configDir };

      // enroll the FIRST clone through the outer pty so its socket stands up LIVE
      const { bg, serial } = await enrollCloneAndWaitReady({
        dir,
        env,
        as: '@:driver',
      });

      return { dir, env, bg, serial };
    });
    afterAll(async () => {
      await scene.bg.kill();
    });

    when('[t0] the same slug is enrolled again with --output json', () => {
      // reuse short-circuits BEFORE any spawn (result.spawn === null), so this second
      // enroll needs no pty — a plain subprocess invocation exercises the whole path
      const reused = useThen('the second enroll reuses (no new spawn)', async () =>
        invokeRhachetCliBinaryAsync({
          args: ['enroll', 'claude', '--as', '@:driver', '--output', 'json'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        }),
      );

      then('the json handoff reports outcome=reused for the SAME clone', () => {
        expect(reused.status).toEqual(0);
        // a machine parses fields, never tree glyphs
        expect(reused.stdout).not.toContain('├─');
        const parsed = JSON.parse(reused.stdout) as {
          outcome: string;
          serial: string;
          slug: string | null;
          socketEligible: boolean;
        };
        expect(parsed.outcome).toEqual('reused');
        // the SAME serial the first (live) enroll spawned — proof no new clone was made
        expect(parsed.serial).toEqual(scene.serial);
        expect(parsed.slug).toEqual('driver');
        expect(parsed.socketEligible).toEqual(true);
      });

      then('the reused json handoff shape is locked (catches a drifted shape)', () => {
        // pair the field asserts with a snapshot per rule.require.snapshots — the
        // serial is masked, the outcome + slug + socketEligible + key-set stay stable,
        // so a widened/renamed json field surfaces as a snapshot diff in review
        expect(asSnapshotSafe(reused.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] the same slug is enrolled again in DEFAULT tree mode', () => {
      // the HUMAN twin of the json reuse above — a person who re-runs the enroll (no
      // --output json) reads the `♻ reused …` line on stderr, a distinct user-visible
      // output variant owed its own snapshot per rule.require.contract-snapshot-
      // exhaustiveness. reuse short-circuits BEFORE any spawn, so no pty is needed
      const reused = useThen('the second enroll reuses (no new spawn)', async () =>
        invokeRhachetCliBinaryAsync({
          args: ['enroll', 'claude', '--as', '@:driver'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        }),
      );

      then('the human reuse line names the live clone by its slug (exit 0)', () => {
        expect(reused.status).toEqual(0);
        // a named reuse prints NO breadcrumb (that is the bare-enroll affordance);
        // it names the reused slug so the human knows no new brain was spawned
        expect(reused.stderr).toContain('reused');
        expect(reused.stderr).toContain('@:driver');
      });

      then('the reused tree line is locked (visual spot-check)', () => {
        // the slug is a stable literal + no serial in the reuse line, so the masked
        // stderr is deterministic — this pins the human reuse experience against drift
        expect(asSnapshotSafe(reused.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case2] a clone whose brain has EXITED (dead)', () => {
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'clone-dead' });
      const configDir = genTempDir({ slug: 'clone-dead-cfg' });
      setupEnrollFixture({ dir });
      const stubPath = setupRichStubBrainPath({ dir });
      const env = { PATH: stubPath, CLAUDE_CONFIG_DIR: configDir };

      const { bg } = await enrollCloneAndWaitReady({
        dir,
        env,
        as: '@:ranger',
      });

      // kill the brain so its socket is gone — the clone now reads DEAD.
      //
      // ⚠️ POLLED, never a fixed settle. a 500ms sleep sat here and asserted a latency
      //   bound as fact; the poll waits on the OBSERVABLE instead, and reports the last
      //   screen it saw if the bound expires (`pollForCloneListState`)
      await bg.kill();
      await pollForCloneListState({ wanted: 'DEAD', dir, env });

      return { dir, env };
    });

    when('[t0] a process says to the dead clone', () => {
      const said = useThen('the say fails loud (never a silent drop)', () =>
        invokeRhachetCliBinary({
          args: ['clone', 'say', '@:ranger', '--what', 'still there?'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        }),
      );

      then('it exits non-zero and names the reach failure', () => {
        expect(said.status).not.toEqual(0);
        // a dead clone cannot take a dispatch — the error names the state + fix
        expect(said.stderr.toLowerCase()).toMatch(/dead|not.*reach|re-enroll/);
      });

      then('the dead-clone error format is locked (visual spot-check)', () => {
        // serial/socket/paths are masked; the state word + fix text are stable, so
        // this locks the error a caller reads against silent drift
        expect(asSnapshotSafe(said.stderr)).toMatchSnapshot();
      });
    });

    when('[t1] a process says to the dead clone with --output json', () => {
      // the machine counterpart: a supervisor that watches a clone reads the DEAD
      // reach failure as a parseable structured error (class + reachState), never
      // human tree prose — so it branches on a field, per rule.forbid.friction-hazards
      const said = useThen('the say fails loud as JSON', () =>
        invokeRhachetCliBinary({
          args: [
            'clone',
            'say',
            '@:ranger',
            '--what',
            'still there?',
            '--output',
            'json',
          ],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        }),
      );

      then('it exits non-zero and emits a parseable error (no tree glyphs)', () => {
        expect(said.status).not.toEqual(0);
        expect(said.stderr).not.toContain('✋');
        const parsed = JSON.parse(said.stderr) as {
          class: string;
          message: string;
          hint: string;
        };
        // a dead clone is a caller-side reach fault → ConstraintError (exit 2)
        expect(parsed.class).toEqual('ConstraintError');
        // the message names the dead reach; the fix (re-enroll) rides the hint field
        expect(parsed.message.toLowerCase()).toMatch(/no live clone|socket is gone|dead/);
        expect(`${parsed.hint}`.toLowerCase()).toMatch(/re-enroll|clone list|enroll/);
      });

      then('the dead-clone json error shape is locked (catches a drifted shape)', () => {
        // pair the field asserts with a snapshot per rule.require.snapshots — serial/
        // socket/paths are masked, the class + message + hint + key-set stay stable,
        // so a widened/renamed structured-error field surfaces as a snapshot diff
        expect(asSnapshotSafe(said.stderr)).toMatchSnapshot();
      });
    });

    when('[t2] a process GETs the dead clone (the human tree)', () => {
      // the get counterpart of the dead-clone say (t0/t1): unlike say, get has NO
      // reach probe — it reads the brain-cli's own transcript, so a DEAD clone stays
      // observable (exit 0). this is a DISTINCT success output variant from the say
      // refusal, so it is snapped so an observe-a-dead-clone regression cannot ship
      // undetected (rule.require.contract-snapshot-exhaustiveness)
      const got = useThen('the get observes the dead clone (a transcript read)', () =>
        invokeRhachetCliBinary({
          args: ['clone', 'get', '@:ranger'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        }),
      );

      then('it exits 0 — a dead clone is still observable (no reach gate on get)', () => {
        expect(got.status).toEqual(0);
      });

      then('the empty history shows an explicit label, never blank stdout', () => {
        // rule.require.status-feedback: a dead clone that took no say has an empty
        // conversation — the human read must NAME the empty state, so a reader tells
        // "no history yet" from "the command silently failed". a blank stdout here
        // was the r10 blocker; this functional assert dogfood-proves the label (a
        // revert to the blank render goes red), paired with the snapshot below
        expect(got.stdout).toContain('(no messages yet)');
      });

      then('the dead-clone get tree format is locked (visual spot-check)', () => {
        // serial/socket/paths/timestamps are masked; the read degrades to a stable
        // shape (the dead clone took no say, so no nonce), so this locks the observe
        // variant a caller reads against silent drift
        expect(asSnapshotSafe(got.stdout)).toMatchSnapshot();
      });
    });

    when('[t3] a process GETs the dead clone with --output json', () => {
      // the machine twin of t2: a supervisor that observes a clone reads the dead
      // clone's transcript as a parseable json body (messages + exid fields), never
      // human tree prose — so it branches on fields, per rule.forbid.friction-hazards
      const got = useThen('the get returns a parseable machine body', () =>
        invokeRhachetCliBinary({
          args: ['clone', 'get', '@:ranger', '--output', 'json'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        }),
      );

      then('it exits 0 and the body parses to a machine shape', () => {
        expect(got.status).toEqual(0);
        const parsed = JSON.parse(got.stdout) as { messages: unknown[] };
        expect(Array.isArray(parsed.messages)).toEqual(true);
      });

      then('the dead-clone get json shape is locked (machine contract)', () => {
        // serial/socket/paths/timestamps masked; the machine body a supervisor parses
        // stays a stable shape, so a widened/renamed field surfaces as a snapshot diff
        expect(asSnapshotSafe(got.stdout)).toMatchSnapshot();
      });
    });
  });

});
