import { genTempDir, given, then, useBeforeAll, useThen, when } from 'test-fns';

import {
  enrollCloneAndWaitReady,
  setupEnrollFixture,
  setupRichStubBrainPath,
} from '@/blackbox/.test/infra/enrollCloneHarness';
import {
  asSnapshotSafe,
  invokeRhachetCliBinaryAsync,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';

/**
 * .what = the `say` verdicts a dequeue gate withholds — a dirty box, a modal, no input band
 * .note = split from `clone.acceptance.test.ts` so it runs on its own jest worker; the
 *   describe name is kept, so each snapshot key is the one it held before the split
 */
describe('rhx clone reach (acceptance)', () => {
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

    // ⚠️ every `clone say` here is the async twin: the clone's pty is live, and a sync
    //   spawn freezes the loop that drains it, so under a full parallel run the screen
    //   feed read as not live (`rule.forbid.sync-invoke-while-a-pty-is-live`)
    when('[t0] an UNFORCED say into the dirty box', () => {
      const said = useThen('the say is withheld (never a blind paste)', async () =>
        invokeRhachetCliBinaryAsync({
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
        async () => {
          const json = await invokeRhachetCliBinaryAsync({
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
        async () =>
          invokeRhachetCliBinaryAsync({
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

      then('the --force help names the fused-turn hazard, so the release is never read as safe (F12)', async () => {
        const help = await invokeRhachetCliBinaryAsync({
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
      const read = useThen('the read succeeds (exit 0) against a LIVE clone', async () => {
        const result = await invokeRhachetCliBinaryAsync({
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

      then('the withheld say HINT points at this read, not at the wider --debug grid', async () => {
        // the hint and the read must name each other, or a refused caller is handed a dead end
        // beside a live remedy. `--debug` returns the whole viewport and leaves them to locate
        // the band; `--what buffer` prints the band. a hint at the wider one is a worse answer
        const said = await invokeRhachetCliBinaryAsync({
          args: ['clone', 'say', '@:dirtybox', '--what', 'poke hint-x9'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        });
        expect(said.status).toEqual(2);
        expect(said.stderr).toContain('--what buffer');
      });

      const queueRead = useThen('a `--what queue` read of the same clone', async () =>
        invokeRhachetCliBinaryAsync({
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

      then('the `--output json` twin carries the content, for a MACHINE caller', async () => {
        // the tree twin alone is not coverage: `--output json` is a different caller contract
        // off the same read, and a daemon that polls a refused box reads THIS one
        const json = await invokeRhachetCliBinaryAsync({
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

        // the machine twin is locked like the tree twin above, so a dropped key, a renamed
        //   field or a reordered payload fails loud rather than ships green
        expect(asSnapshotSafe(json.stdout)).toMatchSnapshot();
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
      const said = useThen('the say is withheld (never answers the prompt)', async () =>
        invokeRhachetCliBinaryAsync({
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
        async () => {
          const json = await invokeRhachetCliBinaryAsync({
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
      const said = useThen('the forced say is STILL withheld (no force path)', async () =>
        invokeRhachetCliBinaryAsync({
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
      const read = useThen('the read succeeds (exit 0) — it is a real answer', async () =>
        invokeRhachetCliBinaryAsync({
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
      const said = useThen('the say is withheld (never a blind paste)', async () =>
        invokeRhachetCliBinaryAsync({
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
        async () => {
          const json = await invokeRhachetCliBinaryAsync({
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
      const said = useThen('the forced say is STILL withheld (no force path)', async () =>
        invokeRhachetCliBinaryAsync({
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

});
