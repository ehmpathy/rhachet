import { ConstraintError } from 'helpful-errors';
import { genTempDir, given, then, useBeforeAll, useThen, when } from 'test-fns';
import { getUuid } from 'uuid-fns';

import {
  enrollCloneAndWaitReady,
  pollForAck,
  pollForCloneListState,
  setupEnrollFixture,
  setupRichStubBrainPath,
} from '@/blackbox/.test/infra/enrollCloneHarness';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
  invokeRhachetCliBinaryAsync,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { findsertActorOndisk } from '@src/domain.operations/actor/enrolled/findsertActorOndisk';
// the ONE owner of the short-serial projection. its own unit clamp pins the shape with
// LITERALS (`'49b41f88'`, length 8, a genuine prefix), so a read through it here asserts
// "the cli renders THAT projection" rather than re-derives the rule a second time
import { asCloneSerialHuman } from '@src/domain.operations/clone/asCloneSerialHuman';
import { genSampleCloneOndisk } from '@src/.test/assets/genSampleCloneOndisk';

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { CLONE_ENV_KEYS } from '@src/utils/cloneEnvKeys';

/**
 * .what = the clone env-var keys, each set to `undefined`, so a spawned child carries NO
 *   clone identity at all — spread this into any `env` that must read as "outside a clone"
 * .why =
 *   - the harness merges `{ ...process.env, ...input.env }`, so whatever the TEST RUNNER
 *     itself carries leaks into every child. a comment that says "no serial is injected
 *     here" states the intent and enforces none of it
 *   - ⚠️ measured 2026-09-16: this suite's two "outside a clone" cases pass for a human and
 *     FAIL for a clone. run by an enrolled clone, the child inherited that clone's real
 *     `RHACHET_CLONE_SERIAL`, so `whoami` took the inside-a-clone branch, failed to find
 *     that serial under the temp repo's ondisk root, and returned a MalfunctionError where
 *     the case demands a ConstraintError. a hermeticity gap (`rule.require.hermetic-tests`),
 *     invisible to the author precisely because the author was not a clone
 *   - both keys, never only the serial: `whoami` reads a PAIR (`cloneEnvKeys.ts`), so to
 *     unset one and inherit the other leaves a half-identity in the child
 * .note = the harness drops every `undefined` value before spawn, which is what makes an
 *   explicit `undefined` an UNSET rather than an empty string
 */
const CLONE_ENV_UNSET: Record<string, undefined> = {
  [CLONE_ENV_KEYS.serial]: undefined,
  [CLONE_ENV_KEYS.socket]: undefined,
};

/**
 * .what = THE mandated reach clamp — enroll a named clone through a REAL pty, then
 *   `say` into it and `get` the TRANSFORMED reply back, by BOTH its @:<slug> and its
 *   @:<serial>, so the socket is proven end-to-end against a real child (never a mock)
 * .why =
 *   - the socket ONLY stands up on an interactive tty (isCloneSocketEligible needs
 *     `interactive`). a plain spawnSync pipes stdio, so enroll must run under a pty:
 *     spawnRhachetCliBackground is the OUTER pty (test → rhachet), genBrainCliPtyClone
 *     the INNER pty (rhachet → the stub brain). two ptys nested, the human's topology
 *   - `say poke <nonce>` → the stub replies `ack:<nonce>` (a TRANSFORM, never an echo),
 *     so a green `get` proves the say TRULY reached the brain, not that a byte bounced
 *   - the actor stays `actor.via.hash=…` while the clone wears the @:driver handle —
 *     the two-grain split the whole frame rests on (enroll is hash-only)
 *
 * .note = DOGFOOD: mangle the say message (or disable the get re-link) and the ack
 *   assertions go red — the transformed ack never lands. that is the proof it bites,
 *   per rule.require.clamp-edge-cases (verified 2026-08-10)
 */

describe('rhx clone reach (acceptance)', () => {
  given('[case1] a named clone enrolled through a real pty', () => {
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'clone-reach' });
      const configDir = genTempDir({ slug: 'clone-reach-cfg' });
      setupEnrollFixture({ dir });
      const stubPath = setupRichStubBrainPath({ dir });
      const env = { PATH: stubPath, CLAUDE_CONFIG_DIR: configDir };

      // enroll through the OUTER pty so rhachet sees a tty → the socket stands up;
      // the serial the stub prints is RHACHET_CLONE_SERIAL, this clone's primary ref
      const { bg, serial } = await enrollCloneAndWaitReady({
        dir,
        env,
        as: '@:driver',
      });

      return { dir, configDir, stubPath, env, bg, serial };
    });
    afterAll(async () => {
      await scene.bg.kill();
    });

    when('[t0] the clone is enrolled', () => {
      then('the on-disk actor is a HASH actor, never a slug actor', () => {
        const actorsRoot = join(scene.dir, '.agent', '.actors');
        const entries = readdirSync(actorsRoot);
        // the two-grain split: enroll writes ONLY the hash namespace
        expect(entries.some((e) => e.startsWith('actor.via.hash='))).toBe(true);
        // `actor.via.slug=.default` is the REPO's own brain dir, written by
        // `roles link` in the fixture — enroll never touches it
        // (define.brain-dir-repo-vs-actor). so the one permitted slug entry is
        // named outright: any OTHER slug actor means enroll minted one
        expect(entries.filter((e) => e.startsWith('actor.via.slug='))).toEqual([
          'actor.via.slug=.default',
        ]);
      });

      then('the clone appears LIVE in `clone list`, by slug + abbreviated serial', () => {
        const listed = invokeRhachetCliBinary({
          args: ['clone', 'list'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        });
        expect(listed.status).toEqual(0);
        expect(listed.stdout).toContain('driver');
        // list shows an ABBREVIATED serial (the 8-char prefix + ellipsis); the
        // FULL-serial reach is proven separately in [t2] (say/get by @:<serial>)
        expect(listed.stdout).toContain(
          asCloneSerialHuman({ serial: scene.serial }),
        );
        expect(listed.stdout).toContain('LIVE');
      });

      then('the clone-list tree format is locked (visual spot-check)', () => {
        const listed = invokeRhachetCliBinary({
          args: ['clone', 'list'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        });
        // serial (abbrev), socket + since-timestamp are masked; the actor hash,
        // slug + state word are deterministic — so this locks the layout
        expect(asSnapshotSafe(listed.stdout)).toMatchSnapshot();
      });

      then('the clone-list json machine shape is locked (catches a drifted shape)', () => {
        // the MACHINE counterpart of the tree list — a cron/comms consumer reads the
        // grouped facts as fields, never box-glyphs (usecase.11). the populated json
        // pairs with the actor-list json pattern; serial + spawnedAt are masked, the
        // actorHash is deterministic, so the {actors:[{…,clones:[…]}]} shape locks
        const listed = invokeRhachetCliBinary({
          args: ['clone', 'list', '--output', 'json'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        });
        expect(listed.status).toEqual(0);
        // a machine parses fields, never tree glyphs
        expect(listed.stdout).not.toContain('├─');
        const parsed = JSON.parse(listed.stdout) as {
          actors: { clones: { reachState: string }[] }[];
        };
        expect(parsed.actors).toHaveLength(1);
        expect(parsed.actors[0]!.clones[0]!.reachState).toEqual('LIVE');
        expect(asSnapshotSafe(listed.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] say poke <nonce> BY SLUG, then get', () => {
      // 🚨 a UUID, never a clock read. jest runs files in parallel workers, so two runs
      //   inside one millisecond mint the SAME nonce — and `ack:${nonce}` would then match
      //   the other clone's reply, a green about a dispatch this row never made
      const nonce = `slug${getUuid()}`;
      const roundtrip = useThen('the say+get round-trips by slug', async () => {
        const said = await invokeRhachetCliBinaryAsync({
          args: ['clone', 'say', '@:driver', '--what', `poke ${nonce}`],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        });
        if (said.status !== 0)
          throw new ConstraintError('say (by slug) failed', {
            stderr: said.stderr,
            hint: 'the clone must be LIVE for a say to land; check `clone list`',
          });
        return {
          said,
          got: await pollForAck({
            address: '@:driver',
            nonce,
            dir: scene.dir,
            env: scene.env,
          }),
        };
      });

      then('the say reports delivered (exit 0)', () => {
        expect(roundtrip.said.status).toEqual(0);
        expect(roundtrip.said.stdout).toContain('said to');
      });

      then('the get output carries the TRANSFORMED ack (say reached the brain)', () => {
        expect(roundtrip.got).toContain(`ack:${nonce}`);
      });

      then('the say tree (human) success format is locked (visual spot-check)', () => {
        // the PRIMARY interactive output variant (uc.6) — a human-readable `delivered`
        // tree, paired with the say JSON success (t7) and the say error (t4). the nonce
        // in the acked message is masked; @:driver is a fixed literal, so the layout
        // locks against silent drift per rule.require.contract-snapshot-exhaustiveness
        expect(
          asSnapshotSafe(roundtrip.said.stdout).split(nonce).join('__NONCE__'),
        ).toMatchSnapshot();
      });
    });

    when('[t2] say poke <nonce> BY SERIAL, then get', () => {
      const nonce = `serial${getUuid()}`;
      const roundtrip = useThen(
        'the same clone round-trips by serial (address forms interchangeable)',
        async () => {
          const address = `@:${scene.serial}`;
          const said = await invokeRhachetCliBinaryAsync({
            args: ['clone', 'say', address, '--what', `poke ${nonce}`],
            cwd: scene.dir,
            env: scene.env,
            logOnError: false,
          });
          if (said.status !== 0)
            throw new ConstraintError('say (by serial) failed', {
              stderr: said.stderr,
              hint: 'the clone must be LIVE for a say to land; check `clone list`',
            });
          return {
            said,
            got: await pollForAck({
              address,
              nonce,
              dir: scene.dir,
              env: scene.env,
            }),
          };
        },
      );

      then('the say reports delivered (exit 0)', () => {
        expect(roundtrip.said.status).toEqual(0);
        expect(roundtrip.said.stdout).toContain('said to');
      });

      then('the get by serial carries the TRANSFORMED ack too', () => {
        expect(roundtrip.got).toContain(`ack:${nonce}`);
      });
    });

    when('[t2b] say + get BY ABBREVIATED SERIAL (the exact short form `clone list` shows)', () => {
      // the abbreviation clamp (rule.require.clamp-edge-cases): `clone list` shows a clone
      // by its FIRST uuid segment (asCloneSerialHuman, e.g. `@:49b41f88`). that short
      // address MUST be reachable, else the displayed handle is a dead end. this proves
      // the git-style serial-prefix match in getOneCloneByRef lands a say AND a get on the
      // SAME clone the full serial reaches — the ergonomic short form is not lossy in
      // practice (a first-8 collision fails LOUD, never a silent wrong-clone)
      const nonce = `abbrev${getUuid()}`;
      const roundtrip = useThen(
        'the clone round-trips by its abbreviated (first-8-hex) serial',
        async () => {
          // the EXACT short form the list renders, read through its one owner — so a
          // change to the projection moves this address with it rather than strands it
          const address = `@:${asCloneSerialHuman({ serial: scene.serial })}`;
          const said = await invokeRhachetCliBinaryAsync({
            args: ['clone', 'say', address, '--what', `poke ${nonce}`],
            cwd: scene.dir,
            env: scene.env,
            logOnError: false,
          });
          if (said.status !== 0)
            throw new ConstraintError('say (by abbreviated serial) failed', {
              stderr: said.stderr,
              hint: 'the abbreviated serial must reach the clone via getOneCloneByRef prefix-match',
            });
          return {
            said,
            got: await pollForAck({
              address,
              nonce,
              dir: scene.dir,
              env: scene.env,
            }),
          };
        },
      );

      then('the say by abbreviated serial reports delivered (exit 0)', () => {
        expect(roundtrip.said.status).toEqual(0);
        expect(roundtrip.said.stdout).toContain('said to');
      });

      then('the get by abbreviated serial carries the TRANSFORMED ack', () => {
        // proves the short form the list shows reaches the same clone the full serial does
        expect(roundtrip.got).toContain(`ack:${nonce}`);
      });
    });

    when('[t3] a process runs `clone whoami` FROM WITHIN the clone', () => {
      // a spawned clone carries its serial in its env; whoami reads it back to name
      // ITSELF — proven with the same env var a real spawn sets on the child
      const who = useThen('whoami resolves this clone`s own address', () =>
        invokeRhachetCliBinary({
          args: ['clone', 'whoami'],
          cwd: scene.dir,
          env: { ...scene.env, RHACHET_CLONE_SERIAL: scene.serial },
          logOnError: false,
        }),
      );

      then('whoami names this clone by its own slug + SHORT serial', () => {
        expect(who.status).toEqual(0);
        expect(who.stdout).toContain('driver');

        /**
         * 🚨 the human tree carries the 8-hex form, the same one `clone list` renders
         *   (`rule.require.short-serial-for-unslugged-clones`, via `asCloneAddressHuman`).
         *
         * ⚠️ .the claim this row used to make = `toContain(scene.serial)`, the FULL 36-char
         *   uuid. it was true of the code and wrong about the boundary: a human tree is read
         *   by a human or by a brain that will TYPE what it sees, and 36 chars is neither.
         *   the canonical form is not lost — [t5] below asserts `parsed.serial` equals the
         *   full serial on the `--output json` twin, which is the machine channel and the
         *   one place the lossless form is owed.
         */
        expect(who.stdout).toContain(
          asCloneSerialHuman({ serial: scene.serial }),
        );
        expect(who.stdout).not.toContain(scene.serial);
      });

      then('the whoami tree (human) success format is locked (visual spot-check)', () => {
        // the PRIMARY interactive self-identity variant (uc.11 addendum 5) — paired
        // with the whoami JSON success (t5) and the not-a-clone error (t5b). the serial
        // is masked by asSnapshotSafe, the slug is a fixed literal, so the layout locks
        // stably per rule.require.contract-snapshot-exhaustiveness
        expect(asSnapshotSafe(who.stdout)).toMatchSnapshot();
      });
    });

    when('[t3b] the clone says to ITS OWN address (a self-say LANDS)', () => {
      /**
       * 🔴 .the capability this clamps = a clone must be able to say to ITSELF. it is
       *   how a clone nudges its own next turn (a self-driven loop) and how it hands
       *   itself a client-level slash command (`/model`, `/compact`). the wisher calls
       *   it a key requirement.
       *
       * 🔴 .the defect this clamps = a prior round REFUSED the verb outright, on two
       *   mechanisms it labelled `nature`. both were wrong, and this wish's own later
       *   measurements are what refute them:
       *     1. the claimed RELEASE deadlock — *"the poll waits for a transcript rise
       *        impossible while it waits"*. the brain writes each user turn to the jsonl
       *        the moment it is SUBMITTED, client-side, before any reply
       *        (`getCloneSubmittedCount.ts:12-14`, measured 2026-09-18 at 678ms), so the
       *        rise never waited on a brain turn at all
       *     2. the claimed BASELINE collision — *"the caller's own screen already renders
       *        the tool call, so no rise is partable from the echo"*. a baseline that
       *        already HOLDS the text is the exact case a COUNT parts and a boolean
       *        cannot (`getCloneSubmittedCount.ts:15-17`) — 1 → 2 reads like 0 → 1
       *
       *   measured 2026-09-20 against a real brain that said to its own address:
       *   `delivered: true` `verdict: enqueued` `probe: capable`, and the message landed
       *   as a turn. so the claim *"the residual verdict, every time"* was false
       *
       * .what a self-say DOES still owe = the `--await release` clamp below. that one
       *   knob is genuinely unreachable, and it is the whole surviving constraint
       *
       * .why the env var is the instrument = a real spawn injects
       *   `RHACHET_CLONE_SERIAL` into the child, and [t3] above proves whoami reads
       *   that same var to name itself. so this row reproduces "the clone issued it"
       *   exactly as the spawn does, with no second mechanism to drift
       */
      const selfSaid = useThen('the self-say lands', () =>
        invokeRhachetCliBinary({
          args: ['clone', 'say', '@:driver', '--what', 'self-poke'],
          cwd: scene.dir,
          env: { ...scene.env, RHACHET_CLONE_SERIAL: scene.serial },
          logOnError: false,
        }),
      );

      then('🔴 it exits 0 and reports a landing — never a refusal', () => {
        // the capability, asserted at the grain a caller reads. a self-say takes the
        // SAME path a peer say takes ([t1]/[t2] above): the env var changes the await
        // clamp and no more, so the outcome must match theirs
        expect(selfSaid.status).toEqual(0);
        expect(selfSaid.stdout).toContain('said to');
      });

      then('🔴 the retired refusal copy is gone from the surface', () => {
        // the clamp on a regression BACK to the refusal: a re-introduced gate would
        // exit 2 with this prose, and the row above would redden for a reason a reader
        // could mistake for a reach fault. this names the exact retired string
        expect(selfSaid.stderr.toLowerCase()).not.toContain(
          'cannot say to itself',
        );
      });

      then('the self-say json carries the verdict trio (machine contract)', () => {
        // the MACHINE twin — a self-managed clone reads its own dispatch through the
        // same additive payload a peer dispatch carries. 🔴 the trio must be PRESENT:
        //   the retired refusal had no verdict to report, and that absence was itself
        //   the tell that the verb never dispatched
        const selfJson = invokeRhachetCliBinary({
          args: [
            'clone',
            'say',
            '@:driver',
            '--what',
            'self-poke',
            '--output',
            'json',
          ],
          cwd: scene.dir,
          env: { ...scene.env, RHACHET_CLONE_SERIAL: scene.serial },
          logOnError: false,
        });
        expect(selfJson.status).toEqual(0);
        const parsed = JSON.parse(selfJson.stdout) as {
          delivered: boolean;
          verdict: string;
          probe: string;
        };
        expect(parsed.delivered).toEqual(true);
        expect(['released', 'enqueued']).toContain(parsed.verdict);
        expect(parsed.probe).toEqual('capable');
      });

      then('🔴 `--await release` clamps to enqueue, and says so', () => {
        // the ONE surviving constraint, and it is a clamp rather than a refusal:
        // `released` needs an empty queue, and the caller's own queue cannot drain
        // until this very say returns — the `clone say` process IS a tool call the
        // brain is mid-way through. so the honest act is to lower the target and
        // report it, never to poll the whole bound for an impossible drain
        const selfAwait = invokeRhachetCliBinary({
          args: [
            'clone',
            'say',
            '@:driver',
            '--what',
            'self-poke-await',
            '--await',
            'release',
          ],
          cwd: scene.dir,
          env: { ...scene.env, RHACHET_CLONE_SERIAL: scene.serial },
          logOnError: false,
        });
        expect(selfAwait.status).toEqual(0);
        expect(selfAwait.stderr.toLowerCase()).toContain('self-say');
        expect(selfAwait.stderr.toLowerCase()).toContain('enqueue');
      });

      then('the self-say success format is locked (visual spot-check)', () => {
        // the address is a fixed literal (@:driver), so this locks the exact tree a
        // clone reads back from its own dispatch — which must be byte-identical to a
        // peer say's, since no surface distinguishes them (V13)
        expect(asSnapshotSafe(selfSaid.stdout)).toMatchSnapshot();
      });
    });

    when('[t4] a process says to an UNKNOWN address', () => {
      const said = useThen('the say fails loud (never a silent drop)', () =>
        invokeRhachetCliBinary({
          args: ['clone', 'say', '@:ghostclone', '--what', 'anyone home?'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        }),
      );

      then('it exits non-zero and names the fix', () => {
        expect(said.status).not.toEqual(0);
        expect(said.stderr.toLowerCase()).toContain('no clone answers');
        expect(said.stderr.toLowerCase()).toContain('clone list');
      });

      then('the unknown-address error format is locked (visual spot-check)', () => {
        // the address is a fixed literal (@:ghostclone), so no token needs a mask;
        // this locks the exact error a caller reads against silent drift — matching
        // the dead-clone + clone-list error snapshots already in this suite
        expect(asSnapshotSafe(said.stderr)).toMatchSnapshot();
      });
    });

    when('[t5] `clone whoami --output json` (machine self-identity)', () => {
      // the machine counterpart of t3: a self-managed clone reads its own actorHash
      // from json, the named peer-discovery field (uc.11 addendum 5) — so it can then
      // `clone list @<actorHash>` to enumerate its siblings
      const who = useThen('whoami --output json returns a machine shape', () =>
        invokeRhachetCliBinary({
          args: ['clone', 'whoami', '--output', 'json'],
          cwd: scene.dir,
          env: { ...scene.env, RHACHET_CLONE_SERIAL: scene.serial },
          logOnError: false,
        }),
      );

      then('the json carries this clone`s serial, slug, and actorHash', () => {
        expect(who.status).toEqual(0);
        // a machine parses fields, never tree glyphs
        expect(who.stdout).not.toContain('├─');
        const parsed = JSON.parse(who.stdout) as {
          serial: string;
          slug: string | null;
          actorHash: string;
        };
        expect(parsed.serial).toEqual(scene.serial);
        expect(parsed.slug).toEqual('driver');
        // actorHash is the peer-discovery field — the FULL 8-char content hash a
        // clone passes to `clone list @<actorHash>`, never the 7-char list abbrev
        expect(parsed.actorHash).toMatch(/^[0-9a-f]{8}$/);
      });

      then('the whoami json machine shape is locked (catches a drifted shape)', () => {
        // pair the field asserts with a snapshot per rule.require.snapshots — the
        // serial is masked, the slug + actorHash + json key-set stay stable, so a
        // widened or renamed json field surfaces as a snapshot diff in review
        expect(asSnapshotSafe(who.stdout)).toMatchSnapshot();
      });
    });

    when('[t5b] `clone whoami` run OUTSIDE any enrolled clone', () => {
      // no clone env in the child — a plain shell, not a spawned clone.
      // the mandated fail-loud (usecase.11 addendum 5, third scenario): a caller
      // is never handed a fabricated self-identity — name the cause AND the fix
      const who = useThen('whoami fails loud when not inside a clone', () =>
        invokeRhachetCliBinary({
          args: ['clone', 'whoami'],
          cwd: scene.dir,
          env: { ...scene.env, ...CLONE_ENV_UNSET },
          logOnError: false,
        }),
      );

      then('it exits non-zero and names the cause + the fix', () => {
        expect(who.status).not.toEqual(0);
        expect(who.stderr.toLowerCase()).toContain(
          'not run inside an enrolled clone',
        );
        expect(who.stderr.toLowerCase()).toContain('rhx enroll');
      });

      then('the not-a-clone error format is locked (visual spot-check)', () => {
        // a fixed error with no volatile token — locks the exact text a caller
        // reads, like the dead-clone + unknown-address error snapshots above
        expect(asSnapshotSafe(who.stderr)).toMatchSnapshot();
      });
    });

    when('[t5c] `clone whoami --output json` run OUTSIDE any enrolled clone', () => {
      // the MACHINE twin of t5b: a clone that self-manages and consumes json must
      // read the not-a-clone failure as a structured field, never scrape the tree
      const whoJson = useThen('whoami --output json fails loud with a shape', () =>
        invokeRhachetCliBinary({
          args: ['clone', 'whoami', '--output', 'json'],
          cwd: scene.dir,
          env: { ...scene.env, ...CLONE_ENV_UNSET },
          logOnError: false,
        }),
      );

      then('it exits non-zero and the error is a parseable machine shape', () => {
        expect(whoJson.status).toEqual(2);
        const parsed = JSON.parse(whoJson.stderr) as {
          class: string;
          message: string;
        };
        expect(parsed.class).toEqual('ConstraintError');
        expect(parsed.message.toLowerCase()).toContain(
          'not run inside an enrolled clone',
        );
      });

      then('the not-a-clone json error shape is locked (machine contract)', () => {
        expect(asSnapshotSafe(whoJson.stderr)).toMatchSnapshot();
      });
    });

    when('[t6] `say --what @stdin` (the stdin dispatch path)', () => {
      const nonce = `stdin${getUuid()}`;
      const roundtrip = useThen(
        'a piped message round-trips like --what <m>',
        async () => {
          const said = await invokeRhachetCliBinaryAsync({
            args: ['clone', 'say', '@:driver', '--what', '@stdin'],
            cwd: scene.dir,
            env: scene.env,
            stdin: `poke ${nonce}`,
            logOnError: false,
          });
          if (said.status !== 0)
            throw new ConstraintError('say (--what @stdin) failed', {
              stderr: said.stderr,
              hint: 'the stdin path must feed the dispatch the same as --what <m>',
            });
          return {
            said,
            got: await pollForAck({
              address: '@:driver',
              nonce,
              dir: scene.dir,
              env: scene.env,
            }),
          };
        },
      );

      then('the say reports delivered (exit 0)', () => {
        expect(roundtrip.said.status).toEqual(0);
        expect(roundtrip.said.stdout).toContain('said to');
      });

      then('the get carries the ack — the piped message reached the brain', () => {
        expect(roundtrip.got).toContain(`ack:${nonce}`);
      });
    });

    when('[t7] the talk verbs under --output json + --tail (machine reads)', () => {
      const nonce = `json${getUuid()}`;
      const shapes = useThen(
        'say --output json, then get --output json --tail 1',
        async () => {
          const said = invokeRhachetCliBinary({
            args: [
              'clone',
              'say',
              '@:driver',
              '--what',
              `poke ${nonce}`,
              '--output',
              'json',
            ],
            cwd: scene.dir,
            env: scene.env,
            logOnError: false,
          });
          if (said.status !== 0)
            throw new ConstraintError('say --output json failed', {
              stderr: said.stderr,
              hint: 'the json branch must emit a machine shape, never tree glyphs',
            });
          // let the ack land, then read it back as bounded json
          await pollForAck({
            address: '@:driver',
            nonce,
            dir: scene.dir,
            env: scene.env,
          });
          const got = invokeRhachetCliBinary({
            args: [
              'clone',
              'get',
              '@:driver',
              '--output',
              'json',
              '--tail',
              '1',
            ],
            cwd: scene.dir,
            env: scene.env,
            logOnError: false,
          });
          return { said, got };
        },
      );

      then('say --output json is machine-parseable (no tree glyphs)', () => {
        expect(shapes.said.status).toEqual(0);
        expect(shapes.said.stdout).not.toContain('├─');
        const parsed = JSON.parse(shapes.said.stdout) as { delivered: boolean };
        expect(parsed.delivered).toEqual(true);
      });

      then('the say json machine shape is locked (catches a drifted shape)', () => {
        // pair the delivered-field assert with a snapshot per rule.require.snapshots —
        // the shape is fixed (`{delivered:true}`), so a widened/renamed json field
        // surfaces as a snapshot diff in review
        expect(asSnapshotSafe(shapes.said.stdout)).toMatchSnapshot();
      });

      then('get --output json --tail 1 is a bounded machine shape', () => {
        expect(shapes.got.status).toEqual(0);
        expect(shapes.got.stdout).not.toContain('├─');
        const parsed = JSON.parse(shapes.got.stdout) as {
          messages: { direction: 'in' | 'out'; text: string }[];
        };
        expect(Array.isArray(parsed.messages)).toBe(true);
        // --tail 1 bounds the read to a single logical message, never the whole log
        expect(parsed.messages.length).toBeLessThanOrEqual(1);
        // each message carries the directioned shape a machine reads (direction is a FIELD)
        for (const message of parsed.messages)
          expect(
            message.direction === 'in' || message.direction === 'out',
          ).toBe(true);
      });

      then('the get json machine shape is locked (catches a drifted shape)', () => {
        // pair the field asserts with a snapshot per rule.require.snapshots — the
        // in-test nonce is masked to a stable token, so the json key-set + the bounded
        // `messages` shape lock against drift while the reply text stays run-stable
        //
        // 🚨 the nonce is masked BEFORE `asSnapshotSafe`, never after. the nonce is
        //   `json${getUuid()}`, and `asSnapshotSafe` rewrites a uuid to `__SERIAL__` —
        //   so a post-mask sees `json__SERIAL__`, which the raw nonce can no longer
        //   match, and the run-specific text leaks into the snapshot instead
        //
        // 🔴 `total` is masked too, and that is a RE-GRAIN rather than a loosen. this
        //   row's stated subject is the json SHAPE — its key-set and its bounded
        //   `messages` array. `total` is the WHOLE conversation's turn count over a
        //   fixture every peer `when` shares, so each peer row that dispatches a say
        //   moves it, and this row reddens for a reason its own claim never made.
        //   measured twice on 2026-09-20: 10 → 12 when case15 was drafted here, and
        //   10 → 16 when [t3b] began to dispatch instead of refuse
        //
        //   ⚠️ the value is asserted NOWHERE, and that is correct rather than a gap: a
        //   count derived over a shared fixture is owned by no single row, so any row
        //   that locks it is locking its neighbours' behavior. the prior remedy was a
        //   WORKAROUND — case15 plants its own clone to dodge this (see its docblock) —
        //   which leaves the trap live for the next author. this removes the trap
        //   (rule.forbid.test-intent-violations, rule.require.clamp-edge-cases)
        const stable = asSnapshotSafe(
          shapes.got.stdout.split(nonce).join('__NONCE__'),
        ).replace(/"total": \d+/, '"total": "__TOTAL__"');
        expect(stable).toMatchSnapshot();
      });
    });

    when('[t8] `get --tail <bad>` (the tail-bound guard)', () => {
      const bad = useThen('a malformed --tail fails loud', () =>
        invokeRhachetCliBinary({
          args: ['clone', 'get', '@:driver', '--tail', 'notanumber'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        }),
      );

      then('it exits non-zero (a caller fault) and names the valid forms', () => {
        expect(bad.status).not.toEqual(0);
        expect(bad.stderr.toLowerCase()).toContain('--tail');
        expect(bad.stderr).toMatch(/all|integer/i);
      });

      then('the bad-tail error format is locked (visual spot-check)', () => {
        // --tail notanumber is a fixed literal, so no token needs a mask; this locks
        // the exact error a caller reads against silent drift — the SAME snapshot
        // discipline every other blocked-state case (t4 unknown address, dead clone)
        // already pairs with its functional assertion
        expect(asSnapshotSafe(bad.stderr)).toMatchSnapshot();
      });
    });

    when('[t8b] `get --tail <bad> --output json` (the machine twin)', () => {
      // a machine that bounds its read with --tail must read a malformed value as a
      // structured error field, not scrape the human tree — the json twin of t8
      const badJson = useThen('a malformed --tail fails loud with a shape', () =>
        invokeRhachetCliBinary({
          args: ['clone', 'get', '@:driver', '--tail', 'notanumber', '--output', 'json'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        }),
      );

      then('it exits non-zero (a caller fault) and the error is parseable', () => {
        expect(badJson.status).toEqual(2);
        const parsed = JSON.parse(badJson.stderr) as {
          class: string;
          message: string;
        };
        expect(parsed.class).toEqual('ConstraintError');
        expect(parsed.message.toLowerCase()).toContain('--tail');
      });

      then('the bad-tail json error shape is locked (machine contract)', () => {
        expect(asSnapshotSafe(badJson.stderr)).toMatchSnapshot();
      });
    });

    when('[t8c] `get --format <bad>` (the render-mode guard)', () => {
      // the `--format` validator (asFormat, the 2026-08-13 better-get amendment) is the
      // twin of the --tail guard — a caller who mistypes the render mode must fail loud
      // with the valid forms named, never a silent fallback. mirrors t8's tree coverage
      const bad = useThen('a malformed --format fails loud', () =>
        invokeRhachetCliBinary({
          args: ['clone', 'get', '@:driver', '--format', 'bogus'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        }),
      );

      then('it exits non-zero (a caller fault) and names the valid forms', () => {
        expect(bad.status).not.toEqual(0);
        expect(bad.stderr.toLowerCase()).toContain('--format');
        expect(bad.stderr).toMatch(/blocks|raw/i);
      });

      then('the bad-format error format is locked (visual spot-check)', () => {
        // --format bogus is a fixed literal, so no token needs a mask; locks the exact
        // error a caller reads against drift, the same discipline as t8's bad --tail
        expect(asSnapshotSafe(bad.stderr)).toMatchSnapshot();
      });
    });

    when('[t8d] `get --format <bad> --output json` (the machine twin)', () => {
      // the json twin of t8c — a machine that selects a render mode must read a
      // malformed value as a structured error field, never scrape the human tree
      const badJson = useThen('a malformed --format fails loud with a shape', () =>
        invokeRhachetCliBinary({
          args: ['clone', 'get', '@:driver', '--format', 'bogus', '--output', 'json'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        }),
      );

      then('it exits non-zero (a caller fault) and the error is parseable', () => {
        expect(badJson.status).toEqual(2);
        const parsed = JSON.parse(badJson.stderr) as {
          class: string;
          message: string;
        };
        expect(parsed.class).toEqual('ConstraintError');
        expect(parsed.message.toLowerCase()).toContain('--format');
      });

      then('the bad-format json error shape is locked (machine contract)', () => {
        expect(asSnapshotSafe(badJson.stderr)).toMatchSnapshot();
      });
    });

    when('[t9] `get --tail all` (the unbounded sentinel)', () => {
      // by now this clone has accrued several acks (t1 slug, t2 serial, t6 stdin,
      // t7 json), so `all` must return the WHOLE history — never the default 20 cap,
      // and provably MORE than a bounded `--tail 1`. this exercises the `'all'` arm
      // of asTailBound, which was only ever named inside an error hint until now
      const reads = useThen(
        'get --tail all reads every reply, bounded 1 reads one',
        () => {
          const all = invokeRhachetCliBinary({
            args: [
              'clone',
              'get',
              '@:driver',
              '--output',
              'json',
              '--tail',
              'all',
            ],
            cwd: scene.dir,
            env: scene.env,
            logOnError: false,
          });
          const one = invokeRhachetCliBinary({
            args: [
              'clone',
              'get',
              '@:driver',
              '--output',
              'json',
              '--tail',
              '1',
            ],
            cwd: scene.dir,
            env: scene.env,
            logOnError: false,
          });
          return { all, one };
        },
      );

      then('`--tail all` exits 0 and returns at least one reply', () => {
        expect(reads.all.status).toEqual(0);
        const parsed = JSON.parse(reads.all.stdout) as {
          messages: { direction: 'in' | 'out'; text: string }[];
        };
        expect(parsed.messages.some((m) => m.text.includes('ack:'))).toBe(true);
      });

      then('`--tail all` reads UNBOUNDED — no fewer messages than `--tail 1`', () => {
        const parsedAll = JSON.parse(reads.all.stdout) as {
          messages: { direction: 'in' | 'out'; text: string }[];
        };
        const parsedOne = JSON.parse(reads.one.stdout) as {
          messages: { direction: 'in' | 'out'; text: string }[];
        };
        // the sentinel is the whole history; a bound of 1 is a strict subset — so
        // `all` must carry at least as many messages as `1` (the accrued acks make
        // it strictly more, but >= is the robust, order-independent invariant)
        expect(parsedAll.messages.length).toBeGreaterThanOrEqual(
          parsedOne.messages.length,
        );
      });
    });

    when('[t10] the talk verbs fail as machine JSON for an unknown address', () => {
      // the machine counterpart of t4: a cron/comms consumer reads `--output json`,
      // so the FAILURE it branches on must be a parseable structured error on stderr
      // (class + message + hint), never human tree prose — locked by a snapshot so the
      // error a machine consumer parses cannot drift silently (rule.forbid.friction-hazards)
      const failures = useThen('say + get emit a structured JSON error', () => {
        const said = invokeRhachetCliBinary({
          args: [
            'clone',
            'say',
            '@:ghostclone',
            '--what',
            'anyone home?',
            '--output',
            'json',
          ],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        });
        const got = invokeRhachetCliBinary({
          args: ['clone', 'get', '@:ghostclone', '--output', 'json'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        });
        return { said, got };
      });

      then('say --output json emits a parseable ConstraintError (no tree glyphs)', () => {
        expect(failures.said.status).not.toEqual(0);
        expect(failures.said.stderr).not.toContain('✋');
        const parsed = JSON.parse(failures.said.stderr) as {
          class: string;
          message: string;
          hint: string;
        };
        expect(parsed.class).toEqual('ConstraintError');
        expect(parsed.message.toLowerCase()).toContain('no clone answers');
      });

      then('get --output json emits a parseable ConstraintError too', () => {
        expect(failures.got.status).not.toEqual(0);
        expect(failures.got.stderr).not.toContain('✋');
        const parsed = JSON.parse(failures.got.stderr) as { class: string };
        expect(parsed.class).toEqual('ConstraintError');
      });

      then('the get JSON-error shape is locked (visual spot-check)', () => {
        // the machine counterpart of the say snapshot below — @:ghostclone is a
        // fixed literal, so no token needs a mask; locks the exact structured error
        // a get consumer parses, so BOTH talk-verb json failures are clamped
        expect(asSnapshotSafe(failures.got.stderr)).toMatchSnapshot();
      });

      then('the say JSON-error shape is locked (visual spot-check)', () => {
        // the address is a fixed literal (@:ghostclone), so no token needs a mask;
        // this locks the exact machine error a consumer parses, paired with the tree
        // snapshot in t4 so BOTH output modes are clamped against silent drift
        expect(asSnapshotSafe(failures.said.stderr)).toMatchSnapshot();
      });
    });

    when('[t10b] a process GETs an UNKNOWN address (the human tree)', () => {
      // the human counterpart of t10's get-json failure, and the get twin of t4's
      // say-tree failure: a caller who does NOT pass --output json reads the
      // `✋ no clone answers …` fix on stderr. the tree is the primary interactive
      // variant, so its absence is a blind spot — locked here per
      // rule.require.contract-snapshot-exhaustiveness (BOTH talk verbs, BOTH modes)
      const got = useThen('the get fails loud (never a silent empty)', () =>
        invokeRhachetCliBinary({
          args: ['clone', 'get', '@:ghostclone'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        }),
      );

      then('it exits non-zero and names the unknown address + the fix', () => {
        expect(got.status).not.toEqual(0);
        expect(got.stderr).toContain("no clone answers to '@:ghostclone'");
        expect(got.stderr).toContain('rhx clone list');
      });

      then('the unknown-address get tree format is locked (visual spot-check)', () => {
        // @:ghostclone is a fixed literal, so no token needs a mask; this locks the
        // exact human error a get caller reads, paired with the t10 json twin so BOTH
        // output modes of the unknown-address get are clamped against silent drift
        expect(asSnapshotSafe(got.stderr)).toMatchSnapshot();
      });
    });

    when('[t11] `get` human-tree read (the primary observe variant)', () => {
      // the human counterpart of the json get (t7) — a plain `get --tail 1` renders the
      // clone's newest reply as a readable tree (uc.7). --tail 1 bounds it to a single
      // logical reply so the snapshot is one deterministic-shape line; get is a plain
      // transcript read (no socket needed), so a cheap subprocess invocation suffices
      const got = useThen('a bare get returns the newest reply as a tree', () =>
        invokeRhachetCliBinary({
          args: ['clone', 'get', '@:driver', '--tail', '1'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        }),
      );

      then('the get exits 0 and carries an ack line (human-readable)', () => {
        expect(got.status).toEqual(0);
        expect(got.stdout).toContain('ack:');
      });

      then('the get tree (human) success format is locked (visual spot-check)', () => {
        // the ack payload is a run-specific nonce — mask every `ack:<nonce>` to a stable
        // token so the tree LAYOUT locks while the reply text stays run-stable, per
        // rule.require.contract-snapshot-exhaustiveness (the primary observe variant)
        expect(
          asSnapshotSafe(got.stdout).replace(/ack:\S+/g, 'ack:__NONCE__'),
        ).toMatchSnapshot();
      });
    });

    when('[t12] `get` renders a directioned in/out conversation (better-get)', () => {
      // the mandated better-get clamp (uc.7 / the directioned-render dispatch task):
      // a say + its reply render as a `🎙️` (in) block AND a `🎧` (out) block, so a
      // reader tells inbound from outbound. `--format raw` keeps the pipe-clean
      // reply-only stream a comms relay forwards
      const nonce = `dir${getUuid()}`;
      const convo = useThen(
        'say poke <nonce>, then get --tail 4 as blocks and as raw',
        async () => {
          const said = await invokeRhachetCliBinaryAsync({
            args: ['clone', 'say', '@:driver', '--what', `poke ${nonce}`],
            cwd: scene.dir,
            env: scene.env,
            logOnError: false,
          });
          if (said.status !== 0)
            throw new ConstraintError('say failed', { stderr: said.stderr });
          await pollForAck({
            address: '@:driver',
            nonce,
            dir: scene.dir,
            env: scene.env,
          });
          const blocks = invokeRhachetCliBinary({
            args: ['clone', 'get', '@:driver', '--tail', '4'],
            cwd: scene.dir,
            env: scene.env,
            logOnError: false,
          });
          const raw = invokeRhachetCliBinary({
            args: ['clone', 'get', '@:driver', '--tail', '4', '--format', 'raw'],
            cwd: scene.dir,
            env: scene.env,
            logOnError: false,
          });
          return { blocks, raw };
        },
      );

      then('the blocks tree shows BOTH a `🎙️` (in) and a `🎧` (out) turn', () => {
        expect(convo.blocks.status).toEqual(0);
        expect(convo.blocks.stdout).toContain('🎙️');
        expect(convo.blocks.stdout).toContain(`poke ${nonce}`);
        expect(convo.blocks.stdout).toContain('🎧');
        expect(convo.blocks.stdout).toContain(`ack:${nonce}`);
      });

      then('`--format raw` is the pipe-clean reply-only relay stream', () => {
        expect(convo.raw.status).toEqual(0);
        // no direction glyphs, no inbound say — only the verbatim outbound reply
        expect(convo.raw.stdout).not.toContain('🎙️');
        expect(convo.raw.stdout).not.toContain('🎧');
        expect(convo.raw.stdout).not.toContain(`poke ${nonce}`);
        expect(convo.raw.stdout).toContain(`ack:${nonce}`);
      });

      then('the directioned tree layout is locked (mask each nonce)', () => {
        // mask BOTH the inbound poke nonce and every outbound ack nonce so the
        // `🎙️`/`🎧` LAYOUT locks while the run-specific text stays stable
        expect(
          asSnapshotSafe(convo.blocks.stdout)
            .replace(/ack:\S+/g, 'ack:__NONCE__')
            .replace(/poke \S+/g, 'poke __NONCE__'),
        ).toMatchSnapshot();
      });

      then('the `--format raw` relay stream is locked (mask each nonce)', () => {
        // the blueprint names `raw` the comms-relay contract, so its verbatim shape
        // deserves the SAME exactness the blocks render gets — a snapshot, not a bare
        // text-contains check. mask the ack nonce so the pipe-clean layout locks stably
        expect(
          asSnapshotSafe(convo.raw.stdout).replace(/ack:\S+/g, 'ack:__NONCE__'),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case4] a linked repo with NO clones enrolled', () => {
    // the empty-state + invalid-actor negatives (uc.5) — no pty, no spawn: a plain
    // linked repo with an actors root but zero clones. cheap subprocess invocations
    // lock the two residual `clone list` variants a caller encounters
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'clone-none' });
      setupEnrollFixture({ dir });
      return { dir, env: { PATH: process.env.PATH ?? '' } };
    });

    when('[t0] `clone list` on a repo with no clones', () => {
      const listed = useThen('the empty-state list renders', () =>
        invokeRhachetCliBinary({
          args: ['clone', 'list'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        }),
      );

      then('it exits 0 and shows an empty state (no clone rows)', () => {
        expect(listed.status).toEqual(0);
        // no clone rows — never a spurious LIVE/DEAD line for a repo with none
        expect(listed.stdout).not.toContain('state=LIVE');
        expect(listed.stdout).not.toContain('state=DEAD');
      });

      then('the empty clone-list format is locked (visual spot-check)', () => {
        // a repo with no clones is a fixed, token-free layout — locks the empty state
        // a caller sees, per rule.require.contract-snapshot-exhaustiveness
        expect(asSnapshotSafe(listed.stdout)).toMatchSnapshot();
      });

      then('the empty clone-list json machine shape is locked (catches a drifted shape)', () => {
        // the MACHINE counterpart of the empty tree — a consumer reads an empty
        // `actors` array, never a box-glyph, so the empty state has BOTH variants
        // snapped, a mirror of the actor-list empty json (uc.11)
        const listedJson = invokeRhachetCliBinary({
          args: ['clone', 'list', '--output', 'json'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        });
        expect(listedJson.status).toEqual(0);
        expect(listedJson.stdout).not.toContain('├─');
        const parsed = JSON.parse(listedJson.stdout) as { actors: unknown[] };
        expect(parsed.actors).toEqual([]);
        expect(asSnapshotSafe(listedJson.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] `clone list @<unknown-actor>` (an invalid actor scope)', () => {
      const listed = useThen('an unknown actor scope fails loud', () =>
        invokeRhachetCliBinary({
          args: ['clone', 'list', '@deadbeef'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        }),
      );

      then('it exits non-zero and names the fix (no actor matches)', () => {
        expect(listed.status).not.toEqual(0);
        expect(listed.stderr.toLowerCase()).toMatch(/no.*actor|no match|deadbeef/);
      });

      then('the unknown-actor error format is locked (visual spot-check)', () => {
        // @deadbeef is a fixed literal prefix that matches no enrolled actor — the
        // error is token-free, so it locks the exact text a caller reads against drift
        expect(asSnapshotSafe(listed.stderr)).toMatchSnapshot();
      });

      then('the unknown-actor json error shape is locked (machine contract)', () => {
        // the MACHINE twin — a cron that scopes `clone list @<actor>` on an unknown
        // prefix must read the failure as a structured field, not scrape the tree
        const listedJson = invokeRhachetCliBinary({
          args: ['clone', 'list', '@deadbeef', '--output', 'json'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        });
        expect(listedJson.status).toEqual(2);
        const parsed = JSON.parse(listedJson.stderr) as {
          class: string;
          message: string;
        };
        expect(parsed.class).toEqual('ConstraintError');
        expect(parsed.message.toLowerCase()).toMatch(/no.*actor|deadbeef/);
        expect(asSnapshotSafe(listedJson.stderr)).toMatchSnapshot();
      });
    });

    when('[t2] `clone whoami` with a STALE clone-serial env (names no on-disk clone)', () => {
      // the infra-fault branch of whoami: a process carries a clone serial in its env
      // (RHACHET_CLONE_SERIAL) — so it IS a clone — but that serial resolves to no clone
      // on disk (e.g. its record was reaped by `clone prune` while the process lived on).
      // this is a SERVER fault (a MalfunctionError, exit 1), distinct from t5b's caller
      // fault (no serial at all → a ConstraintError, exit 2) — so a self-managed clone is
      // never handed a fabricated identity for a serial that no longer exists
      const staleSerial = '00000000-0000-4000-8000-000000000000';
      const bad = useThen('whoami fails loud for a serial with no on-disk clone', () =>
        invokeRhachetCliBinary({
          args: ['clone', 'whoami'],
          cwd: scene.dir,
          env: { ...scene.env, RHACHET_CLONE_SERIAL: staleSerial },
          logOnError: false,
        }),
      );

      then('it exits 1 (a server fault) and names the stale-serial cause', () => {
        expect(bad.status).toEqual(1);
        expect(bad.stderr.toLowerCase()).toContain('no on-disk clone');
      });

      then('the stale-serial whoami error format is locked (visual spot-check)', () => {
        // the message headline is token-free (the serial lives in metadata, masked by
        // asSnapshotSafe), so this locks the exact MalfunctionError text against drift
        expect(asSnapshotSafe(bad.stderr)).toMatchSnapshot();
      });

      then('the stale-serial whoami json error shape is locked (machine contract)', () => {
        // the MACHINE twin — a self-managed clone that reads whoami --output json must
        // read the infra fault as a parseable MalfunctionError, never scrape tree prose
        const badJson = invokeRhachetCliBinary({
          args: ['clone', 'whoami', '--output', 'json'],
          cwd: scene.dir,
          env: { ...scene.env, RHACHET_CLONE_SERIAL: staleSerial },
          logOnError: false,
        });
        expect(badJson.status).toEqual(1);
        const parsed = JSON.parse(badJson.stderr) as {
          class: string;
          message: string;
        };
        expect(parsed.class).toEqual('MalfunctionError');
        expect(parsed.message.toLowerCase()).toContain('no on-disk clone');
        expect(asSnapshotSafe(badJson.stderr)).toMatchSnapshot();
      });
    });

    when('[t3] `say --await <bad>` (the await-target guard)', () => {
      // the say-verb twin of t8c's --format guard: `--await` names the caller's target state
      // (enqueue | release), so a mistyped value must fail loud with the valid set named
      // (asCloneSayAwaitTarget), never a silent fallback to the default. it lives HERE, in the
      // no-clone scene, on purpose: the cast runs BEFORE any clone lookup or dispatch
      // (invokeCloneSay), so `@:driver` is never resolved and no message is ever written — which
      // is the STRONGEST demonstration of "cast before dispatch" (there is no clone to dispatch
      // to at all) AND lets the case snapshot locally, off the credentialed-enroll pty wall
      const bad = useThen('a malformed --await fails loud', () =>
        invokeRhachetCliBinary({
          args: ['clone', 'say', '@:driver', '--what', 'hello', '--await', 'bogus'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        }),
      );

      then('it exits 2 (a caller fault) and names the valid forms', () => {
        expect(bad.status).toEqual(2);
        expect(bad.stderr.toLowerCase()).toContain('--await');
        expect(bad.stderr).toMatch(/enqueue|release/i);
      });

      then('the bad-await error format is locked (visual spot-check)', () => {
        // --await bogus is a fixed literal, so no token needs a mask; locks the exact error a
        // caller reads against drift, the same discipline as t8c's bad --format
        expect(asSnapshotSafe(bad.stderr)).toMatchSnapshot();
      });
    });

    when('[t4] `say --await <bad> --output json` (the machine twin)', () => {
      // the json twin of t3 — a machine that selects a target state must read a malformed
      // value as a structured error field, never scrape the human tree
      const badJson = useThen('a malformed --await fails loud with a shape', () =>
        invokeRhachetCliBinary({
          args: [
            'clone',
            'say',
            '@:driver',
            '--what',
            'hello',
            '--await',
            'bogus',
            '--output',
            'json',
          ],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        }),
      );

      then('it exits 2 (a caller fault) and the error is parseable', () => {
        expect(badJson.status).toEqual(2);
        const parsed = JSON.parse(badJson.stderr) as {
          class: string;
          message: string;
        };
        expect(parsed.class).toEqual('ConstraintError');
        expect(parsed.message.toLowerCase()).toContain('--await');
      });

      then('the bad-await json error shape is locked (machine contract)', () => {
        expect(asSnapshotSafe(badJson.stderr)).toMatchSnapshot();
      });
    });
  });

  // the actor-scoped-EMPTY variant — a VALID actor exists (its brain config + roles
  // log are on disk) but ZERO clones live under it. this is DISTINCT from case4 t0 (no
  // actors at all → zero groups) and case4 t1 (an UNKNOWN actor → fail loud): here the
  // actor IS resolved, so `clone list @<hash>` renders ONE actor header with NO clone
  // rows. a caller hits this after a prune reaps an actor's last clone (the actor dir
  // survives the reap), so the variant owes a locked snapshot per
  // rule.require.contract-snapshot-exhaustiveness
  given('[case6] a linked repo with an actor enrolled but NO clones under it', () => {
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'clone-actor-empty' });
      setupEnrollFixture({ dir });
      // plant a valid actor with NO clone via the REAL op enroll uses — findsert the
      // actor dir (brain config + roles log), never a clone. the hash is deterministic
      // (genEnrollmentHash of {brain, roles}), so the scoped render locks stably
      const actor = findsertActorOndisk({
        repoPath: dir,
        brain: 'claude',
        roles: ['mechanic'],
        delta: null,
        reason: null,
        logEnrollment: true,
      });
      return {
        dir,
        hash: actor.hash,
        env: { PATH: process.env.PATH ?? '' },
      };
    });

    when('[t0] `clone list @<hash>` for an actor with no clones', () => {
      const listed = useThen('the actor-scoped empty list renders', () =>
        invokeRhachetCliBinary({
          args: ['clone', 'list', `@${scene.hash}`],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        }),
      );

      then('it exits 0 and shows the actor header with NO clone rows', () => {
        expect(listed.status).toEqual(0);
        // the actor IS resolved (unlike case4 t1's fail-loud), so no error — but it has
        // no clones, so never a LIVE/DEAD/DEAF row under it
        expect(listed.stdout).not.toContain('state=LIVE');
        expect(listed.stdout).not.toContain('state=DEAD');
        expect(listed.stdout).not.toContain('state=DEAF');
      });

      then('the scoped (no clones) leaf names its fix, like every empty state', () => {
        // consistency with every other empty state (rule.require.errors-name-the-fix):
        // the scoped leaf names the SINGLE enroll move (the caller already named this
        // identity, so the unscoped `…or see identities` clause is redundant here)
        expect(listed.stdout).toContain('(no clones)');
        expect(listed.stdout).toContain('enroll one with `rhx enroll <brain>`');
        expect(listed.stdout).not.toContain('rhx actor list');
      });

      then('the actor-scoped empty format is locked (visual spot-check)', () => {
        // the actor hash is deterministic, so the one-header-no-rows layout is a fixed,
        // token-free shape — locks the exact variant a caller reads after a prune reaps
        // an actor's last clone, per rule.require.contract-snapshot-exhaustiveness
        expect(asSnapshotSafe(listed.stdout)).toMatchSnapshot();
      });

      then('the actor-scoped empty json machine shape is locked', () => {
        // the MACHINE twin — a cron that scopes `clone list @<actor>` on a reaped actor
        // reads ONE actor with an empty `clones` array, never a box-glyph
        const listedJson = invokeRhachetCliBinary({
          args: ['clone', 'list', `@${scene.hash}`, '--output', 'json'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        });
        expect(listedJson.status).toEqual(0);
        expect(listedJson.stdout).not.toContain('├─');
        const parsed = JSON.parse(listedJson.stdout) as {
          actors: { clones: unknown[] }[];
        };
        expect(parsed.actors).toHaveLength(1);
        expect(parsed.actors[0]!.clones).toEqual([]);
        expect(asSnapshotSafe(listedJson.stdout)).toMatchSnapshot();
      });
    });
  });

  // the UNSCOPED clone-less-actor-HIDE — the dogfood fix (a human hit a bare `clone list`
  // cluttered with actors whose clones were all reaped). an unscoped `clone list` shows
  // ONLY actors that own a clone; a clone-less actor is hidden here (it stays discoverable
  // via `rhx actor list`). born from a real prod bug, so it owes a blackbox clamp per
  // rule.require.acceptance.blackbox + rule.require.clamp-edge-cases — the unit
  // (asCloneListView.test case5) proves the render shape, this proves it end-to-end on the
  // real built cli, where a future refactor would otherwise silently reintroduce the clutter
  given(
    '[case7] UNSCOPED `clone list` with a MIX — one actor owns a clone, one is clone-less',
    () => {
      const scene = useBeforeAll(async () => {
        const dir = genTempDir({ slug: 'clone-list-mixed' });
        setupEnrollFixture({ dir });
        // actor A (roles=[mechanic]) OWNS a socketless clone → renders (DEAF: process alive,
        // no socket). planted via the SAME real ops enroll uses, so the tree stays faithful
        const owner = genSampleCloneOndisk({
          repoPath: dir,
          roles: ['mechanic'],
          serial: 'aaaa1111-2222-3333-4444-555566667777',
          slug: null,
          socketEligible: false,
        });
        // actor B (roles=[architect]) is CLONE-LESS → findsert the actor dir, never a clone.
        // a DIFFERENT roleset → a DIFFERENT deterministic hash, so the two never collide
        const empty = findsertActorOndisk({
          repoPath: dir,
          brain: 'claude',
          roles: ['architect'],
          delta: null,
          reason: null,
          logEnrollment: true,
        });
        return {
          dir,
          ownerHash: owner.actorHash,
          emptyHash: empty.hash,
          env: { PATH: process.env.PATH ?? '' },
        };
      });

      when('[t0] a bare `clone list` is run', () => {
        const listed = useThen('the unscoped mixed list renders', () =>
          invokeRhachetCliBinary({
            args: ['clone', 'list'],
            cwd: scene.dir,
            env: scene.env,
            logOnError: false,
          }),
        );

        then('it exits 0 and shows ONLY the actor that owns a clone', () => {
          expect(listed.status).toEqual(0);
          // the owner's abbreviated (7-char) hash header appears; the clone-less one`s does not
          expect(listed.stdout).toContain(scene.ownerHash.slice(0, 7));
          expect(listed.stdout).not.toContain(scene.emptyHash.slice(0, 7));
        });

        then(
          'the sole shown actor renders as the LAST `└─` branch, never a stray `├─`',
          () => {
            // the filter re-seats branch prefixes: the one survivor is last, so it must
            // render `└─`, never a `├─` that assumed a peer below it (the case5 unit
            // invariant, now proven at the cli grain against the real built binary)
            expect(listed.stdout).toContain(
              `└─ actor ${scene.ownerHash.slice(0, 7)}`,
            );
            expect(listed.stdout).not.toContain('├─ actor');
          },
        );

        then('the unscoped-mixed tree format is locked (visual regression)', () => {
          // the actor hashes are deterministic (genEnrollmentHash of {brain, roles}); the
          // clone serial + since-time are masked by asSnapshotSafe — so the WHOLE layout
          // (which actor shows, which is hidden, the `└─` seat) is a stable, token-free lock
          expect(asSnapshotSafe(listed.stdout)).toMatchSnapshot();
        });

        then('json hides the clone-less actor too (tree ≡ json)', () => {
          // the MACHINE twin — a cron reads ONE actor (the owner), never the clone-less one
          const listedJson = invokeRhachetCliBinary({
            args: ['clone', 'list', '--output', 'json'],
            cwd: scene.dir,
            env: scene.env,
            logOnError: false,
          });
          expect(listedJson.status).toEqual(0);
          const parsed = JSON.parse(listedJson.stdout) as {
            actors: { hash: string }[];
          };
          expect(parsed.actors).toHaveLength(1);
          expect(parsed.actors[0]!.hash).toEqual(scene.ownerHash);
          expect(asSnapshotSafe(listedJson.stdout)).toMatchSnapshot();
        });
      });
    },
  );

  // the all-clone-less UNSCOPED empty-state — enrolled actors exist, but the unscoped
  // filter hides EVERY one (none owns a clone), so the view degrades to a get-started
  // breadcrumb that names BOTH next moves: enroll a fresh clone, OR see the hidden
  // identities via `rhx actor list`. DISTINCT from case4`s zero-actor "(no actors enrolled
  // yet)" state — owed its own locked snapshot per rule.require.contract-snapshot-exhaustiveness
  given(
    '[case8] UNSCOPED `clone list` where EVERY enrolled actor is clone-less',
    () => {
      const scene = useBeforeAll(async () => {
        const dir = genTempDir({ slug: 'clone-list-all-empty' });
        setupEnrollFixture({ dir });
        // two clone-less actors, distinct rolesets → distinct hashes, zero clones between them
        findsertActorOndisk({
          repoPath: dir,
          brain: 'claude',
          roles: ['mechanic'],
          delta: null,
          reason: null,
          logEnrollment: true,
        });
        findsertActorOndisk({
          repoPath: dir,
          brain: 'claude',
          roles: ['architect'],
          delta: null,
          reason: null,
          logEnrollment: true,
        });
        return { dir, env: { PATH: process.env.PATH ?? '' } };
      });

      when('[t0] a bare `clone list` is run', () => {
        const listed = useThen('the all-empty unscoped list renders', () =>
          invokeRhachetCliBinary({
            args: ['clone', 'list'],
            cwd: scene.dir,
            env: scene.env,
            logOnError: false,
          }),
        );

        then(
          'it exits 0 and shows the `(no clones)` empty-state that names BOTH fixes',
          () => {
            expect(listed.status).toEqual(0);
            expect(listed.stdout).toContain('(no clones)');
            expect(listed.stdout).toContain('rhx enroll');
            expect(listed.stdout).toContain('rhx actor list');
            // the filter hid every actor, so never a stray clone-state row
            expect(listed.stdout).not.toContain('state=');
          },
        );

        then(
          'the all-clone-less empty-state format is locked (visual spot-check)',
          () => {
            expect(asSnapshotSafe(listed.stdout)).toMatchSnapshot();
          },
        );

        then('json hides all clone-less actors too (tree ≡ json)', () => {
          const listedJson = invokeRhachetCliBinary({
            args: ['clone', 'list', '--output', 'json'],
            cwd: scene.dir,
            env: scene.env,
            logOnError: false,
          });
          expect(listedJson.status).toEqual(0);
          const parsed = JSON.parse(listedJson.stdout) as { actors: unknown[] };
          expect(parsed.actors).toEqual([]);
          expect(asSnapshotSafe(listedJson.stdout)).toMatchSnapshot();
        });
      });
    },
  );

  // the UNLINKED-repo path for `clone list` — the exact negative variant `actor list`
  // already locks (its case4), owed here too per rule.require.contract-snapshot-
  // exhaustiveness: a repo with NO .agent/ directory (never linked) must read DISTINCTLY
  // from a linked-but-empty repo. it degrades gracefully (a read never crashes) AND its
  // empty state names the link fix, never the enroll one — the same distinct-label
  // discipline as `actor list` (rule.forbid.snapshot-visual-blemishes)
  given('[case5] a repo with NO .agent/ directory (never linked)', () => {
    const scene = useBeforeAll(async () => {
      // a bare temp dir — deliberately NO setupEnrollFixture, so no .agent/ exists
      const dir = genTempDir({ slug: 'clone-list-unlinked' });
      return { dir, env: { PATH: process.env.PATH ?? '' } };
    });

    when('[t0] `clone list` in an unlinked repo (no .agent/)', () => {
      const listed = useThen('exits 0 (a read degrades gracefully)', () =>
        invokeRhachetCliBinary({
          args: ['clone', 'list'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        }),
      );

      then('it does NOT crash — it shows the DISTINCT not-linked state + link fix', () => {
        // an absent .agent/ is not a fault for a read: it degrades to a labelled empty
        // state, never a stack trace. the label names the link fix (`rhx init --roles`),
        // NOT the enroll hint — an unlinked repo cannot enroll
        expect(listed.status).toEqual(0);
        expect(listed.stdout.toLowerCase()).toContain('repo not linked');
        expect(listed.stdout).toContain('rhx init --roles');
      });

      then('it does NOT show the linked-but-empty enroll state (a distinct label)', () => {
        // the unlinked repo must read DIFFERENTLY from a linked repo with no clones
        // (which says "no actors enrolled yet")
        expect(listed.stdout.toLowerCase()).not.toContain(
          'no actors enrolled yet',
        );
      });

      then('the unlinked-repo not-linked format is locked (visual spot-check)', () => {
        // the unlinked outcome is token-free; locks the exact experience a first-time
        // caller reads before any `rhachet roles link`
        expect(asSnapshotSafe(listed.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] `clone list --output json` in an unlinked repo (no .agent/)', () => {
      const listedJson = useThen('exits 0 (a read degrades gracefully)', () =>
        invokeRhachetCliBinary({
          args: ['clone', 'list', '--output', 'json'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        }),
      );

      then('the machine shape degrades to an empty actors array', () => {
        // the machine view does NOT distinguish unlinked from linked-but-empty — the
        // "(repo not linked)" label is a HUMAN-tree affordance only; both read
        // `{ "actors": [] }` to a machine. the parity of `actor list` (its case4 t1)
        expect(listedJson.status).toEqual(0);
        expect(listedJson.stdout).not.toContain('├─');
        const parsed = JSON.parse(listedJson.stdout) as { actors: unknown[] };
        expect(parsed.actors).toEqual([]);
      });

      then('the unlinked-repo clone-list json shape is locked (machine contract)', () => {
        expect(asSnapshotSafe(listedJson.stdout)).toMatchSnapshot();
      });
    });
  });

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
      const reused = useThen('the second enroll reuses (no new spawn)', () =>
        invokeRhachetCliBinary({
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
      const reused = useThen('the second enroll reuses (no new spawn)', () =>
        invokeRhachetCliBinary({
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

  // ───────────────────────────────────────────────────────────────────────────
  // the six-verdict CLI-contract clamp — drive the NON-`released` verdicts through
  // the real `rhx clone say` binary, so the retry-policy contract (verdict / reason /
  // probe / delivered on --output json, and the exit code) is proven at the grain a
  // caller reads, never only at the unit grain of computeCloneSayVerdict. each mode
  // shapes the stub screen so the server-side pre-check (withheld) or the observe
  // loop (enqueued) reaches its verdict deterministically (rule.require.acceptance.blackbox,
  // rule.require.test-coverage-by-grain, rule.require.contract-snapshot-exhaustiveness)
  // ───────────────────────────────────────────────────────────────────────────

  given('[case9] a clone whose input box is DIRTY (a human mid-type)', () => {
    // RHACHET_STUB_MODE=dirty → the stub opens on a box that holds a human's uncommitted
    // text, so the dequeue pre-check reads `input-region-dirty` and withholds an
    // unforced say (case=2: a say must never paste over a human's half-typed input)
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'clone-dirty' });
      const configDir = genTempDir({ slug: 'clone-dirty-cfg' });
      setupEnrollFixture({ dir });
      const stubPath = setupRichStubBrainPath({ dir });
      const env = {
        PATH: stubPath,
        CLAUDE_CONFIG_DIR: configDir,
        RHACHET_STUB_MODE: 'dirty',
      };
      const { bg } = await enrollCloneAndWaitReady({ dir, env, as: '@:dirtybox' });
      return { dir, env, bg };
    });
    afterAll(async () => scene.bg.kill());

    when('[t0] an UNFORCED say into the dirty box', () => {
      const said = useThen('the say is withheld (never a blind paste)', () =>
        invokeRhachetCliBinary({
          args: ['clone', 'say', '@:dirtybox', '--what', 'poke unforced-x9'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        }),
      );

      then('it exits 2 (a caller may amend it) and names the dirty box + the --force fix', () => {
        expect(said.status).toEqual(2);
        expect(said.stderr.toLowerCase()).toMatch(/uncommitted|dirty|mid-type/);
        expect(said.stderr.toLowerCase()).toMatch(/--force/);
      });

      const withheldJson = useThen(
        'the withheld json carries verdict + reason + delivered=false',
        () => {
          const json = invokeRhachetCliBinary({
            args: [
              'clone',
              'say',
              '@:dirtybox',
              '--what',
              'poke unforced-json',
              '--output',
              'json',
            ],
            cwd: scene.dir,
            env: scene.env,
            logOnError: false,
          });
          expect(json.status).toEqual(2);
          const parsed = JSON.parse(json.stderr) as {
            class: string;
            metadata: { verdict: string; reason: string; delivered: boolean };
          };
          // withheld = a caller-side refusal → ConstraintError (exit 2); the trio rides
          // the error metadata, which asCliErrorJson projects verbatim
          expect(parsed.class).toEqual('ConstraintError');
          expect(parsed.metadata.verdict).toEqual('withheld');
          expect(parsed.metadata.reason).toEqual('input-region-dirty');
          // the one verdict where NO write happened — so a re-send cannot duplicate
          expect(parsed.metadata.delivered).toEqual(false);
          return { stderr: json.stderr };
        },
      );

      then('the withheld/dirty stderr format is locked (visual spot-check)', () => {
        expect(asSnapshotSafe(said.stderr)).toMatchSnapshot();
      });

      then('the withheld/dirty JSON envelope is locked too — the MACHINE twin', () => {
        // the field asserts above pin four values and say naught about the envelope a
        // machine caller actually parses: the `class` / `message` / `hint` triple, the
        // `--force` remedy text, and which keys ride `metadata`. a dropped hint, a
        // reworded message, or a metadata key that vanishes would all ship green
        //
        // ⚠️ the tree twin alone is not coverage of this path. `--output json` is a
        //   DIFFERENT caller contract off the same refusal, and every peer negative in
        //   this PR (case12 buffered, enroll case1 depth-budget) snaps both twins
        expect(asSnapshotSafe(withheldJson.stderr)).toMatchSnapshot();
      });
    });

    when('[t1] a --force say into the SAME dirty box', () => {
      // an unforced say never reaches the stub (the server refuses at the pre-check), so
      // the ONLY message the stub receives here is this forced one — it replies as a
      // normal turn, so the forced dispatch lands `released`, which proves --force
      // overrode the dirty refusal AND the message then took (F12, F06).
      // .caveat = `released` here is NOT a clean success — it is the DESTRUCTIVE escape
      //   hatch, as designed: --force appended this text to the human's uncommitted input
      //   and submitted BOTH as one fused turn (F12). the release verdict cannot see the
      //   fuse (the transcript rose, so the brain took a turn); the fuse hazard lives in
      //   the --force help copy, asserted below, so no caller reads this path as safe
      const said = useThen(
        'the forced say overrides the dirty box and lands (the destructive fuse took)',
        () =>
          invokeRhachetCliBinary({
            args: [
              'clone',
              'say',
              '@:dirtybox',
              '--what',
              'poke forced-ok',
              '--force',
              '--output',
              'json',
            ],
            cwd: scene.dir,
            env: scene.env,
            logOnError: false,
          }),
      );

      then('it exits 0 and the json reports released + delivered=true', () => {
        expect(said.status).toEqual(0);
        const parsed = JSON.parse(said.stdout) as {
          verdict: string;
          delivered: boolean;
        };
        expect(parsed.verdict).toEqual('released');
        expect(parsed.delivered).toEqual(true);
      });

      then('the forced-release JSON envelope is locked — the SUCCESS machine twin', () => {
        // the two field asserts above pin `verdict` + `delivered` and say naught about the
        // rest of the envelope a machine caller parses: which keys ride the success payload
        // (`reason`, `probe`, `serial`, `slug`), and whether the additive contract V13
        // promises still holds. a dropped `probe` or a renamed `reason` would ship green
        //
        // ⚠️ this is the only CLI-grain snapshot of a FORCED success. every peer success
        //   snap in this suite is an unforced one, so a --force-specific payload regression
        //   had no snapshot to redden (r011-i007-b2)
        expect(asSnapshotSafe(said.stdout)).toMatchSnapshot();
      });

      then('the --force help names the fused-turn hazard, so the release is never read as safe (F12)', () => {
        const help = invokeRhachetCliBinary({
          args: ['clone', 'say', '--help'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        });
        // the caveat that parts this destructive fuse from a clean send: --force fuses the
        // forced text with the human's uncommitted input into one turn. the release verdict
        // cannot carry that, so the CLI surface must, and this locks that it does
        expect(help.stdout.toLowerCase()).toMatch(/destructive/);
        expect(help.stdout.toLowerCase()).toMatch(/fused|one turn|append/);
      });
    });

    when('[t2] a `clone get --what buffer` read of that SAME dirty box', () => {
      // 🔴 the surface the wisher asked for (2026-09-21): *"should this say what's in the input?
      //   … that way the person who attempted to write can see what was inflight"*. before this,
      //   a caller refused by `input-region-dirty` was told the box holds text and never WHAT —
      //   so their only way to find out was a `--force` say that clobbers the very text they
      //   wanted to read. this proves the read exists at the CLI grain, against a real daemon
      const read = useThen('the read succeeds (exit 0) against a LIVE clone', () => {
        const result = invokeRhachetCliBinary({
          args: ['clone', 'get', '@:dirtybox', '--what', 'buffer'],
          cwd: scene.dir,
          env: scene.env,
        });
        expect(result.status).toEqual(0);
        return result;
      });

      then('it shows the human text VERBATIM, so the refusal is legible', () => {
        // the stub's dirty box holds `HUMAN-DRAFT-half-typed-and-uncommitted`. a read that
        // reported only "1 row" would leave the caller exactly where the refusal did
        expect(read.stdout).toContain('HUMAN-DRAFT-half-typed-and-uncommitted');
        expect(read.stdout).toMatch(/holds 1 row/);
      });

      then('it names the growth read, so a caller can part a live human from stale output', () => {
        // 🟡 the read INFORMS, it does not decide: inert text is a human who paused OR foreign
        //   output the brain has yet to redraw, and no single read parts those two (the `party`
        //   refutation, cure 32). so the render states both causes rather than a verdict
        expect(read.stdout.toLowerCase()).toMatch(/twice a second apart/);
        expect(read.stdout.toLowerCase()).toMatch(/grew/);
      });

      then('the withheld say HINT points at this read, not at the wider --debug grid', () => {
        // the hint and the read must name each other, or a refused caller is handed a dead end
        // beside a live remedy. `--debug` returns the whole viewport and leaves them to locate
        // the band; `--what buffer` prints the band. a hint at the wider one is a worse answer
        const said = invokeRhachetCliBinary({
          args: ['clone', 'say', '@:dirtybox', '--what', 'poke hint-x9'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        });
        expect(said.status).toEqual(2);
        expect(said.stderr).toContain('--what buffer');
      });

      const queueRead = useThen('a `--what queue` read of the same clone', () =>
        invokeRhachetCliBinary({
          args: ['clone', 'get', '@:dirtybox', '--what', 'queue'],
          cwd: scene.dir,
          env: scene.env,
        }),
      );

      then('the queue reads EMPTY — a dirty box is not a held message', () => {
        // the two surfaces are independent states of the input triple: text in the box is
        // `buffered`, text in the queue is `enqueued`. a read that conflated them would have a
        // caller believe the brain already holds what a human has yet to submit
        expect(queueRead.status).toEqual(0);
        expect(queueRead.stdout).toMatch(/queue is empty/);
        expect(queueRead.stdout).not.toContain('HUMAN-DRAFT');
      });

      then('the buffer read format is locked (visual spot-check)', () => {
        expect(asSnapshotSafe(read.stdout)).toMatchSnapshot();
      });

      then('the `--output json` twin carries the content, for a MACHINE caller', () => {
        // the tree twin alone is not coverage: `--output json` is a different caller contract
        // off the same read, and a daemon that polls a refused box reads THIS one
        const json = invokeRhachetCliBinary({
          args: [
            'clone',
            'get',
            '@:dirtybox',
            '--what',
            'buffer',
            '--output',
            'json',
          ],
          cwd: scene.dir,
          env: scene.env,
        });
        expect(json.status).toEqual(0);
        const parsed = JSON.parse(json.stdout) as {
          probe: string;
          state: { focus: string; input: string; queued: boolean };
          content: { buffer: string[]; queue: string[] };
        };
        expect(parsed.probe).toEqual('capable');
        expect(parsed.state.focus).toEqual('input');
        expect(parsed.state.input).toEqual('dirty');
        expect(parsed.content.buffer).toEqual([
          'HUMAN-DRAFT-half-typed-and-uncommitted',
        ]);
        // the queue is provably empty, so the field is `[]` rather than a row it cannot vouch for
        expect(parsed.state.queued).toEqual(false);
        expect(parsed.content.queue).toEqual([]);
      });
    });
  });

  given('[case10] a clone with a MODAL open (a permission prompt)', () => {
    // RHACHET_STUB_MODE=modal → the stub opens on a `❯`-led option menu with a confirm
    // footer, so the pre-check reads `modal-holds-focus` and withholds — with NO force
    // path, so a say can NEVER answer a permission prompt (V3, case=6). this is the
    // safety guarantee the wish discovered, proven at the CLI grain
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'clone-modal' });
      const configDir = genTempDir({ slug: 'clone-modal-cfg' });
      setupEnrollFixture({ dir });
      const stubPath = setupRichStubBrainPath({ dir });
      const env = {
        PATH: stubPath,
        CLAUDE_CONFIG_DIR: configDir,
        RHACHET_STUB_MODE: 'modal',
      };
      const { bg } = await enrollCloneAndWaitReady({ dir, env, as: '@:modalbox' });
      return { dir, env, bg };
    });
    afterAll(async () => scene.bg.kill());

    when('[t0] a say while a modal holds focus', () => {
      const said = useThen('the say is withheld (never answers the prompt)', () =>
        invokeRhachetCliBinary({
          args: ['clone', 'say', '@:modalbox', '--what', 'poke modal-x9'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        }),
      );

      then('it exits 2 and names the modal + that it is never force-able', () => {
        expect(said.status).toEqual(2);
        expect(said.stderr.toLowerCase()).toMatch(/modal|prompt|menu/);
        expect(said.stderr.toLowerCase()).toMatch(/never force/);
      });

      const withheldJson = useThen(
        'the withheld json carries reason=modal-holds-focus + delivered=false',
        () => {
          const json = invokeRhachetCliBinary({
            args: [
              'clone',
              'say',
              '@:modalbox',
              '--what',
              'poke modal-json',
              '--output',
              'json',
            ],
            cwd: scene.dir,
            env: scene.env,
            logOnError: false,
          });
          expect(json.status).toEqual(2);
          const parsed = JSON.parse(json.stderr) as {
            class: string;
            metadata: { verdict: string; reason: string; delivered: boolean };
          };
          expect(parsed.class).toEqual('ConstraintError');
          expect(parsed.metadata.verdict).toEqual('withheld');
          expect(parsed.metadata.reason).toEqual('modal-holds-focus');
          expect(parsed.metadata.delivered).toEqual(false);
          return { stderr: json.stderr };
        },
      );

      then('the withheld/modal stderr format is locked (visual spot-check)', () => {
        expect(asSnapshotSafe(said.stderr)).toMatchSnapshot();
      });

      then('the withheld/modal JSON envelope is locked too — the MACHINE twin', () => {
        // 🔴 the higher-stakes of the two machine twins. this envelope must NOT advertise a
        //   `--force` remedy — a modal has no force path at all (V3), so a hint that read
        //   like the dirty one would invite a caller to approve a tool call no human
        //   approved. that copy is a SAFETY contract, and only a snapshot locks its text
        expect(asSnapshotSafe(withheldJson.stderr)).toMatchSnapshot();
      });
    });

    when('[t1] a --force say against the SAME modal', () => {
      // the safety invariant: --force overrides ONLY a dirty region, NEVER a modal. so a
      // forced say against a modal STILL withholds (V3) — a say can never approve a tool
      // call no human approved (case=6 t3). the bytes are NOT written (delivered=false)
      const said = useThen('the forced say is STILL withheld (no force path)', () =>
        invokeRhachetCliBinary({
          args: [
            'clone',
            'say',
            '@:modalbox',
            '--what',
            'poke modal-forced',
            '--force',
            '--output',
            'json',
          ],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        }),
      );

      then('--force cannot override a modal — exit 2, still withheld, still undelivered', () => {
        expect(said.status).toEqual(2);
        const parsed = JSON.parse(said.stderr) as {
          metadata: { verdict: string; reason: string; delivered: boolean };
        };
        expect(parsed.metadata.verdict).toEqual('withheld');
        expect(parsed.metadata.reason).toEqual('modal-holds-focus');
        expect(parsed.metadata.delivered).toEqual(false);
      });
    });

    when('[t2] a `clone get --what buffer` read while the modal holds focus', () => {
      // 🔴 the FALSE-CLEAR clamp, at the CLI grain. the probe ANSWERS here — `probe: capable` —
      //   because the screen feed is live and the classifier read it fine. what it read is
      //   `focus: modal`, which has no locatable input band, so the content read honestly
      //   returns zero rows. those zero rows must NEVER render as "the input box is clear":
      //   a caller who read that would send a say, and that say's `\r` would answer a
      //   permission prompt no human approved (V3, case=6 — the safety defect this wish found)
      const read = useThen('the read succeeds (exit 0) — it is a real answer', () =>
        invokeRhachetCliBinary({
          args: ['clone', 'get', '@:modalbox', '--what', 'buffer'],
          cwd: scene.dir,
          env: scene.env,
        }),
      );

      then('🔴 it reports the surface could NOT be read, never that the box is clear', () => {
        expect(read.status).toEqual(0);
        expect(read.stdout).toContain('could not be read');
        // the exact false-clear sentence. a substring match on `clear` alone would fire on the
        // modal's own fix line, which says a human must have cleared it
        expect(read.stdout).not.toContain('the input box is clear');
      });

      then('it names the modal as the cause, and the fix that clears it', () => {
        expect(read.stdout).toContain('modal');
        expect(read.stdout.toLowerCase()).toMatch(/--debug|tty/);
      });

      then('the modal-blind read format is locked (visual spot-check)', () => {
        expect(asSnapshotSafe(read.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case14] a clone whose screen has NO input band (unrecognized)', () => {
    // RHACHET_STUB_MODE=nobox → the stub draws plain rows with no full-width rule pair, so
    // `getInputBand` finds no band and `computeCloneInputState` classifies
    // `focus: 'unrecognized'`. the pre-check then withholds with the THIRD withheld reason
    // — a peer of modal + dirty, and like modal it has NO force path
    //
    // 🔴 .why this earns a CLI case where `absent` / `unreadable` do not (F16). those two
    //   need a fake older-peer socket or a genuine 15s hang to construct. this one needs
    //   only a screen with no rules — which is what TWO measured production defects drew:
    //   a 0x0 pty geometry (asPtyGeometry) and a detached host with no tty
    //   (genPtyCloneHostDetached), both measured 2026-09-16, each of which made every say
    //   on that clone withheld for its whole life. so the reason is reachable at CLI grain
    //   honestly and cheaply, and the gap was a hole rather than a grain choice
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'clone-nobox' });
      const configDir = genTempDir({ slug: 'clone-nobox-cfg' });
      setupEnrollFixture({ dir });
      const stubPath = setupRichStubBrainPath({ dir });
      const env = {
        PATH: stubPath,
        CLAUDE_CONFIG_DIR: configDir,
        RHACHET_STUB_MODE: 'nobox',
      };
      const { bg } = await enrollCloneAndWaitReady({ dir, env, as: '@:noboxscreen' });
      return { dir, env, bg };
    });
    afterAll(async () => scene.bg.kill());

    when('[t0] a say against a screen with no readable input band', () => {
      const said = useThen('the say is withheld (never a blind paste)', () =>
        invokeRhachetCliBinary({
          args: ['clone', 'say', '@:noboxscreen', '--what', 'poke nobox-x9'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        }),
      );

      then('it exits 2 and names the unrecognized screen', () => {
        expect(said.status).toEqual(2);
        expect(said.stderr.toLowerCase()).toMatch(/unrecognized/);
      });

      const withheldJson = useThen(
        'the withheld json carries reason=focus-unrecognized + delivered=false',
        () => {
          const json = invokeRhachetCliBinary({
            args: [
              'clone',
              'say',
              '@:noboxscreen',
              '--what',
              'poke nobox-json',
              '--output',
              'json',
            ],
            cwd: scene.dir,
            env: scene.env,
            logOnError: false,
          });
          expect(json.status).toEqual(2);
          const parsed = JSON.parse(json.stderr) as {
            class: string;
            metadata: { verdict: string; reason: string; delivered: boolean };
          };
          expect(parsed.class).toEqual('ConstraintError');
          expect(parsed.metadata.verdict).toEqual('withheld');
          expect(parsed.metadata.reason).toEqual('focus-unrecognized');
          // like modal, and unlike dirty: no write happened, so a re-send cannot duplicate
          expect(parsed.metadata.delivered).toEqual(false);
          return { stderr: json.stderr };
        },
      );

      then('the withheld/unrecognized stderr format is locked (visual spot-check)', () => {
        expect(asSnapshotSafe(said.stderr)).toMatchSnapshot();
      });

      then('the withheld/unrecognized JSON envelope is locked too — the MACHINE twin', () => {
        // the same stakes as the modal twin: this envelope must NOT advertise a `--force`
        // remedy, because an unrecognized screen has no force path either. a caller that
        // forced here would paste into a screen whose shape nobody could read
        expect(asSnapshotSafe(withheldJson.stderr)).toMatchSnapshot();
      });
    });

    when('[t1] a --force say against the SAME unrecognized screen', () => {
      // the pre-check reads FOCUS before it reads the region, so `--force` overrides only
      // an `input-region-dirty` refusal. an unrecognized focus stands regardless of the
      // flag — the same safe-by-default whitelist that blocks a modal
      const said = useThen('the forced say is STILL withheld (no force path)', () =>
        invokeRhachetCliBinary({
          args: [
            'clone',
            'say',
            '@:noboxscreen',
            '--what',
            'poke nobox-forced',
            '--force',
            '--output',
            'json',
          ],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        }),
      );

      then('--force cannot override an unrecognized focus — exit 2, still undelivered', () => {
        expect(said.status).toEqual(2);
        const parsed = JSON.parse(said.stderr) as {
          metadata: { verdict: string; reason: string; delivered: boolean };
        };
        expect(parsed.metadata.verdict).toEqual('withheld');
        expect(parsed.metadata.reason).toEqual('focus-unrecognized');
        expect(parsed.metadata.delivered).toEqual(false);
      });
    });
  });

  given('[case15] an idle clone asked for the STRONGEST await target', () => {
    // the `--await` happy path at CLI grain. every other reference to the flag in this suite
    // passes a BAD value (case1 t3/t4, the guard), and case11 exercises the DEFAULT target
    // implicitly — so no row ever proved a VALID `--await` value parses, threads through
    // `asCloneSayAwaitTarget`, and reaches the poll (r011-i007-b2)
    //
    // 🔴 .why its OWN clone, never a `when` under case1. this say adds two turns (a user
    //   message + the stub's reply) to whatever clone it targets, and case1's `[t7]` snapshot
    //   captures a conversation `total`. planted under case1 it moved that total 10 → 12 and
    //   reddened a peer snapshot — measured 2026-09-20, and invisible to a `name://t1b` scope
    //   because that scope skips t7. a fresh clone decouples it, and changes no extant
    //   assertion (rule.forbid.test-intent-violations)
    //
    // 🟡 the grain bound, stated rather than left implicit: this proves `release` is
    //   SATISFIABLE, never that it REFUSES to settle for `enqueued`. that second half needs a
    //   busy peer polled to the 15s deadline, which would tax every acceptance run for a
    //   decision `computeCloneSayPollStep.test.ts` already drives exhaustively (6
    //   `target: 'release'` cases). the same grain rationale F16 records: cover it where it
    //   can be constructed honestly and fast
    //
    // 🟡 no `toMatchSnapshot()` here, deliberately: `--await` selects the POLL TARGET and
    //   changes no byte of the payload, so a success under it renders the identical
    //   `released` envelope case9 `[t1]` already locks. a third copy of one envelope is
    //   noise, so the field asserts are the honest grain
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'clone-awaitrel' });
      const configDir = genTempDir({ slug: 'clone-awaitrel-cfg' });
      setupEnrollFixture({ dir });
      const stubPath = setupRichStubBrainPath({ dir });
      const env = { PATH: stubPath, CLAUDE_CONFIG_DIR: configDir };
      const { bg } = await enrollCloneAndWaitReady({
        dir,
        env,
        as: '@:awaitrel',
      });
      return { dir, env, bg };
    });
    afterAll(async () => scene.bg.kill());

    when('[t0] a say with an EXPLICIT `--await release`', () => {
      const said = useThen(
        'an explicit --await release lands on an idle brain',
        () =>
          invokeRhachetCliBinary({
            args: [
              'clone',
              'say',
              '@:awaitrel',
              '--what',
              'poke awaitrel-x9',
              '--await',
              'release',
              '--output',
              'json',
            ],
            cwd: scene.dir,
            env: scene.env,
            logOnError: false,
          }),
      );

      then(
        'it exits 0 and reports released — the strongest verdict, not merely enqueued',
        () => {
          expect(said.status).toEqual(0);
          const parsed = JSON.parse(said.stdout) as {
            verdict: string;
            delivered: boolean;
          };
          // `release` is the strictest target, so a pass here proves the brain TOOK the turn
          // (transcript rose AND the queue is empty) rather than merely held it
          expect(parsed.verdict).toEqual('released');
          expect(parsed.delivered).toEqual(true);
        },
      );
    });
  });

  given('[case11] a clone mid-turn (busy) that holds the message', () => {
    // RHACHET_STUB_MODE=busy → the stub echoes the message as a scrolled-up queued turn
    // atop a still-clear box, and writes NEITHER the transcript NOR a reply. so the box
    // stays clear, the screen count rises, and the transcript does not — the `enqueued`
    // shape (case=1: a nudge at a busy driver reports enqueued, never a false failure)
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'clone-busy' });
      const configDir = genTempDir({ slug: 'clone-busy-cfg' });
      setupEnrollFixture({ dir });
      const stubPath = setupRichStubBrainPath({ dir });
      const env = {
        PATH: stubPath,
        CLAUDE_CONFIG_DIR: configDir,
        RHACHET_STUB_MODE: 'busy',
      };
      const { bg } = await enrollCloneAndWaitReady({ dir, env, as: '@:busybrain' });
      return { dir, env, bg };
    });
    afterAll(async () => scene.bg.kill());

    when('[t0] a say to the busy clone (default --await enqueue)', () => {
      const said = useThen('the say reports enqueued (held, not failed)', () =>
        invokeRhachetCliBinary({
          args: ['clone', 'say', '@:busybrain', '--what', 'hold-me-x9'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        }),
      );

      then('it exits 0 (enqueued is a success verdict, never a failure)', () => {
        expect(said.status).toEqual(0);
        expect(said.stdout.toLowerCase()).toMatch(/enqueued|mid-turn|lands next/);
      });

      then('the enqueued stdout format is locked (visual spot-check)', () => {
        expect(asSnapshotSafe(said.stdout)).toMatchSnapshot();
      });

      // hoisted OUT of its `then` so the field asserts and the snapshot below read ONE
      // dispatch. two invocations would be two brain states, and `enqueued` is a read of
      // state by construction — so a second call could legitimately answer differently,
      // and a snapshot keyed to it would flake on a truth
      const json = useThen('a say on the json channel also reports enqueued', () =>
        invokeRhachetCliBinary({
          args: [
            'clone',
            'say',
            '@:busybrain',
            '--what',
            'hold-me-json',
            '--output',
            'json',
          ],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        }),
      );

      then('the enqueued json carries verdict=enqueued + delivered=true + null reason', () => {
        expect(json.status).toEqual(0);
        const parsed = JSON.parse(json.stdout) as {
          verdict: string;
          reason: string | null;
          delivered: boolean;
        };
        // enqueued = the brain HOLDS it: delivered, no reason to brief, no re-send owed
        expect(parsed.verdict).toEqual('enqueued');
        expect(parsed.delivered).toEqual(true);
        expect(parsed.reason).toBeNull();
      });

      then('the enqueued json envelope is locked — the machine twin a retry policy reads', () => {
        // the pair its peers already lock: `withheld` (case9/case10) and `buffered` (case12)
        // each snap BOTH channels. an `enqueued` field-assert alone lets a dropped field, a
        // reordered key, or a changed `reason` default ship green — and this payload is the
        // one a daemon's retry policy branches on, so its shape is the contract
        expect(asSnapshotSafe(json.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case12] a clone whose write reached the box but did not submit', () => {
    // RHACHET_STUB_MODE=bufferedhold → the initial box is clear (so the pre-check
    // proceeds), then the stub redraws the box with OUR message STILL in it and writes
    // NEITHER the transcript NOR a reply. so countInInput rises, the box is no longer
    // clear (not enqueued), and no transcript rise holds — the `buffered` verdict
    // (case=3: a genuine drop names its real cause, never a false success)
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'clone-buffered' });
      const configDir = genTempDir({ slug: 'clone-buffered-cfg' });
      setupEnrollFixture({ dir });
      const stubPath = setupRichStubBrainPath({ dir });
      const env = {
        PATH: stubPath,
        CLAUDE_CONFIG_DIR: configDir,
        RHACHET_STUB_MODE: 'bufferedhold',
      };
      const { bg } = await enrollCloneAndWaitReady({
        dir,
        env,
        as: '@:bufferbox',
      });
      // a SECOND clone on the same stub, for the TREE channel. it is a second clone and
      // never a second say, because the bufferedhold stub leaves OUR message in the box —
      // so a second dispatch at the same clone reads a DIRTY box and is withheld, which is
      // a state carryover rather than a `buffered` read. ⇒ each channel owes its own clean
      // clone, which is what makes both twins reachable at this grain
      const { bg: bgTree } = await enrollCloneAndWaitReady({
        dir,
        env,
        as: '@:bufferbox-tree',
      });
      return { dir, env, bg, bgTree };
    });
    afterAll(async () => {
      await scene.bg.kill();
      await scene.bgTree.kill();
    });

    // ONE say per clone — see the scene note. this `when` reads the `--output json` channel:
    // its stderr is a JSON envelope that EMBEDS the message + hint copy, so the
    // human-readable regex still matches it; `[t1]` reads the human tree twin
    when('[t0] a say whose bytes reach the box but never submit', () => {
      const said = useThen('the say reports buffered (do not re-send)', () =>
        invokeRhachetCliBinary({
          args: [
            'clone',
            'say',
            '@:bufferbox',
            '--what',
            'stuck-in-box-x9',
            '--output',
            'json',
          ],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        }),
      );

      then('it exits 1 (a state to verify) and names the un-submitted box + the append hazard', () => {
        expect(said.status).toEqual(1);
        expect(said.stderr.toLowerCase()).toMatch(/submit did not take|input box/);
        expect(said.stderr.toLowerCase()).toMatch(/do not re-send|append/);
      });

      then('the buffered json carries verdict + reason + delivered=true', () => {
        const parsed = JSON.parse(said.stderr) as {
          class: string;
          metadata: { verdict: string; reason: string; delivered: boolean };
        };
        // buffered = the bytes WERE written (delivered) but the submit did not take, so a
        // re-send would append and wedge → MalfunctionError (exit 1)
        expect(parsed.class).toEqual('MalfunctionError');
        expect(parsed.metadata.verdict).toEqual('buffered');
        expect(parsed.metadata.reason).toEqual('input-region-holds-text');
        expect(parsed.metadata.delivered).toEqual(true);
      });

      then('the buffered/holds-text stderr envelope is locked (visual spot-check)', () => {
        expect(asSnapshotSafe(said.stderr)).toMatchSnapshot();
      });
    });

    // the HUMAN twin of the same verdict, on its own clean clone. `withheld` (case9/case10)
    // locks both channels; `buffered` locked only the machine one, so a regression in the
    // human frame — a dropped glyph, a reworded message, a misrendered hint — would have
    // shipped undetected. and it is the frame a caller who types `rhx clone say` reads
    when('[t1] the same un-submitted say, on the HUMAN tree channel', () => {
      const saidTree = useThen('the tree say also reports buffered', () =>
        invokeRhachetCliBinary({
          args: ['clone', 'say', '@:bufferbox-tree', '--what', 'stuck-in-box-x9'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        }),
      );

      then('it exits 1 and the human frame names the box + the append hazard', () => {
        expect(saidTree.status).toEqual(1);
        expect(saidTree.stderr.toLowerCase()).toMatch(
          /submit did not take|input box/,
        );
        expect(saidTree.stderr.toLowerCase()).toMatch(/do not re-send|append/);
      });

      then('the buffered human frame is locked (visual spot-check)', () => {
        expect(asSnapshotSafe(saidTree.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case13] a FAILURE verdict against a live clone — the debug stream', () => {
    // the same `bufferedhold` stub case12 uses, on its OWN clone: that is the one CLI-grain
    // fixture where a say is DELIVERED and still fails, so it drives the whole instrument —
    // a baseline probe, a real observe loop, and a terminal read the verdict rests on.
    //
    // ⚠️ this is the clamp for the gap measured 2026-09-16: three live dispatches that
    //   demonstrably landed all reported `absent`, and the CLI could not part the two rival
    //   causes because `say` reports a VERDICT and discards the classification behind it
    //   (F15's cost). the fix is this stream; this case proves it lands, on a REAL emulator
    //   grid rendered off a REAL pty — never a constructed screen
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'clone-debuglog' });
      const configDir = genTempDir({ slug: 'clone-debuglog-cfg' });
      setupEnrollFixture({ dir });
      const stubPath = setupRichStubBrainPath({ dir });
      const env = {
        PATH: stubPath,
        CLAUDE_CONFIG_DIR: configDir,
        RHACHET_STUB_MODE: 'bufferedhold',
      };
      const { bg } = await enrollCloneAndWaitReady({
        dir,
        env,
        as: '@:debuglog',
      });
      return { dir, env, bg };
    });
    afterAll(async () => scene.bg.kill());

    when('[t0] a say that fails with `buffered`', () => {
      // ONE say only — the bufferedhold stub leaves our text in the box, so a second say
      // would read a dirty box and be withheld (a different verdict, a different trail)
      const said = useThen('the say reports a failure verdict', () =>
        invokeRhachetCliBinary({
          args: [
            'clone',
            'say',
            '@:debuglog',
            '--what',
            'debuglog-needle-x9',
            '--output',
            'json',
          ],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        }),
      );

      // .note = useThen hands back a proxy over a Record, so the path rides a field
      const debug = useThen(
        'the failure envelope names the debug log it wrote',
        () => {
          const parsed = JSON.parse(said.stderr) as {
            metadata: { verdict: string; debugLog: string | null };
          };
          expect(parsed.metadata.verdict).toEqual('buffered');
          // the ADDRESS of the evidence rides the machine channel, so a daemon that hits
          // an unexplained verdict can fetch the record without a human in the loop
          expect(parsed.metadata.debugLog).toEqual(expect.any(String));
          return { path: parsed.metadata.debugLog as string };
        },
      );

      then('the log lands at the declared coordinate, under the gitignored cache', () => {
        expect(debug.path).toContain(
          join('.agent', '.cache', 'repo=rhachet', 'skill=clone-say'),
        );
        expect(debug.path).toMatch(/debug\.\d{4}-\d{2}-\d{2}\.log$/);
        expect(existsSync(debug.path)).toEqual(true);
      });

      then('the log states the verdict and the reason slug it landed on', () => {
        const log = readFileSync(debug.path, 'utf8');
        expect(log).toContain('clone say — buffered');
        expect(log).toContain('reason        input-region-holds-text');
        expect(log).toContain('delivered     true');
      });

      then(
        'it carries EVERY decision input — the baseline, the rises, and the probe strength',
        () => {
          const log = readFileSync(debug.path, 'utf8');
          // the rises the verdict read
          //
          // 🟡 matched space-tolerantly, on purpose. this block's stated subject is that every
          //   decision input is PRESENT with its value; the label COLUMN is a render property,
          //   and `computeCloneSayDebugReport.test.ts.snap` locks it exhaustively at the unit
          //   grain — all eight rows, byte for byte. a hand-typed space run here duplicates that
          //   lock at the wrong grain and breaks on any alignment edit: measured 2026-09-20, a
          //   one-column repair of the decision block reddened this row while the row's own
          //   claim still held. so this is a re-grain, never a loosen — the assertion moved to
          //   the property this test owns (rule.forbid.test-intent-violations)
          expect(log).toMatch(/screen\.countInInputRose +true/);
          expect(log).toMatch(/transcriptRose +false/);
          // the baseline each rise was measured against, so a reader checks the subtraction
          expect(log).toContain('── the pre-dispatch baseline');
          expect(log).toMatch(/countOnScreen {4}\d+/);
          expect(log).toContain('baseline reply   probe=capable');
        },
      );

      then('it carries the observe trail — at least one cycle, with its lag', () => {
        const log = readFileSync(debug.path, 'utf8');
        expect(log).toMatch(/── the observe trail \([1-9]\d* cycles\)/);
        expect(log).toMatch(/# {2}0 \+ *\d+ms transcriptRose=false probe=capable/);
      });

      then(
        'it carries the EXACT grid the emulator rendered — geometry, rows, and the needle in the box',
        () => {
          const log = readFileSync(debug.path, 'utf8');
          // both ends of the poll, so a reader diffs the screen the dispatch changed
          expect(log).toContain('BEFORE the dispatch (the baseline probe)');
          expect(log).toContain('AFTER the dispatch (cycle #');
          // the geometry a band read depends on — a real pty, so real cols/rows
          expect(log).toMatch(/cols=\d+ rows=\d+ cursor=\(x:\d+,y:\d+\)/);
          // ⚠️ THE assertion this whole stream exists for: the message the verdict was
          //   decided about is visible in the rendered rows, inside a `│…│` row frame. a
          //   summary could never show this — only the raw grid can
          expect(log).toMatch(/│[^\n]*debuglog-needle-x9[^\n]*│/);
        },
      );
    });
  });

  given('[case13b] a SUCCESS verdict with --debug — the other half of the stream', () => {
    // 🔴 the clamp for the instrument's own gap, measured 2026-09-18. the capture fired on a
    // FAILURE only, and a cure to the SCREEN READ is proven by a SUCCESS: the say that used to
    // be refused must now land against the very same screen. with a failure-only capture, that
    // success wrote no evidence at all — the cursor-cell cure landed on a live peer and could
    // not be shown to work, because every post-cure say returned `released` and captured
    // naught. so `--debug` captures the record on a success too, and this proves BOTH halves:
    // the record lands when asked for, and the stdout contract does not move (V13)
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'clone-debugok' });
      const configDir = genTempDir({ slug: 'clone-debugok-cfg' });
      setupEnrollFixture({ dir });
      const stubPath = setupRichStubBrainPath({ dir });
      const env = { PATH: stubPath, CLAUDE_CONFIG_DIR: configDir };
      const { bg } = await enrollCloneAndWaitReady({
        dir,
        env,
        as: '@:debugok',
      });
      return { dir, env, bg };
    });
    afterAll(async () => scene.bg.kill());

    when('[t0] a say that SUCCEEDS, with --debug', () => {
      const said = useThen('the say succeeds', () =>
        invokeRhachetCliBinary({
          args: [
            'clone',
            'say',
            '@:debugok',
            '--what',
            'debugok-needle-q4',
            '--debug',
            '--output',
            'json',
          ],
          cwd: scene.dir,
          env: scene.env,
        }),
      );

      then('the stdout record is UNCHANGED by --debug — no field, no reshape (V13)', () => {
        // the flag is diagnostic-only: it must not touch the machine channel a retry policy
        // reads, else every consumer would branch on whether a human asked for evidence
        const parsed = JSON.parse(said.stdout) as {
          delivered: boolean;
          verdict: string;
        };
        expect(parsed.delivered).toEqual(true);
        expect(['released', 'enqueued']).toContain(parsed.verdict);
        expect(Object.keys(parsed).sort()).toEqual(
          ['delivered', 'probe', 'reason', 'serial', 'slug', 'verdict'].sort(),
        );
      });

      // .note = useThen hands back a proxy over a Record, so the path rides a field
      const debug = useThen('stderr names where the capture landed', () => {
        // a silent write is a diagnostic nobody can find. the path goes to STDERR precisely so
        // the clamp above can hold — stdout stays the byte-for-byte record it always was
        const matched = /🔍 clone say capture appended → (\S+)/.exec(said.stderr);
        expect(matched).not.toBeNull();
        return { path: matched![1]!, line: matched![0]! };
      });

      then('the capture NOTICE is a caller-faced contract, so it is snapped', () => {
        // a human reads this line and then hunts for the file, so the glyph, the phrase, and
        // the SHAPE of the path are all caller experience — and the regex above proves only
        // that a path was named, never how the line reads
        //
        // deterministic by construction: the temp root collapses to `/TMP_TEST_DIR` and the
        // calendar day to `debug.__DATE__.log`, so the only bytes left are the ones a reader
        // is owed — the glyph, the sentence, and the `.agent/.cache/repo=…/skill=…` address
        expect(asSnapshotSafe(debug.line)).toMatchSnapshot();
      });

      then('the capture holds the SUCCESS verdict and the grid behind it', () => {
        // goes RED under the pre-cure code, which wrote no file at all on a success — so the
        // whole `--debug` surface is what this line pins
        expect(existsSync(debug.path)).toEqual(true);
        const log = readFileSync(debug.path, 'utf8');
        expect(log).toMatch(/clone say — (released|enqueued)/);
        // the grid is the point: a screen-read cure is proven by the rows the read SAW while
        // it decided to proceed, which only a success capture can carry
        expect(log).toContain('BEFORE the dispatch (the baseline probe)');
        expect(log).toContain(
          'BRIGHT ONLY (dim cells blanked; this is what the dirty/clear read sees)',
        );
        expect(log).toMatch(/│[^\n]*debugok-needle-q4[^\n]*│/);
      });
    });

    when('[t1] the same say WITHOUT --debug', () => {
      const said = useThen('the say succeeds', () =>
        invokeRhachetCliBinary({
          args: [
            'clone',
            'say',
            '@:debugok',
            '--what',
            'nodebug-needle-q5',
            '--output',
            'json',
          ],
          cwd: scene.dir,
          env: scene.env,
        }),
      );

      then('stderr names NO capture — the happy path stays opt-in', () => {
        // the counter-half. a capture on every success would grow a log a daemon's steady
        // traffic nobody reads, so the default must be silent — and a clamp that only proved
        // the write happens would pass a build that always wrote
        expect(said.stderr).not.toContain('clone say capture appended');
      });
    });
  });

  // .note = `absent` and `unreadable` have NO deterministic CLI-grain fixture, and the call
  //   is the wisher-visible fulcrum F16
  //   (.fulcrums/inventory.of=fulcrums.case=F16-absent-and-unreadable-are-covered-below-the-cli-grain.md).
  //   `absent` (delivered, yet NO rise held anywhere) cannot occur through a faithful cooked
  //   pty: the pty ECHOES any delivered message as a scrolled line, so countOnScreen always
  //   rises → the read lands `enqueued`, never the zero-rise residual. `unreadable` needs a
  //   probe-blind socket (a null screen), which requires the @xterm/headless emulator absent
  //   PROCESS-WIDE — the `context.emulator` seam that forces it (genCloneOndisk.ts:167-170)
  //   is NOT threaded through the enroll CLI, so no invocation can null it, and a removal of
  //   the shared dep would redden every other suite. a prod env backdoor to force it would
  //   plant a test-only seam in the production enroll path — a worse defect than the gap.
  //   both verdicts ARE proven where they are constructible: unit grain
  //   (computeCloneSayVerdict.test.ts:169-209 — feed-not-live, peer-probe-blind, and the
  //   null-screen default all map to `unreadable`; the zero-rise residual maps to `absent`)
  //   and the observation-assembly integration grain
  //   (getCloneSayObservation.integration.test.ts [case2] — a probe-blind peer polls to the
  //   bound and hands back the null-screen residual `unreadable` rests on). the CLI ENVELOPE
  //   itself (exit code, json projection, stderr frame) is proven by the peer verdicts that
  //   DO reach this grain — `withheld` (case9/case10) and `buffered` (case12) — which travel
  //   the identical computeCloneSayReport + asCliErrorJson path
});
