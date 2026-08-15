import { asIsoTimeStamp, now } from 'iso-time';
import { given, then, useBeforeAll, useThen, when, genTempDir } from 'test-fns';
import { getUuid } from 'uuid-fns';

import {
  enrollCloneAndWaitReady,
  setupEnrollFixture,
  setupRichStubBrainPath,
} from '@/blackbox/.test/infra/enrollCloneHarness';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';

import { existsSync, writeFileSync } from 'node:fs';

import { getCloneHistoryDir } from '@src/domain.operations/clone/getCloneHistoryDir';
import { genSampleCloneOnDisk } from '@src/.test/assets/genSampleCloneOnDisk';

/**
 * .what = THE mandated prune + reach-state-lifecycle clamp — a LIVE clone (keeper)
 *   and a socketless clone (goner) under one actor, proven end-to-end through real
 *   children: the goner reads DEAF while alive, flips to DEAD once its process exits,
 *   and `clone prune` reaps ONLY the dead goner while the live keeper survives
 * .why =
 *   - reach-state is a 3-fact function {socketEligible, socketLive, processLive}: a
 *     socketless clone is DEAF while its process runs (observe-only, cannot hear a
 *     say) and DEAD once it finishes. this clamps the DEAF→DEAD transition the wisher
 *     mandated ("mute clones should be marked dead once they're done")
 *   - prune is safe-by-default: plan previews, apply removes, and a LIVE clone is
 *     NEVER in the plan (rule.require.safe-by-default). the keeper proves the guard —
 *     a bug that pruned a live clone would surface here, against a real live socket
 *   - both are proven against REAL children (a socketed pty clone + a socketless
 *     plain clone), never a mock, so the on-disk reap + the reach probes are real
 *
 * .note = DOGFOOD: revert the DEAF→DEAD probe (read a socketless clone as DEAF
 *   forever) and t1 goes red — the goner never flips DEAD, so the plan omits it.
 *   revert the LIVE guard in getAllClonesPrunable and t2 goes red — the keeper leaks
 *   into the plan (verified 2026-08-13), per rule.require.clamp-edge-cases
 */

describe('rhx clone prune + reach-state lifecycle (acceptance)', () => {
  given('[case1] a live keeper + a socketless goner under one actor', () => {
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'clone-prune' });
      const configDir = genTempDir({ slug: 'clone-prune-cfg' });
      setupEnrollFixture({ dir });
      const stubPath = setupRichStubBrainPath({ dir });
      const env = { PATH: stubPath, CLAUDE_CONFIG_DIR: configDir };

      // the LIVE keeper — a socketed pty clone; it must SURVIVE the prune
      const keeper = await enrollCloneAndWaitReady({ dir, env, as: '@:keeper' });
      // the socketless goner — `--no-socket` → a plain clone with NO socket, so it
      // reads DEAF while alive; it will flip DEAD once its process exits, then reap
      const goner = await enrollCloneAndWaitReady({
        dir,
        env,
        as: '@:goner',
        extraArgs: ['--no-socket'],
      });

      return { dir, env, keeper, goner };
    });
    afterAll(async () => {
      await scene.keeper.bg.kill();
      await scene.goner.bg.kill();
    });

    when('[t0] both clones are alive', () => {
      const listed = useThen('clone list reads both reach-states', () =>
        invokeRhachetCliBinary({
          args: ['clone', 'list'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        }),
      );

      then('the keeper reads LIVE and the goner reads DEAF (socketless, alive)', () => {
        expect(listed.status).toEqual(0);
        expect(listed.stdout).toContain('@:keeper');
        expect(listed.stdout).toContain('@:goner');
        // a socketless clone whose process is alive is DEAF — observe-only, cannot
        // hear a say (the transient middle state, wisher-mandated)
        expect(listed.stdout).toContain('state=DEAF');
        expect(listed.stdout).toContain('state=LIVE');
      });

      then('the alive-state list format is locked (DEAF + LIVE)', () => {
        // serial + since are masked; the slug + state words are deterministic,
        // so this locks the tri-state layout a human reads
        expect(asSnapshotSafe(listed.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] the goner process exits (DEAF → DEAD)', () => {
      const listed = useThen(
        'after the goner exits, clone list re-reads its reach-state',
        async () => {
          // send `exit 0` through the goner`s pty so its stub child cleanly exits —
          // a deterministic teardown, never an orphan. its recorded hostPid dies, so
          // the socketless clone flips DEAF → DEAD (its process finished)
          scene.goner.bg.write('exit 0\r');
          await scene.goner.bg.kill(); // await the child`s exit
          // a short settle so the pid reads un-probeable on the next reach check
          await new Promise((r) => setTimeout(r, 500));
          return invokeRhachetCliBinary({
            args: ['clone', 'list'],
            cwd: scene.dir,
            env: scene.env,
            logOnError: false,
          });
        },
      );

      then('the goner now reads DEAD, the keeper stays LIVE', () => {
        expect(listed.status).toEqual(0);
        expect(listed.stdout).toContain('@:goner');
        expect(listed.stdout).toContain('@:keeper');
        // the DEAF → DEAD transition: a finished socketless clone is DEAD
        expect(listed.stdout).toContain('state=DEAD');
        expect(listed.stdout).toContain('state=LIVE');
        // no longer DEAF — the goner has moved off the transient middle state
        expect(listed.stdout).not.toContain('state=DEAF');
      });

      then('the DEAD-after-exit list format is locked', () => {
        expect(asSnapshotSafe(listed.stdout)).toMatchSnapshot();
      });
    });

    when('[t2] `clone prune --mode plan` previews the reap', () => {
      const planned = useThen('the prune plan lists only the dead goner', () =>
        invokeRhachetCliBinary({
          args: ['clone', 'prune', '--mode', 'plan'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        }),
      );

      then('the plan names the dead goner, NEVER the live keeper', () => {
        expect(planned.status).toEqual(0);
        expect(planned.stdout).toContain('@:goner');
        // safe-by-default: prune reaps only DEAD clones, so the LIVE keeper is never
        // in the plan — a bug that pruned a live clone would fail this assertion
        expect(planned.stdout).not.toContain('@:keeper');
        // plan mode names the apply follow-up and removes no clone
        expect(planned.stdout).toContain('--mode apply');
      });

      then('the prune-plan format is locked (visual spot-check)', () => {
        // serial + since are masked; the slug + the plan footer are deterministic,
        // so this locks the exact preview a human reads before an apply
        expect(asSnapshotSafe(planned.stdout)).toMatchSnapshot();
      });

      then('the prune-plan json machine shape is locked', () => {
        // the MACHINE counterpart — a cron reads {mode, count, clones} as fields, so
        // it can prune + parse the result, never a scrape of the human tree (uc.11)
        const plannedJson = invokeRhachetCliBinary({
          args: ['clone', 'prune', '--mode', 'plan', '--output', 'json'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        });
        expect(plannedJson.status).toEqual(0);
        expect(plannedJson.stdout).not.toContain('├─');
        const parsed = JSON.parse(plannedJson.stdout) as {
          mode: string;
          count: number;
          clones: { slug: string | null }[];
        };
        expect(parsed.mode).toEqual('plan');
        expect(parsed.count).toEqual(1);
        expect(parsed.clones[0]!.slug).toEqual('goner');
        expect(asSnapshotSafe(plannedJson.stdout)).toMatchSnapshot();
      });
    });

    when('[t3] `clone prune --mode apply` reaps the dead goner', () => {
      const applied = useThen(
        'the apply removes the goner, then list re-reads',
        () => {
          const pruned = invokeRhachetCliBinary({
            args: ['clone', 'prune', '--mode', 'apply'],
            cwd: scene.dir,
            env: scene.env,
            logOnError: false,
          });
          const listed = invokeRhachetCliBinary({
            args: ['clone', 'list'],
            cwd: scene.dir,
            env: scene.env,
            logOnError: false,
          });
          return { pruned, listed };
        },
      );

      then('the apply confirms the reap of the goner', () => {
        expect(applied.pruned.status).toEqual(0);
        expect(applied.pruned.stdout).toContain('pruned');
        expect(applied.pruned.stdout).toContain('@:goner');
      });

      then('the goner is gone from `clone list`, the keeper survives LIVE', () => {
        expect(applied.listed.status).toEqual(0);
        // the dead clone`s footprint is reaped — no row, no reach-state line for it
        expect(applied.listed.stdout).not.toContain('@:goner');
        expect(applied.listed.stdout).toContain('@:keeper');
        expect(applied.listed.stdout).toContain('state=LIVE');
      });

      then('the prune-apply confirmation format is locked', () => {
        expect(asSnapshotSafe(applied.pruned.stdout)).toMatchSnapshot();
      });

      then('the post-apply list format is locked (goner gone, keeper LIVE)', () => {
        expect(asSnapshotSafe(applied.listed.stdout)).toMatchSnapshot();
      });
    });
  });
});

/**
 * .what = the fast on-disk prune coverage — multi-clone plan/apply, the DEAF-kept
 *   guard, and the `--older-than` age gate + its fail-loud, proven through the real
 *   `clone prune` binary against on-disk clone fixtures (no pty, no real spawn)
 * .why =
 *   - the reach-lifecycle clamp above proves the DEAF→DEAD transition through a real
 *     process; THIS suite exhausts the prune SURFACE cheaply: a named + a bare DEAD
 *     clone in one plan, the DEAF clone that survives an apply, and the age gate that
 *     holds back a fresh death (the `--older-than` bound + its bad-value error)
 *   - a DEAD clone = socket-eligible with NO server (the reach probe refuses); a DEAF
 *     clone = socketless with a live process (the jest pid). the SETUP is on-disk via
 *     genSampleCloneOnDisk, the ACTION is the real binary, per
 *     rule.require.acceptance.blackbox (internals for setup, the contract for the act)
 *
 * .note = DOGFOOD: drop the DEAD-only guard in getAllClonesPrunable and the DEAF
 *   watcher leaks into every plan (case1/case2 go red); drop the `--older-than` gate
 *   in computeClonePruneDecision and case3's empty plan goes red (verified 2026-08-13)
 */
describe('rhx clone prune (acceptance)', () => {
  // provision two DEAD clones (a named `doomed` + a bare) and one DEAF `watcher`,
  // all under one actor. spawnedAt fixes the plan order (doomed, then the bare)
  const provisionThreeClones = (dir: string): void => {
    genSampleCloneOnDisk({
      repoPath: dir,
      serial: getUuid(),
      slug: 'doomed',
      socketEligible: true, // socket-eligible, no server → the reach probe reads DEAD
      spawnedAt: asIsoTimeStamp('2026-08-11T00:00:00Z'),
    });
    genSampleCloneOnDisk({
      repoPath: dir,
      serial: getUuid(),
      slug: null, // a bare clone — reached by its full serial, not a slug
      socketEligible: true,
      spawnedAt: asIsoTimeStamp('2026-08-11T01:00:00Z'),
    });
    genSampleCloneOnDisk({
      repoPath: dir,
      serial: getUuid(),
      slug: 'watcher',
      socketEligible: false, // socketless + a live jest pid → DEAF, never reaped
      spawnedAt: asIsoTimeStamp('2026-08-11T02:00:00Z'),
    });
  };

  given('[case1] two DEAD clones (a named + a bare) and one DEAF clone', () => {
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'clone-prune-plan' });
      setupEnrollFixture({ dir });
      provisionThreeClones(dir);
      return { dir, env: { PATH: process.env.PATH ?? '' } };
    });

    when('[t0] `clone prune` runs with no mode (plan is the default)', () => {
      const planned = useThen('the plan previews the two dead clones', () =>
        invokeRhachetCliBinary({
          args: ['clone', 'prune'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        }),
      );

      then('the plan names the two DEAD clones, never the DEAF watcher', () => {
        expect(planned.status).toEqual(0);
        expect(planned.stdout).toContain('@:doomed');
        expect(planned.stdout).toContain('2 dead clone(s)');
        // the DEAF watcher is active (observe-only) — prune never reaps it
        expect(planned.stdout).not.toContain('@:watcher');
      });

      then('the plan tree matches the snapshot', () => {
        // serial + since are masked; the slug + count footer are deterministic, so
        // the multi-row plan layout locks against silent drift
        expect(asSnapshotSafe(planned.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] `clone prune --output json` reads the same plan', () => {
      const json = useThen('the json carries the two dead clones', () =>
        invokeRhachetCliBinary({
          args: ['clone', 'prune', '--output', 'json'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        }),
      );

      then('the json count is 2 and omits the DEAF watcher', () => {
        expect(json.status).toEqual(0);
        expect(json.stdout).not.toContain('├─');
        const parsed = JSON.parse(json.stdout) as {
          mode: string;
          count: number;
          clones: { slug: string | null }[];
        };
        expect(parsed.mode).toEqual('plan');
        expect(parsed.count).toEqual(2);
        expect(parsed.clones.map((c) => c.slug)).not.toContain('watcher');
      });

      then('the json shape matches the snapshot', () => {
        expect(asSnapshotSafe(json.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case2] apply reaps the DEAD clones and keeps the DEAF one', () => {
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'clone-prune-apply' });
      setupEnrollFixture({ dir });
      provisionThreeClones(dir);
      return { dir, env: { PATH: process.env.PATH ?? '' } };
    });

    when('[t0] `clone prune --mode apply` commits the reap', () => {
      const applied = useThen(
        'the apply reaps the two dead clones, then list re-reads',
        () => {
          const pruned = invokeRhachetCliBinary({
            args: ['clone', 'prune', '--mode', 'apply'],
            cwd: scene.dir,
            env: scene.env,
            logOnError: false,
          });
          const listed = invokeRhachetCliBinary({
            args: ['clone', 'list'],
            cwd: scene.dir,
            env: scene.env,
            logOnError: false,
          });
          return { pruned, listed };
        },
      );

      then('the apply confirms two clones reaped', () => {
        expect(applied.pruned.status).toEqual(0);
        expect(applied.pruned.stdout).toContain('pruned: 2 dead clone(s)');
      });

      then('the DEAF watcher survives the reap, the DEAD clones are gone', () => {
        // apply removes only DEAD clones — the DEAF watcher (still active) remains
        expect(applied.listed.status).toEqual(0);
        expect(applied.listed.stdout).toContain('@:watcher');
        expect(applied.listed.stdout).toContain('state=DEAF');
        expect(applied.listed.stdout).not.toContain('@:doomed');
      });

      then('the apply tree matches the snapshot', () => {
        expect(asSnapshotSafe(applied.pruned.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case2b] apply --output json emits the populated machine shape', () => {
    // a fresh fixture (its own 2 dead + 1 DEAF), so `apply --output json` runs as the
    // SOLE prune and captures the POPULATED apply json — the plan json is snapped at
    // case1 t1, but the apply json (`{mode:"apply",count,clones:[…]}`) is a DISTINCT
    // machine shape a cron reads to confirm WHICH clones it reaped (rule.require.
    // contract-snapshot-exhaustiveness). apply consumes the dead set, so it needs its
    // own scene rather than a re-run over case2's already-reaped state
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'clone-prune-apply-json' });
      setupEnrollFixture({ dir });
      provisionThreeClones(dir);
      return { dir, env: { PATH: process.env.PATH ?? '' } };
    });

    when('[t0] `clone prune --mode apply --output json` commits + reports', () => {
      const json = useThen('the apply json carries the two reaped clones', () =>
        invokeRhachetCliBinary({
          args: ['clone', 'prune', '--mode', 'apply', '--output', 'json'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        }),
      );

      then('the machine shape is mode=apply, count=2, omits the DEAF watcher', () => {
        expect(json.status).toEqual(0);
        expect(json.stdout).not.toContain('├─');
        const parsed = JSON.parse(json.stdout) as {
          mode: string;
          count: number;
          clones: { slug: string | null }[];
        };
        expect(parsed.mode).toEqual('apply');
        expect(parsed.count).toEqual(2);
        expect(parsed.clones.map((c) => c.slug)).not.toContain('watcher');
      });

      then('the apply json shape is locked (machine contract)', () => {
        // serial/since in each row are masked by asSnapshotSafe; the mode + count +
        // row shape lock against drift, the machine twin of the apply TREE at case2 t0
        expect(asSnapshotSafe(json.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case3] the --older-than gate holds back a fresh dead clone', () => {
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'clone-prune-age' });
      setupEnrollFixture({ dir });
      // one DEAD clone that died JUST NOW — younger than the 1h gate below
      genSampleCloneOnDisk({
        repoPath: dir,
        serial: getUuid(),
        slug: 'fresh',
        socketEligible: true,
        spawnedAt: now(),
      });
      return { dir, env: { PATH: process.env.PATH ?? '' } };
    });

    when('[t0] `clone prune --older-than 1h` requires an hour of death', () => {
      const planned = useThen('a fresh dead clone is below the age gate', () =>
        invokeRhachetCliBinary({
          args: ['clone', 'prune', '--older-than', '1h'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        }),
      );

      then('the plan is empty — the fresh clone has not been dead an hour', () => {
        expect(planned.status).toEqual(0);
        expect(planned.stdout).toContain('no dead clones to prune');
        expect(planned.stdout).not.toContain('@:fresh');
      });

      then('the empty-plan tree matches the snapshot', () => {
        expect(asSnapshotSafe(planned.stdout)).toMatchSnapshot();
      });

      then('the empty-plan json machine shape is locked (count 0, no clones)', () => {
        // the MACHINE counterpart of the empty plan — a cron reads {mode, count:0,
        // clones:[]} as fields, so a no-dead-clones result is a parseable zero, never a
        // scrape of the human "(no dead clones)" line (uc.11 exhaustiveness)
        const json = invokeRhachetCliBinary({
          args: ['clone', 'prune', '--older-than', '1h', '--output', 'json'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        });
        expect(json.status).toEqual(0);
        expect(json.stdout).not.toContain('├─');
        const parsed = JSON.parse(json.stdout) as {
          mode: string;
          count: number;
          clones: unknown[];
        };
        expect(parsed.mode).toEqual('plan');
        expect(parsed.count).toEqual(0);
        expect(parsed.clones).toEqual([]);
        expect(asSnapshotSafe(json.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] a bad `--older-than` value fails loud with the fix', () => {
      const bad = useThen('a non <N><unit> value is rejected', () =>
        invokeRhachetCliBinary({
          args: ['clone', 'prune', '--older-than', 'soon'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        }),
      );

      then('it exits non-zero and names the valid shape', () => {
        expect(bad.status).not.toEqual(0);
        expect(bad.stderr).toContain('--older-than');
        expect(bad.stderr.toLowerCase()).toContain('s|m|h|d');
      });

      then('the fail-loud message matches the snapshot', () => {
        // a fixed literal value ("soon") — the error is token-free, so it locks the
        // exact text that names the fix a caller reads (rule.require.errors-name-the-fix)
        expect(asSnapshotSafe(bad.stderr)).toMatchSnapshot();
      });
    });

    when('[t1b] the same bad `--older-than` value with --output json', () => {
      // the machine twin of t1: a cron that schedules a prune reads the invalid-input
      // failure as a parseable structured error (class + message + hint), never human
      // tree prose — the bad `--older-than` is a pure input fault (no state mutation),
      // so it runs safely in the same scene. owed its json snapshot per
      // rule.require.contract-snapshot-exhaustiveness (the tree twin is locked above)
      const badJson = useThen('a non <N><unit> value is rejected as JSON', () =>
        invokeRhachetCliBinary({
          args: ['clone', 'prune', '--older-than', 'soon', '--output', 'json'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        }),
      );

      then('it exits non-zero and emits a parseable error (no tree glyphs)', () => {
        expect(badJson.status).not.toEqual(0);
        expect(badJson.stderr).not.toContain('✋');
        const parsed = JSON.parse(badJson.stderr) as {
          class: string;
          message: string;
        };
        expect(parsed.class).toEqual('ConstraintError');
        expect(parsed.message).toContain('--older-than');
      });

      then('the bad `--older-than` json error shape is locked (machine contract)', () => {
        // "soon" is a fixed literal, so the structured error is token-free — a
        // widened/renamed field surfaces as a snapshot diff for a machine consumer
        expect(asSnapshotSafe(badJson.stderr)).toMatchSnapshot();
      });
    });

    when('[t2] a bad `--mode` value fails loud with the fix', () => {
      // the `--mode` validator (asPruneMode) is the safety gate that keeps a slip from a
      // clone-reap (plan previews, only apply removes) — a mistyped mode must fail loud
      // with the valid forms, never silently default to apply. mirrors t1's tree
      // coverage for the twin --older-than guard. a pure input fault (no state
      // mutation), so it runs safely in case3's scene
      const bad = useThen('a non plan|apply mode is rejected', () =>
        invokeRhachetCliBinary({
          args: ['clone', 'prune', '--mode', 'bogus'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        }),
      );

      then('it exits non-zero and names the valid modes', () => {
        expect(bad.status).not.toEqual(0);
        expect(bad.stderr).toContain('--mode');
        expect(bad.stderr.toLowerCase()).toMatch(/plan|apply/);
      });

      then('the fail-loud message matches the snapshot', () => {
        // "bogus" is a fixed literal — the error is token-free, so it locks the exact
        // text that names the fix (rule.require.errors-name-the-fix)
        expect(asSnapshotSafe(bad.stderr)).toMatchSnapshot();
      });
    });

    when('[t2b] the same bad `--mode` value with --output json', () => {
      // the machine twin of t2: a cron that schedules a prune reads the invalid-mode
      // failure as a parseable structured error, never human tree prose — owed its json
      // snapshot per rule.require.contract-snapshot-exhaustiveness (the tree twin above)
      const badJson = useThen('a non plan|apply mode is rejected as JSON', () =>
        invokeRhachetCliBinary({
          args: ['clone', 'prune', '--mode', 'bogus', '--output', 'json'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        }),
      );

      then('it exits non-zero and emits a parseable error (no tree glyphs)', () => {
        expect(badJson.status).not.toEqual(0);
        expect(badJson.stderr).not.toContain('✋');
        const parsed = JSON.parse(badJson.stderr) as {
          class: string;
          message: string;
        };
        expect(parsed.class).toEqual('ConstraintError');
        expect(parsed.message).toContain('--mode');
      });

      then('the bad `--mode` json error shape is locked (machine contract)', () => {
        expect(asSnapshotSafe(badJson.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case4] a reap that fails mid-batch reaps the rest, then fails loud', () => {
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'clone-prune-resilient' });
      setupEnrollFixture({ dir });

      // the STUBBORN clone is attempted FIRST (earlier spawnedAt): its `history/`
      // is a FILE, not a dir, so delClone's readdir throws ENOTDIR mid-reap. this
      // is a deterministic, portable reap failure — no chmod (root bypasses it),
      // no race — the same plant-a-broken-artifact discipline as clone.get-advisory
      const stubborn = genSampleCloneOnDisk({
        repoPath: dir,
        serial: getUuid(),
        slug: 'stubborn',
        socketEligible: true, // socket-eligible, no server → DEAD → prunable
        spawnedAt: asIsoTimeStamp('2026-08-11T00:00:00Z'),
      });
      writeFileSync(
        getCloneHistoryDir({ cloneDir: stubborn.cloneDir }),
        'x',
        'utf8',
      );

      genSampleCloneOnDisk({
        repoPath: dir,
        serial: getUuid(),
        slug: 'reapable',
        socketEligible: true, // DEAD → prunable, attempted AFTER the stubborn throw
        spawnedAt: asIsoTimeStamp('2026-08-11T01:00:00Z'),
      });

      return {
        dir,
        env: { PATH: process.env.PATH ?? '' },
        stubbornCloneDir: stubborn.cloneDir,
      };
    });

    when('[t0] `clone prune --mode apply` hits the stubborn clone first', () => {
      const applied = useThen(
        'the apply reaps what it can, then list re-reads',
        () => {
          const pruned = invokeRhachetCliBinary({
            args: ['clone', 'prune', '--mode', 'apply'],
            cwd: scene.dir,
            env: scene.env,
            logOnError: false,
          });
          const listed = invokeRhachetCliBinary({
            args: ['clone', 'list'],
            cwd: scene.dir,
            env: scene.env,
            logOnError: false,
          });
          return { pruned, listed };
        },
      );

      then('it fails loud — a partial reap is never silently swallowed', () => {
        // MalfunctionError = exit 1; the batch could not fully complete, and the
        // failure surfaces rather than a false all-clear (rule.forbid.failhide)
        expect(applied.pruned.status).toEqual(1);
        expect(applied.pruned.stderr).toContain('could not be reaped');
        expect(applied.pruned.stderr).toContain('rhx clone prune');
      });

      then('the RESILIENT loop still reaped the healthy peer', () => {
        // the reapable clone was attempted AFTER the stubborn one threw, so its
        // absence proves the batch did NOT abort on the first failure — DOGFOOD:
        // drop the per-clone try/catch in invokeClonePrune and the loop aborts on
        // stubborn, reapable survives, and this assertion goes red
        expect(applied.listed.stdout).not.toContain('@:reapable');
      });

      then('the stubborn clone was genuinely NOT reaped (its dir survives)', () => {
        // delClone threw before its final rmSync, so the stubborn dir is still on
        // disk — proof the failure was real, not a false "pruned" that hid a clone
        // left behind on one bad dir
        expect(existsSync(scene.stubbornCloneDir)).toEqual(true);
      });

      then('the fail-loud message matches the snapshot', () => {
        // the message is count-based ("pruned 1 clone(s), but 1 could not be reaped")
        // + the filesystem-permissions hint — token-free, so it locks the exact text
        expect(asSnapshotSafe(applied.pruned.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case4b] the mid-batch reap failure emits a MACHINE json error', () => {
    // the machine twin of case4: a supervisor that drives prune reads the partial-reap
    // failure as a parseable structured error (class=MalfunctionError), never human
    // tree prose. apply CONSUMES the reapable set, so a re-run over case4's already-
    // reaped state would change the count — this needs its OWN fixture so the json
    // apply is the SOLE prune and captures the POPULATED partial-failure shape (the
    // most important path to lock: a fail-loud/no-failhide guarantee, uc.11)
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'clone-prune-resilient-json' });
      setupEnrollFixture({ dir });

      // same plant as case4: the stubborn clone's `history/` is a FILE, so delClone's
      // readdir throws ENOTDIR mid-reap — a deterministic, portable reap failure
      const stubborn = genSampleCloneOnDisk({
        repoPath: dir,
        serial: getUuid(),
        slug: 'stubborn',
        socketEligible: true, // DEAD → prunable
        spawnedAt: asIsoTimeStamp('2026-08-11T00:00:00Z'),
      });
      writeFileSync(
        getCloneHistoryDir({ cloneDir: stubborn.cloneDir }),
        'x',
        'utf8',
      );

      genSampleCloneOnDisk({
        repoPath: dir,
        serial: getUuid(),
        slug: 'reapable',
        socketEligible: true, // DEAD → prunable, reaped AFTER the stubborn throw
        spawnedAt: asIsoTimeStamp('2026-08-11T01:00:00Z'),
      });

      return { dir, env: { PATH: process.env.PATH ?? '' } };
    });

    when('[t0] `clone prune --mode apply --output json` hits the stubborn clone', () => {
      const pruned = useThen('the apply fails loud as a machine error', () =>
        invokeRhachetCliBinary({
          args: ['clone', 'prune', '--mode', 'apply', '--output', 'json'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        }),
      );

      then('it exits 1 (a server fault) and emits a parseable error (no tree glyphs)', () => {
        // MalfunctionError = exit 1; the partial reap is a server-side fault a machine
        // branches on by field, never human tree prose (rule.forbid.friction-hazards)
        expect(pruned.status).toEqual(1);
        expect(pruned.stderr).not.toContain('✋');
        const parsed = JSON.parse(pruned.stderr) as {
          class: string;
          message: string;
        };
        expect(parsed.class).toEqual('MalfunctionError');
        expect(parsed.message).toContain('could not be reaped');
      });

      then('the mid-batch-failure json error shape is locked (machine contract)', () => {
        // the message is count-based + token-free, so a widened/renamed structured-
        // error field surfaces as a snapshot diff for a supervisor consumer
        expect(asSnapshotSafe(pruned.stderr)).toMatchSnapshot();
      });
    });
  });
});
