import { genTempDir, given, then, useBeforeAll, useThen, when } from 'test-fns';
import { getUuid } from 'uuid-fns';

import {
  asCloneSayHeadSnapshotSafe,
  enrollRealClaudeAndWaitReach,
  expectCloneSaySuccessTree,
  getRealClaudeOrThrow,
  sayAndPollForMarker,
  setupEnrollFixture,
  setRealClaudeFirstRunAccepted,
} from '@/blackbox/.test/infra/enrollCloneHarness';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';
// the ONE owner of the short-serial projection — same read as its `clone.acceptance`
// twin, so the two suites cannot drift apart on the form they each assert
import { asCloneSerialHuman } from '@src/domain.operations/clone/asCloneSerialHuman';

import { delimiter } from 'node:path';

// a real claude boot (~30-90s) + 5 conversational turns (each a think + transcript
// write) far exceeds the 90s global hook cap in jest.acceptance.env.ts — raise it for
// THIS file so the enroll hook and every turn have room, per the real-brain reality
jest.setTimeout(300000);

/**
 * .what = a FULL 5-turn conversation with a real `@:joker` clone that tells jokes —
 *   the real-brain reach tier proven as an actual back-and-forth, not a single ping.
 *   each turn dispatches a request into the SAME live claude session and reads its
 *   reply back through `get`, so the whole arc (continuity, address-interchange,
 *   @stdin, a question) is proven end to end against a real brain (never a stub).
 * .why =
 *   - the wish's headline: a clone is an addressable, reachable brain a cron/comms
 *     handler can hold a conversation with. one ping proves a byte lands; a 5-turn
 *     conversation proves the SESSION persists — turn 2's "another one" only makes
 *     sense if turn 1's context survived, and turn 5's question proves it is a real
 *     brain, not a joke-echo
 *   - real brain, no stub: `rule.forbid.acceptance.mocks` +
 *     `rule.forbid.faked-or-quarantined-acceptance` — acceptance proves the REAL
 *     external contract. an absent brain/credential FAILS LOUD (ConstraintError,
 *     exit 2), never a skip
 *   - LLM prose is nondeterministic, so each turn asks the brain to emit a
 *     deterministic MARKER line; `get` is polled for that marker, and only the
 *     brain-independent structure (the `delivered` tree) is snapshotted
 *
 * .note = the say `delivered` tree carries no brain prose, so it IS deterministic and
 *   snapshotted. the joke text is deliberately NOT snapshotted (it cannot be — a real
 *   brain never repeats itself); the marker match is the deterministic clamp instead.
 */

// each turn asks the brain to append this marker as its final line, so `get` can match
// the reply deterministically despite nondeterministic joke prose. one nonce per run so
// a stale transcript can never satisfy a later turn.
const NONCE = getUuid();
const markerFor = (turn: number): string => `JOKER-TURN-${turn}-${NONCE}`;

// a request that asks for a joke (or an answer) AND the deterministic trailing marker
const promptFor = (turn: number, ask: string): string =>
  `${ask} Then, on its own final line, output exactly this token and no other text after it: ${markerFor(
    turn,
  )}`;

describe('rhx clone — a 5-turn conversation with a real @:joker (real acceptance)', () => {
  given('[case1] a real claude enrolled as @:joker through a real pty', () => {
    const scene = useBeforeAll(async () => {
      // the loud gate — throws ConstraintError (exit 2) when the real brain or its
      // credentials are absent; this tier proves the integration or fails, never skips
      const { binDir } = getRealClaudeOrThrow();

      const dir = genTempDir({ slug: 'clone-joker' });
      setupEnrollFixture({ dir });

      // pre-accept claude's one-time first-run gates — the per-project trust prompt
      // AND (on a fresh ci host) the account-level setup screen. this is the state a
      // real user leaves behind after they clear both once; without it a real claude
      // hangs on a prompt with no keyboard behind the pty
      setRealClaudeFirstRunAccepted({ dir });

      // put the REAL claude first on PATH; do NOT override CLAUDE_CONFIG_DIR — the real
      // brain must find its real ~/.claude credentials
      const env = { PATH: `${binDir}${delimiter}${process.env.PATH ?? ''}` };

      // enroll the real claude as @:joker through the outer pty (so the socket stands up)
      const { bg, address, serial } = await enrollRealClaudeAndWaitReach({
        dir,
        env,
        as: '@:joker',
      });

      return { dir, env, bg, address, serial };
    });
    afterAll(async () => {
      await scene.bg.kill();
    });

    when('[t0] the joker is enrolled and live', () => {
      then('the clone appears LIVE in `clone list`, by its @:joker slug', () => {
        const listed = invokeRhachetCliBinary({
          args: ['clone', 'list'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        });
        expect(listed.status).toEqual(0);
        expect(listed.stdout).toContain('joker');
        expect(listed.stdout).toContain('LIVE');
      });

      then('the on-disk actor is a HASH actor, never a slug actor (two-grain split)', () => {
        const listedJson = invokeRhachetCliBinary({
          args: ['clone', 'list', '--output', 'json'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        });
        const parsed = JSON.parse(listedJson.stdout) as {
          actors: { hash: string; clones: { slug: string | null }[] }[];
        };
        // the clone wears the joker handle; the actor stays a bare content hash
        expect(parsed.actors[0]!.hash).toMatch(/^[0-9a-f]+$/);
        expect(parsed.actors[0]!.clones[0]!.slug).toEqual('joker');
      });
    });

    // .note = 🔴 every conversation turn dispatches UNFORCED, and that is the point of this
    //   suite. a real claude (v2.1.87) draws a CONTEXTUAL greyed placeholder suggestion into
    //   the empty box between turns (e.g. `Another joke?`), and until 2026-09-18 every turn
    //   here had to pass `force: true` to get past it: the feed rendered with
    //   `translateToString`, which drops SGR, so the classifier could not part that DIM
    //   suggestion from a human's typed text and — by its documented fail-safe (unsure →
    //   dirty, forceable) — withheld with `input-region-dirty`
    //
    //   the feed is now attribute-aware (genCloneScreenFeed.asBrightOnlyRow): an all-dim band
    //   reads `clear`, so the brain's own hint no longer presents as a human's work and the
    //   write proceeds on its own. a multi-turn conversation with a real claude therefore needs
    //   NO force at all
    //
    //   ⇒ so the absent `force` carries the proof here, and is never a tidy-up. it is step 3 of
    //   .dream/2026_09_16.classifier-greyed-placeholder-whitelist-color-blind.dream.md —
    //   "re-run the joker conversation WITHOUT force and assert it round-trips green" — and it
    //   is the only clamp that proves the cure against a REAL brain's own placeholder rather
    //   than an author-written fixture. re-add `force: true` here and this suite would pass
    //   whether or not the cure holds, which is exactly the blindness it used to have
    when('[t1] turn 1 — ask for a joke BY SLUG', () => {
      const turn = useThen('the joke request round-trips by slug', () =>
        sayAndPollForMarker({
          address: '@:joker',
          what: promptFor(1, 'Tell me a short one-line joke.'),
          marker: markerFor(1),
          dir: scene.dir,
          env: scene.env,
          getScreen: () => scene.bg.getOutput(),
        }),
      );

      then('the say reports a success verdict (exit 0)', () => {
        expect(turn.said.status).toEqual(0);
      });

      then('the joker`s reply lands, carrying turn-1`s marker', () => {
        expect(turn.landed).toBe(true);
        expect(turn.lastRead).toContain(markerFor(1));
      });

      then('the say tree names a SUCCESS verdict, addressed to this clone', () => {
        // ⚠️ a FULL-stdout snapshot was tried here and is wrong: the verdict READS brain
        // state, so a dispatch that races the brain's own turn renders `enqueued for` where
        // an idle one renders `said to` — both exit 0, both correct, and the two differ in
        // LINE COUNT. ⇒ the shapes are locked deterministically at the unit grain
        // (computeCloneSayReport.test.ts); this asserts the live branch-invariant properties
        expectCloneSaySuccessTree({
          stdout: turn.said.stdout,
          serial: scene.serial,
          // ⚠️ this turn dispatches BY SLUG, and `say` echoes the address the caller
          //   used — so the tree renders `@:joker`, never the serial
          slug: 'joker',
        });
      });

      then('the LIVE say head renders as snapped (masked vibecheck)', () => {
        // the complement to the assertion above: a human who reviews this PR sees the shape
        // a live pty + socket + subprocess actually put on stdout. the masker's own guard is
        // what FAILS on a broken envelope; this diff is what shows a reviewer WHAT changed
        expect(
          asCloneSayHeadSnapshotSafe({ stdout: turn.said.stdout }),
        ).toMatchSnapshot();
      });
    });

    when('[t2] turn 2 — "another one" BY SLUG (proves session continuity)', () => {
      // "another" only makes sense if turn 1 is still in context — this is the crux of a
      // conversation vs a stateless ping. the SAME live claude session must remember.
      const turn = useThen('a context-dependent follow-up round-trips', () =>
        sayAndPollForMarker({
          address: '@:joker',
          what: promptFor(
            2,
            'Ha! Tell me ANOTHER short one-line joke, on a different topic than before.',
          ),
          marker: markerFor(2),
          dir: scene.dir,
          env: scene.env,
          getScreen: () => scene.bg.getOutput(),
        }),
      );

      then('the follow-up is delivered and answered (continuity holds)', () => {
        expect(turn.said.status).toEqual(0);
        expect(turn.landed).toBe(true);
        expect(turn.lastRead).toContain(markerFor(2));
      });
    });

    when('[t3] turn 3 — one more, addressed BY SERIAL (address forms interchangeable)', () => {
      // mid-conversation, switch from @:joker to @:<serial>; it must reach the SAME clone
      const turn = useThen('the same clone answers by serial', () =>
        sayAndPollForMarker({
          address: `@:${scene.serial}`,
          what: promptFor(3, 'One more short one-line joke, please.'),
          marker: markerFor(3),
          dir: scene.dir,
          env: scene.env,
          getScreen: () => scene.bg.getOutput(),
        }),
      );

      then('the by-serial dispatch reaches the same joker and answers', () => {
        expect(turn.said.status).toEqual(0);
        expect(turn.landed).toBe(true);
        expect(turn.lastRead).toContain(markerFor(3));
      });
    });

    when('[t4] turn 4 — a joke request piped via `--what @stdin`', () => {
      const turn = useThen('a piped request round-trips like --what <m>', () =>
        sayAndPollForMarker({
          address: '@:joker',
          what: '', // ignored — the stdin path is taken
          stdin: promptFor(4, 'Tell me a short pun.'),
          marker: markerFor(4),
          dir: scene.dir,
          env: scene.env,
          getScreen: () => scene.bg.getOutput(),
        }),
      );

      then('the piped request is delivered and answered', () => {
        expect(turn.said.status).toEqual(0);
        // a success verdict, never `said to` alone — a live dispatch may race the brain's
        // own turn and land `enqueued for` (see [t1] above for the full rationale)
        expectCloneSaySuccessTree({
          stdout: turn.said.stdout,
          serial: scene.serial,
          // ⚠️ this turn dispatches BY SLUG, and `say` echoes the address the caller
          //   used — so the tree renders `@:joker`, never the serial
          slug: 'joker',
        });
        expect(turn.landed).toBe(true);
        expect(turn.lastRead).toContain(markerFor(4));
      });

      then('the LIVE say head renders as snapped (masked vibecheck)', () => {
        // `--what @stdin` is its own CALLER variant, so it owes its own masked snapshot —
        // the input channel must not reach the rendered envelope. this snapshot is the only
        // artifact that would catch a stdin-path-specific head (a dropped address echo, an
        // extra prefix); the [t1] snapshot proves naught about a path it never walks
        expect(
          asCloneSayHeadSnapshotSafe({ stdout: turn.said.stdout }),
        ).toMatchSnapshot();
      });
    });

    when('[t5] turn 5 — a QUESTION, not a joke (it is a real brain, not an echo)', () => {
      const turn = useThen('the joker answers a question', () =>
        sayAndPollForMarker({
          address: '@:joker',
          what: promptFor(5, 'In one sentence, what makes a joke funny?'),
          marker: markerFor(5),
          dir: scene.dir,
          env: scene.env,
          getScreen: () => scene.bg.getOutput(),
        }),
      );

      then('the question is delivered and answered', () => {
        expect(turn.said.status).toEqual(0);
        expect(turn.landed).toBe(true);
        expect(turn.lastRead).toContain(markerFor(5));
      });
    });

    when('[t6] the WHOLE 5-turn conversation is observable via `get --tail all`', () => {
      const reads = useThen('get --tail all carries every turn, --tail 1 bounds', () => {
        const all = invokeRhachetCliBinary({
          args: ['clone', 'get', '@:joker', '--output', 'json', '--tail', 'all'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        });
        const one = invokeRhachetCliBinary({
          args: ['clone', 'get', '@:joker', '--output', 'json', '--tail', '1'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        });
        return { all, one };
      });

      then('the full history carries ALL FIVE turn markers', () => {
        expect(reads.all.status).toEqual(0);
        const parsed = JSON.parse(reads.all.stdout) as {
          messages: { direction: 'in' | 'out'; text: string }[];
        };
        const whole = parsed.messages.map((m) => m.text).join('\n');
        for (let turn = 1; turn <= 5; turn++)
          expect(whole).toContain(markerFor(turn));
      });

      then('`--tail 1` reads no more than `--tail all` (the bound holds)', () => {
        const parsedAll = JSON.parse(reads.all.stdout) as {
          messages: { direction: 'in' | 'out'; text: string }[];
        };
        const parsedOne = JSON.parse(reads.one.stdout) as {
          messages: { direction: 'in' | 'out'; text: string }[];
        };
        expect(parsedOne.messages.length).toBeLessThanOrEqual(
          parsedAll.messages.length,
        );
      });
    });

    when('[t7] the joker names ITSELF via `clone whoami`', () => {
      const who = useThen('whoami from within the clone returns its own address', () =>
        invokeRhachetCliBinary({
          args: ['clone', 'whoami'],
          cwd: scene.dir,
          env: { ...scene.env, RHACHET_CLONE_SERIAL: scene.serial },
          logOnError: false,
        }),
      );

      then('whoami names this clone by its own @:joker slug + SHORT serial', () => {
        expect(who.status).toEqual(0);
        expect(who.stdout).toContain('joker');

        // the human tree carries the 8-hex form, the same one `clone list` renders
        // (`rule.require.short-serial-for-unslugged-clones`, via `asCloneAddressHuman`).
        // the canonical 36-char form is not lost — it stays on the `--output json` twin,
        // which `clone.acceptance` [t5] clamps; a lossy serial in a MACHINE channel would
        // be a defect, so the two channels are asserted apart rather than together
        expect(who.stdout).toContain(
          asCloneSerialHuman({ serial: scene.serial }),
        );
        expect(who.stdout).not.toContain(scene.serial);
      });
    });
  });
});
