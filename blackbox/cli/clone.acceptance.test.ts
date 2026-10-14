import { ConstraintError } from 'helpful-errors';
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
  invokeRhachetCliBinaryAsync,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';
// the ONE owner of the short-serial projection. its own unit clamp pins the shape with
// LITERALS (`'49b41f88'`, length 8, a genuine prefix), so a read through it here asserts
// "the cli renders THAT projection" rather than re-derives the rule a second time
import { asCloneSerialHuman } from '@src/domain.operations/clone/asCloneSerialHuman';

import { readdirSync } from 'node:fs';
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
 *   - the actor stays the repo actor `actor.via.repo=ambient` while the clone wears the
 *     @:driver handle — the two-grain split the whole frame rests on
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
      then('the on-disk actor is the REPO actor, never a hash or slug actor', () => {
        const actorsRoot = join(scene.dir, '.agent', '.actors');
        const entries = readdirSync(actorsRoot);
        // a bare enroll takes the ambient roles, and the ambient roles live only in
        // the repo actor — so the enroll lands there and mints no hash actor
        expect(entries.filter((e) => e.startsWith('actor.via.'))).toEqual([
          'actor.via.repo=ambient',
        ]);
      });

      // one read of `clone list`, shared by the field checks and the snapshot below
      const listed = useThen('`clone list` is read', async () =>
        invokeRhachetCliBinaryAsync({
          args: ['clone', 'list'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        }),
      );

      then('the clone appears LIVE in `clone list`, by slug + abbreviated serial', () => {
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
        // serial (abbrev), socket + since-timestamp are masked; the actor exid
        // (repo=ambient), slug + state word are deterministic — so this locks the layout
        expect(asSnapshotSafe(listed.stdout)).toMatchSnapshot();
      });

      then('the clone-list json machine shape is locked (catches a drifted shape)', async () => {
        // the MACHINE counterpart of the tree list — a cron/comms consumer reads the
        // grouped facts as fields, never box-glyphs (usecase.11). the populated json
        // pairs with the actor-list json pattern; serial + spawnedAt are masked, the
        // actorHash is deterministic, so the {actors:[{…,clones:[…]}]} shape locks
        const listed = await invokeRhachetCliBinaryAsync({
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
      const who = useThen('whoami resolves this clone`s own address', async () =>
        invokeRhachetCliBinaryAsync({
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
      const selfSaid = useThen('the self-say lands', async () =>
        invokeRhachetCliBinaryAsync({
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

      then('the self-say json carries the verdict trio (machine contract)', async () => {
        // the MACHINE twin — a self-managed clone reads its own dispatch through the
        // same additive payload a peer dispatch carries. 🔴 the trio must be PRESENT:
        //   the retired refusal had no verdict to report, and that absence was itself
        //   the tell that the verb never dispatched
        const selfJson = await invokeRhachetCliBinaryAsync({
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

      then('🔴 `--await release` clamps to enqueue, and says so', async () => {
        // the ONE surviving constraint, and it is a clamp rather than a refusal:
        // `released` needs an empty queue, and the caller's own queue cannot drain
        // until this very say returns — the `clone say` process IS a tool call the
        // brain is mid-way through. so the honest act is to lower the target and
        // report it, never to poll the whole bound for an impossible drain
        const selfAwait = await invokeRhachetCliBinaryAsync({
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

        // the clamp notice is its own user-faced stderr variant; lock its words + shape
        expect(asSnapshotSafe(selfAwait.stderr)).toMatchSnapshot();
      });

      then('the self-say success format is locked (visual spot-check)', () => {
        // the address is a fixed literal (@:driver), so this locks the exact tree a
        // clone reads back from its own dispatch — which must be byte-identical to a
        // peer say's, since no surface distinguishes them (V13)
        expect(asSnapshotSafe(selfSaid.stdout)).toMatchSnapshot();
      });
    });

    when('[t4] a process says to an UNKNOWN address', () => {
      const said = useThen('the say fails loud (never a silent drop)', async () =>
        invokeRhachetCliBinaryAsync({
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
      // the machine counterpart of t3: a self-managed clone reads its own actorExid
      // from json, the named peer-discovery field (uc.11 addendum 5) — so it can then
      // `clone list @<actorExid>` to enumerate its siblings
      const who = useThen('whoami --output json returns a machine shape', async () =>
        invokeRhachetCliBinaryAsync({
          args: ['clone', 'whoami', '--output', 'json'],
          cwd: scene.dir,
          env: { ...scene.env, RHACHET_CLONE_SERIAL: scene.serial },
          logOnError: false,
        }),
      );

      then('the json carries this clone`s serial, slug, and actorExid', () => {
        expect(who.status).toEqual(0);
        // a machine parses fields, never tree glyphs
        expect(who.stdout).not.toContain('├─');
        const parsed = JSON.parse(who.stdout) as {
          serial: string;
          slug: string | null;
          actorExid: string;
        };
        expect(parsed.serial).toEqual(scene.serial);
        expect(parsed.slug).toEqual('driver');
        // actorExid is the peer-discovery field — the whole `via=` token a clone
        // passes to `clone list @<actorExid>`. a bare enroll lands in the repo actor
        expect(parsed.actorExid).toEqual('repo=ambient');
      });

      then('the whoami json machine shape is locked (catches a drifted shape)', () => {
        // pair the field asserts with a snapshot per rule.require.snapshots — the
        // serial is masked, the slug + actorExid + json key-set stay stable, so a
        // widened or renamed json field surfaces as a snapshot diff in review
        expect(asSnapshotSafe(who.stdout)).toMatchSnapshot();
      });
    });

    when('[t5b] `clone whoami` run OUTSIDE any enrolled clone', () => {
      // no clone env in the child — a plain shell, not a spawned clone.
      // the mandated fail-loud (usecase.11 addendum 5, third scenario): a caller
      // is never handed a fabricated self-identity — name the cause AND the fix
      const who = useThen('whoami fails loud when not inside a clone', async () =>
        invokeRhachetCliBinaryAsync({
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
      const whoJson = useThen('whoami --output json fails loud with a shape', async () =>
        invokeRhachetCliBinaryAsync({
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
          const said = await invokeRhachetCliBinaryAsync({
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
          const got = await invokeRhachetCliBinaryAsync({
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
      const bad = useThen('a malformed --tail fails loud', async () =>
        invokeRhachetCliBinaryAsync({
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
      const badJson = useThen('a malformed --tail fails loud with a shape', async () =>
        invokeRhachetCliBinaryAsync({
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
      const bad = useThen('a malformed --format fails loud', async () =>
        invokeRhachetCliBinaryAsync({
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
      const badJson = useThen('a malformed --format fails loud with a shape', async () =>
        invokeRhachetCliBinaryAsync({
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
        async () => {
          const all = await invokeRhachetCliBinaryAsync({
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
          const one = await invokeRhachetCliBinaryAsync({
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
      const failures = useThen('say + get emit a structured JSON error', async () => {
        const said = await invokeRhachetCliBinaryAsync({
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
        const got = await invokeRhachetCliBinaryAsync({
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
      const got = useThen('the get fails loud (never a silent empty)', async () =>
        invokeRhachetCliBinaryAsync({
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
      const got = useThen('a bare get returns the newest reply as a tree', async () =>
        invokeRhachetCliBinaryAsync({
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
            throw new ConstraintError('clone say @:driver did not exit 0', {
              status: said.status,
              stderr: said.stderr,
              hint: 'read the say stderr above; the stub clone may have died before the say reached it',
            });
          await pollForAck({
            address: '@:driver',
            nonce,
            dir: scene.dir,
            env: scene.env,
          });
          const blocks = await invokeRhachetCliBinaryAsync({
            args: ['clone', 'get', '@:driver', '--tail', '4'],
            cwd: scene.dir,
            env: scene.env,
            logOnError: false,
          });
          const raw = await invokeRhachetCliBinaryAsync({
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

});
