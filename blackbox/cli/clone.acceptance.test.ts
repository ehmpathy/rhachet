import { ConstraintError } from 'helpful-errors';
import { genTempDir, given, then, useBeforeAll, useThen, when } from 'test-fns';

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
import { findsertActorOndisk } from '@src/domain.operations/actor/enrolled/findsertActorOndisk';
import { genSampleCloneOnDisk } from '@src/.test/assets/genSampleCloneOnDisk';

import { readdirSync } from 'node:fs';
import { join } from 'node:path';

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
        expect(entries.some((e) => e.startsWith('actor.via.slug='))).toBe(
          false,
        );
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
        expect(listed.stdout).toContain(scene.serial.slice(0, 8));
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
      const nonce = `slug${Date.now()}`;
      const roundtrip = useThen('the say+get round-trips by slug', async () => {
        const said = invokeRhachetCliBinary({
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
      const nonce = `serial${Date.now()}`;
      const roundtrip = useThen(
        'the same clone round-trips by serial (address forms interchangeable)',
        async () => {
          const address = `@:${scene.serial}`;
          const said = invokeRhachetCliBinary({
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
      const nonce = `abbrev${Date.now()}`;
      const roundtrip = useThen(
        'the clone round-trips by its abbreviated (first-8-hex) serial',
        async () => {
          // the EXACT short form the list renders — the first uuid segment
          const address = `@:${scene.serial.slice(0, 8)}`;
          const said = invokeRhachetCliBinary({
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

      then('whoami names this clone by its own slug + serial', () => {
        expect(who.status).toEqual(0);
        expect(who.stdout).toContain('driver');
        expect(who.stdout).toContain(scene.serial);
      });

      then('the whoami tree (human) success format is locked (visual spot-check)', () => {
        // the PRIMARY interactive self-identity variant (uc.11 addendum 5) — paired
        // with the whoami JSON success (t5) and the not-a-clone error (t5b). the serial
        // is masked by asSnapshotSafe, the slug is a fixed literal, so the layout locks
        // stably per rule.require.contract-snapshot-exhaustiveness
        expect(asSnapshotSafe(who.stdout)).toMatchSnapshot();
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
      // no RHACHET_CLONE_SERIAL in the env — a plain shell, not a spawned clone.
      // the mandated fail-loud (usecase.11 addendum 5, third scenario): a caller
      // is never handed a fabricated self-identity — name the cause AND the fix
      const who = useThen('whoami fails loud when not inside a clone', () =>
        invokeRhachetCliBinary({
          args: ['clone', 'whoami'],
          cwd: scene.dir,
          env: scene.env, // note: NO RHACHET_CLONE_SERIAL is injected here
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
          env: scene.env, // note: NO RHACHET_CLONE_SERIAL is injected here
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
      const nonce = `stdin${Date.now()}`;
      const roundtrip = useThen(
        'a piped message round-trips like --what <m>',
        async () => {
          const said = invokeRhachetCliBinary({
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
      const nonce = `json${Date.now()}`;
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
        expect(
          asSnapshotSafe(shapes.got.stdout).split(nonce).join('__NONCE__'),
        ).toMatchSnapshot();
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
        // a get consumer parses, so BOTH talk-verb json failures are clamped (i022 r010 #5)
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
      const nonce = `dir${Date.now()}`;
      const convo = useThen(
        'say poke <nonce>, then get --tail 4 as blocks and as raw',
        async () => {
          const said = invokeRhachetCliBinary({
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
        const owner = genSampleCloneOnDisk({
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

      // kill the brain so its socket is gone — the clone now reads DEAD
      await bg.kill();
      // let the socket close after the child exits
      await new Promise((r) => setTimeout(r, 500));

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
