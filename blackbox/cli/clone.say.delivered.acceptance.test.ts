import { MalfunctionError } from 'helpful-errors';
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

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * .what = the `say` verdicts past a delivered write — await targets, `/exit`, enqueued,
 *   buffered, and the `--debug` stream for both a failure and a success
 * .note = split from `clone.acceptance.test.ts` so it runs on its own jest worker; the
 *   describe name is kept, so each snapshot key is the one it held before the split
 */
describe('rhx clone reach (acceptance)', () => {
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
    // 🟡 `--await` selects the POLL TARGET and should change no byte of the payload; the
    //   snapshot below locks that claim on this path, so a reshape specific to
    //   `--await release` (an extra key, a moved field) reddens here rather than ships
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
        async () =>
          invokeRhachetCliBinaryAsync({
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

      then('the released json envelope under `--await release` is locked', () => {
        expect(asSnapshotSafe(said.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case16] a live clone asked to end (`/exit`)', () => {
    // the stub ends on `/exit`, the way claude does, so its socket closes after the message
    //   lands — the `exited` verdict: a success, never a dead-clone fault
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'clone-exit' });
      const configDir = genTempDir({ slug: 'clone-exit-cfg' });
      setupEnrollFixture({ dir });
      const stubPath = setupRichStubBrainPath({ dir });
      const env = { PATH: stubPath, CLAUDE_CONFIG_DIR: configDir };
      const { bg } = await enrollCloneAndWaitReady({ dir, env, as: '@:exitme' });
      return { dir, env, bg };
    });
    afterAll(async () => scene.bg.kill());

    when('[t0] a say of `/exit` to the clone', () => {
      // async, never sync — the live pty must drain while the say runs
      //   (rule.forbid.sync-invoke-while-a-pty-is-live)
      const said = useThen('the say returns', () =>
        invokeRhachetCliBinaryAsync({
          args: ['clone', 'say', '@:exitme', '--what', '/exit'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        }),
      );

      then('it exits 0 — an asked-for exit is a success verdict', () => {
        expect(said.status).toEqual(0);
      });

      then('stdout names the exit, and naught else', () => {
        expect(said.stdout.trim()).toEqual(
          '😶🎙️ said to @:exitme — the clone exited as asked',
        );
      });

      then('the exited stdout is locked, end to end through the cli', () => {
        // the same live path as its peer verdicts (pty + socket + subprocess + stdout), so
        //   the caller's view of `exited` is drift-locked in the diff like theirs
        expect(asSnapshotSafe(said.stdout)).toMatchSnapshot();
      });

      then('stderr is empty — a success writes no fault line', () => {
        expect(said.stderr.trim()).toEqual('');
      });
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
      const said = useThen('the say reports enqueued (held, not failed)', async () =>
        invokeRhachetCliBinaryAsync({
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
      const json = useThen('a say on the json channel also reports enqueued', async () =>
        invokeRhachetCliBinaryAsync({
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
      const said = useThen('the say reports buffered (do not re-send)', async () =>
        invokeRhachetCliBinaryAsync({
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
      const saidTree = useThen('the tree say also reports buffered', async () =>
        invokeRhachetCliBinaryAsync({
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
      const said = useThen('the say reports a failure verdict', async () =>
        invokeRhachetCliBinaryAsync({
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
        // the first cycle carries its lag, whatever the probe read then
        expect(log).toMatch(/# {2}0 \+ *\d+ms transcriptRose=false probe=/);
        // and some cycle read the screen capably. a loaded host can see the feed not yet
        //   live on cycle 0 (`probe=unsupported reason=feed-not-live`), so no ONE cycle is
        //   pinned
        expect(log).toMatch(/# +\d+ \+ *\d+ms transcriptRose=false probe=capable/);
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
      // the AFTER grid is the read the verdict was decided on, never a later re-probe. on a
      //   loaded host the cycle-0 probe can time out to `feed-not-live` while the transcript
      //   rises, so that say releases on a blind read and its capture holds no grid. the cure
      //   is the one [case13]'s observe poll and clone.screen-dogfood use: sample again until a
      //   capable read lands, then hold that read to the strict needle clamp below. each try
      //   carries its own needle, so a grid can only prove the try it belongs to (fulcrum F12)
      const tries = useThen('the say succeeds, on a capable read', async () => {
        const triesBlind: { verdict: string; afterSection: string }[] = [];
        for (const index of [1, 2, 3]) {
          const needle = `debugok-needle-q4-try${index}`;
          const said = await invokeRhachetCliBinaryAsync({
            args: [
              'clone',
              'say',
              '@:debugok',
              '--what',
              needle,
              '--debug',
              '--output',
              'json',
            ],
            cwd: scene.dir,
            env: scene.env,
          });
          const matched = /🔍 clone say capture appended → (\S+)/.exec(said.stderr);
          if (!matched) return { said, needle, triesBlind, afterSection: '' };
          const log = readFileSync(matched[1]!, 'utf8');
          const afterIndex = log.lastIndexOf('AFTER the dispatch (cycle #');
          const afterSection = log.slice(afterIndex, log.indexOf('═══ end ═══', afterIndex));
          const isBlind = afterSection.includes(
            '(probe-blind: feed-not-live — the feed handed back no grid)',
          );
          if (!isBlind) return { said, needle, triesBlind, afterSection };
          const parsed = JSON.parse(said.stdout) as { verdict: string };
          triesBlind.push({ verdict: parsed.verdict, afterSection });
        }
        throw new MalfunctionError('three says in a row read blind; no capable read was sampled', {
          triesBlind,
        });
      });

      then('the stdout record is UNCHANGED by --debug — no field, no reshape (V13)', () => {
        // the flag is diagnostic-only: it must not touch the machine channel a retry policy
        // reads, else every consumer would branch on whether a human asked for evidence
        const parsed = JSON.parse(tries.said.stdout) as {
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
        const matched = /🔍 clone say capture appended → (\S+)/.exec(tries.said.stderr);
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

      then('the capture holds the SUCCESS verdict', () => {
        // goes RED under the pre-cure code, which wrote no file at all on a success — so the
        // whole `--debug` surface is what this line pins
        expect(existsSync(debug.path)).toEqual(true);
        const log = readFileSync(debug.path, 'utf8');
        expect(log).toMatch(/clone say — (released|enqueued)/);
      });

      then('the capture holds the BEFORE grid, in its bright-only view', () => {
        // the grid is the point: a screen-read cure is proven by the rows the read SAW while
        // it decided to proceed, which only a success capture can carry
        const log = readFileSync(debug.path, 'utf8');
        expect(log).toContain('BEFORE the dispatch (the baseline probe)');
        expect(log).toContain(
          'BRIGHT ONLY (dim cells blanked; this is what the dirty/clear read sees)',
        );
      });

      then('the capture holds an AFTER section, the read the verdict was decided on', () => {
        const log = readFileSync(debug.path, 'utf8');
        expect(log).toContain('AFTER the dispatch (cycle #');
      });

      then('the AFTER grid carries the dispatched needle, inside a row frame', () => {
        // ⚠️ the success-path clamp: the message the verdict was decided about is visible in
        //   the rows the read SAW. the needle is the one this try sent, so an earlier try's
        //   grid cannot satisfy it
        expect(tries.afterSection).toMatch(
          new RegExp(`│[^\\n]*${tries.needle}[^\\n]*│`),
        );
      });

      then('a try that read blind, if any, released and named its blind read', () => {
        // the honest degrade a loaded host can force: no grid, the blind line in its place,
        //   and a `released` verdict proven by the transcript. a blind read on any other
        //   verdict, or a blind line beside a grid, fails
        const triesBlindRead = tries.triesBlind.map((tryBlind) => ({
          verdict: tryBlind.verdict,
          isGridRowAny: /│[^\n]*│/.test(tryBlind.afterSection),
        }));
        expect(triesBlindRead).toEqual(
          tries.triesBlind.map(() => ({ verdict: 'released', isGridRowAny: false })),
        );
      });
    });

    when('[t1] the same say WITHOUT --debug', () => {
      const said = useThen('the say succeeds', async () =>
        invokeRhachetCliBinaryAsync({
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
