import { genTempDir, given, then, useBeforeAll, useThen, when } from 'test-fns';
import { getUuid } from 'uuid-fns';

import {
  enrollCloneAndWaitReady,
  pollForAck,
  setupEnrollFixture,
  setupRichStubBrainPath,
} from '@/blackbox/.test/infra/enrollCloneHarness';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';

/**
 * .what = the blueprint-mandated worked-example JOURNEY — one end-to-end flow that
 *   ties the individually-clamped reach behaviors into a single narrative: enroll a
 *   named clone → reach it by slug (say/get) → recover from an address-grain slip →
 *   watch it go DEAD in `clone list` after the brain exits → read the actor bookend.
 * .why =
 *   - each timestep is snapshotted so the human-read sequence is locked against
 *     silent drift (rule.require.clamp-edge-cases); the flow is the "worked example"
 *     the blueprint names as a paramount critipath
 *   - it fills the gaps r010 (enroll-impl-behavior-intent) flagged as covered NOWHERE
 *     in one flow: the address-confusion→recovery step, and the SIGINT→DEAD transition
 *     OBSERVED VIA `clone list` (the peer suites prove the pieces; this proves the
 *     journey)
 *   - proven against the REAL stub brain through the OUTER pty (never a mock), so the
 *     socket + mirror actually stand up
 *
 * .note = scope — this journey clamps the CORE reach narrative + the two named
 *   single-flow gaps. the costlier edge timesteps are each ALREADY clamped by a
 *   dedicated suite, so they are not re-spawned here:
 *   - the bare-enroll F7 breadcrumb, the `--output json` machine handoff, and the
 *     `--no-socket` fallback → `enroll.reach.acceptance`
 *   - the dead-clone `say` error + the unknown-address error → `clone.acceptance`
 *   - the SIGKILL-orphan advisory → `computeCloneOrphanVerdict.test` (a live-but-billed
 *     orphan cannot be honestly simulated at the acceptance grain without a real
 *     SIGKILL leak; the pure verdict classifier is the clamp)
 *   - concurrent clones of one actor → `getOneCloneLiveCountForActor.integration`
 */
describe('enroll → reach journey (acceptance)', () => {
  const scene = useBeforeAll(async () => {
    const dir = genTempDir({ slug: 'journey' });
    const configDir = genTempDir({ slug: 'journey-cfg' });
    setupEnrollFixture({ dir });
    const stubPath = setupRichStubBrainPath({ dir });
    const env = { PATH: stubPath, CLAUDE_CONFIG_DIR: configDir };

    // t0 of the world: enroll a NAMED clone through the outer pty (socket stands up)
    const { bg, serial } = await enrollCloneAndWaitReady({
      dir,
      env,
      as: '@:pilot',
    });
    return { dir, env, bg, serial };
  });
  afterAll(async () => {
    await scene.bg.kill();
  });

  given('[case1] a named clone @:pilot enrolled and live', () => {
    when('[t0] the actor + clone are on disk', () => {
      then('the on-disk actor is an ANONYMOUS hash actor, never a slug actor', () => {
        // the two-grain split: the clone wears the @:pilot handle, but its actor is
        // named by an abbreviated HASH (@<7hex>…) — enroll is hash-only (never
        // actors.yml), so the slug is a clone grain, never an actor grain
        const listed = invokeRhachetCliBinary({
          args: ['actor', 'list'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        });
        expect(listed.status).toEqual(0);
        expect(listed.stdout).toContain('brain=claude');
        expect(listed.stdout).toMatch(/@[0-9a-f]{7}…/);
        expect(listed.stdout).not.toContain('pilot');
      });

      then('the clone appears LIVE by its slug in `clone list`', () => {
        const listed = invokeRhachetCliBinary({
          args: ['clone', 'list'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        });
        expect(listed.status).toEqual(0);
        expect(listed.stdout).toContain('pilot');
        expect(listed.stdout).toContain('LIVE');
      });
    });

    when('[t1] the human reaches the clone by slug (the core round-trip)', () => {
      const nonce = getUuid().slice(0, 8);
      const reach = useThen('say @:pilot then get carries the ack', async () => {
        const said = invokeRhachetCliBinary({
          args: ['clone', 'say', '@:pilot', '--what', `poke ${nonce}`],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        });
        expect(said.status).toEqual(0);
        return {
          got: await pollForAck({
            address: '@:pilot',
            nonce,
            dir: scene.dir,
            env: scene.env,
          }),
        };
      });

      then('the get output carries the TRANSFORMED ack (say reached the brain)', () => {
        expect(reach.got).toContain(`ack:${nonce}`);
      });
    });

    when('[t2] a process slips on the address grain, then recovers', () => {
      const slip = useThen(
        'a say to the ACTOR sigil @pilot fails loud (wrong grain)',
        () =>
          invokeRhachetCliBinary({
            args: ['clone', 'say', '@pilot', '--what', 'wrong grain'],
            cwd: scene.dir,
            env: scene.env,
            logOnError: false,
          }),
      );

      then('the grain error names the fix (@: clone form)', () => {
        expect(slip.status).not.toEqual(0);
        expect(slip.stderr.toLowerCase()).toContain('actor address');
        expect(slip.stderr).toContain('@:pilot');
      });

      then('the grain-confusion error format is locked (visual spot-check)', () => {
        expect(asSnapshotSafe(slip.stderr)).toMatchSnapshot();
      });

      then('the grain-confusion json error shape is locked (self-contained machine twin)', () => {
        // the journey stays self-contained: a machine that slips the address grain
        // reads the recovery hint as a structured field here, not only in the unit
        // reach suite (nitpick — journey json self-containment)
        const slipJson = invokeRhachetCliBinary({
          args: ['clone', 'say', '@pilot', '--what', 'wrong grain', '--output', 'json'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        });
        expect(slipJson.status).toEqual(2);
        const parsed = JSON.parse(slipJson.stderr) as {
          class: string;
          message: string;
        };
        expect(parsed.class).toEqual('ConstraintError');
        expect(parsed.message.toLowerCase()).toContain('actor address');
        expect(asSnapshotSafe(slipJson.stderr)).toMatchSnapshot();
      });

      then('recovery: the SAME message by the @: clone form delivers', () => {
        const recovered = invokeRhachetCliBinary({
          args: ['clone', 'say', '@:pilot', '--what', 'right grain'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        });
        expect(recovered.status).toEqual(0);
        expect(recovered.stdout).toContain('said to');
      });
    });

    when('[t3] the brain exits — the clone is watched to go DEAD in `clone list`', () => {
      const listed = useThen('after the brain exits, clone list reads DEAD', async () => {
        // exit the brain, then let its socket close before the read
        await scene.bg.kill();
        await new Promise((r) => setTimeout(r, 500));
        return invokeRhachetCliBinary({
          args: ['clone', 'list'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        });
      });

      then('the once-live clone now reads DEAD, by its slug', () => {
        expect(listed.status).toEqual(0);
        expect(listed.stdout).toContain('pilot');
        expect(listed.stdout).toContain('DEAD');
      });

      then('the DEAD-transition clone-list format is locked (visual spot-check)', () => {
        // serial/socket/since are masked; the slug + DEAD state word + the prune tip are
        // deterministic — this locks the transition a human observes
        expect(asSnapshotSafe(listed.stdout)).toMatchSnapshot();
      });

      then('the DEAD-transition clone-list json shape is locked (self-contained machine twin)', () => {
        // a cron that watches for a finished clone reads reachState=DEAD as a field,
        // not by a scrape of the human tree — the journey keeps its own machine proof
        // (serial + spawnedAt are masked by asSnapshotSafe)
        const listedJson = invokeRhachetCliBinary({
          args: ['clone', 'list', '--output', 'json'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        });
        expect(listedJson.status).toEqual(0);
        expect(listedJson.stdout).not.toContain('├─');
        const parsed = JSON.parse(listedJson.stdout) as {
          actors: { clones: { slug: string | null; reachState: string }[] }[];
        };
        const clones = parsed.actors.flatMap((a) => a.clones);
        const pilot = clones.find((c) => c.slug === 'pilot');
        expect(pilot).toBeDefined();
        expect(pilot!.reachState).toEqual('DEAD');
        expect(asSnapshotSafe(listedJson.stdout)).toMatchSnapshot();
      });
    });
  });
});
