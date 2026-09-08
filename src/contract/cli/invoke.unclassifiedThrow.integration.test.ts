import path from 'path';
import { given, then, useBeforeAll, when } from 'test-fns';

import { invokeRhachetCli } from '@src/.test/infra';

// .what = the rhachet repo root
// .why = the fixture config's registry readme uris are repo-relative, so the child
//   must run with cwd at the repo root for them to be found
const REPO_ROOT = path.resolve(__dirname, '../../..');

/**
 * .what = a config whose registry list holds the same registry twice, so
 *   `assureUniqueRoles` raises a duplicate-slug fault
 * .why = it is the repo's one credential-free trigger for the defect under clamp: the
 *   throw is a PLAIN `Error` (unclassified) AND it is raised from `invoke`'s own body
 *   rather than from inside `program.parseAsync` (the path the old catch never covered)
 */
const CONFIG_DUPLICATE_ROLES =
  'src/.test/example.use.repo/example.rhachet.use.duplicateRoles.ts';

/**
 * .what = strips the two spans of a rendered frame that differ per host, so the WHOLE
 *   screen can be locked rather than sampled point by point
 * .why = `invoke` composes its own layout ON TOP of the shared `asCliErrorFrame` — a loop
 *   over the frame lines, an `[args]` trailer, a blank line — and pointwise `toContain`
 *   cannot see a stray row, a bad indent, or a trailer in the wrong place. the peer call
 *   site (`withCliOutputErrors.integration.test.ts` `[case2]`) already locks its screen for
 *   exactly this reason (`rule.forbid.snapshot-visual-blemishes`)
 * .note = local by design. `blackbox/.test/infra/asSnapshotSafe.ts` does the same job one
 *   tier out, and a `src/` test that imported it would invert the tree's dependency
 *   direction (`rule.require.directional-deps`)
 * .note = the two spans:
 *     · the repo root — absolute, so it differs on every host and in ci
 *     · `:line:col` — a stack cite that moves when an unrelated edit shifts a line
 */
const asFrameSnapshotSafe = (raw: string): string =>
  raw
    .split(REPO_ROOT)
    .join('/REPO_ROOT')
    .replace(/:\d+:\d+/g, ':LINE:COL');

describe('invoke — an unclassified throw (integration)', () => {
  /**
   * 🚨 .why this suite exists = past `invoke`'s catch sits node's own uncaught-exception
   *   dump, and until 2026-09-06 every error our contract had not classified landed
   *   there. what a human got was a raw stack — no glyph, no class verdict, no hint, and
   *   an exit code node chose rather than one we judged. that is
   *   `rule.require.errors-name-the-fix` inverted at the one layer with no next handler.
   *
   * ⚠️ this is the END-TO-END half of the clamp; `asCliErrorClassified.test.ts` holds the
   *   unit half. both are owed, because the unit rows cannot see the two facts that only a
   *   real spawn settles: that the frame reaches STDERR, and that the PROCESS exit code is
   *   the class's own rather than node's default (`rule.require.clamp-edge-cases`).
   *
   * ✅ and it is credential-free by construction — no brain, no network, no keyrack. an
   *   acceptance-tier clamp for this would be SSO-gated, which is why the trigger was
   *   chosen to sit inside a config fixture instead.
   */
  given('[case1] a config that raises a PLAIN Error, above the parse', () => {
    const result = useBeforeAll(async () =>
      invokeRhachetCli({
        args: [
          '--config',
          CONFIG_DUPLICATE_ROLES,
          'readme',
          '--repo',
          'echo',
          '--role',
          'echoer',
        ],
        cwd: REPO_ROOT,
        // .note = the run FAILS by design, so the harness's failure dump would be noise
        logOnError: false,
      }),
    );

    when('[t0] the cli renders the failure', () => {
      then(
        'it is CLASSIFIED — a glyph and a class verdict lead the frame',
        () => {
          /**
           * 🚨 the class is the greppable caller-vs-server signal, and the glyph is its
           *   at-a-glance twin. `💥 MalfunctionError` says ours-to-repair, which is the
           *   honest read of an error our own contract failed to classify — no input a
           *   human types should be able to produce one.
           */
          expect(result.stderr).toContain('💥 MalfunctionError:');
        },
      );

      then('the SYMPTOM survives the wrap, word for word', () => {
        /**
         * ⚠️ the paired positive. a frame that classified the fault but dropped what
         *   actually broke would trade one opaque report for another.
         */
        expect(result.stderr).toContain('duplicate role.slug "echoer"');
      });

      then('the HINT names the THROW SITE as the repair', () => {
        /**
         * ⚠️ the fix for an unclassified error is never "re-run it" — it is to raise a
         *   classified error where it was raised. this is the row that holds acceptance
         *   #3's bar on THIS surface: the message names a fix that works.
         */
        expect(result.stderr).toContain('THROW SITE');
      });

      then(
        'the ORIGINAL class survives as `cause` — the diagnosis is kept',
        () => {
          /**
           * 🚨 the top-line class is now the VERDICT, so the class actually raised has to
           *   survive somewhere or the wrap would cost a diagnosis to buy a classification.
           */
          expect(result.stderr).toContain('"cause"');
          expect(result.stderr).toContain('"class": "Error"');
        },
      );

      then('the STACK survives, and still names the frame that threw', () => {
        /**
         * 🚨 this is the row that makes the change a non-failhide. the old behavior's ONE
         *   virtue was that a stack reached the screen; a cure that classified the error
         *   and dropped its trace would retire the escape and the evidence together
         *   (`rule.forbid.failhide`).
         *
         * ⚠️ asserted on `assureUniqueRoles`, the frame that actually threw — never on
         *   the mere presence of the word `stack`, which an empty string would satisfy.
         */
        expect(result.stderr).toContain('"stack"');
        expect(result.stderr).toContain('assureUniqueRoles');
      });

      then('NO bare node dump reaches the human', () => {
        /**
         * 🚨 the sharpest row in the file: it asserts the ABSENCE of the old behavior,
         *   where every other row asserts the presence of the new one. a fix that
         *   rendered the frame AND still let the throw escape would satisfy all of them
         *   but this.
         *
         * 🚨 .why `Node.js v` and the caret frame, and NOT `node:internal/` = those were
         *   the first markers tried and they have NO TEETH here. the clamp was dogfooted
         *   under a mutation that restored the escape, and it stayed GREEN: a dump raised
         *   through `tsx` prints the SOURCE frame (`assureUniqueRoles.ts:11` + the
         *   offending line + a `^` caret), never a `node:internal/` path, so the marker
         *   matched no line either way.
         *
         *   ⇒ these two ARE measured. the mutation's real output ends
         *   `…at async withEmojiSpaceShim (…)` then `Node.js v22.21.0`, which is node's
         *   own uncaught-exception banner and the one line no rendered frame emits
         *   (`rule.require.clamp-edge-cases`: a clamp with no teeth is a claim that looks
         *   like a proof).
         */
        expect(result.stderr).not.toContain('Node.js v');
        expect(result.stderr).not.toContain('throw new Error(');
      });

      then('the WHOLE SCREEN holds its shape', () => {
        /**
         * 🚨 every row above samples ONE token. none of them can see the layout `invoke`
         *   adds around the shared composer — a stray line, a lost indent, a trailer that
         *   drifted above the frame instead of below it. the snapshot is the only row here
         *   that grades what a human actually sees
         *   (`rule.forbid.snapshot-visual-blemishes`).
         *
         * ⚠️ paired, never alone: the snapshot alone would go green on ANY consistent
         *   output, including a regressed one, until a human read the diff. the pointwise
         *   rows carry the guarantees; this row carries the presentation.
         */
        expect(asFrameSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t1] the process exits', () => {
      then('the code is the CLASS OWN code, never node default', () => {
        /**
         * ⚠️ `MalfunctionError.code.exit` is 1, and node's uncaught-exception default is
         *   also 1 — so this row is deliberately NOT the whole proof of the fix, and it
         *   is stated as such rather than leaned on. the rows above carry that weight;
         *   this one bounds the contract so a later class change cannot silently drift
         *   the code an automation branches on.
         */
        expect(result.status).toEqual(1);
      });
    });
  });

  given('[case2] a CLASSIFIED failure, on the same surface', () => {
    /**
     * ⚠️ the unregression half. the repair moved the catch from `parseAsync` up to the
     *   whole of `invoke` AND retired its `instanceof` gate, so the path that already
     *   worked has to be shown still working — otherwise a green `[case1]` proves only
     *   that the new branch runs, never that it did not eat the old one.
     */
    const result = useBeforeAll(async () =>
      invokeRhachetCli({
        args: ['readme', '--repo', 'nope', '--role', 'nope'],
        cwd: REPO_ROOT,
        logOnError: false,
      }),
    );

    when('[t0] the cli renders the failure', () => {
      then(
        'the THROWER own class is rendered, never re-wrapped as ours',
        () => {
          /**
           * 🚨 a re-wrap here would be the defect in reverse: it would bury a fault the
           *   caller CAN amend inside a verdict that says they cannot. so this row holds
           *   the classifier's pass-through as a guarantee rather than an implementation
           *   detail.
           */
          expect(result.stderr).not.toContain('MalfunctionError');
          expect(result.stderr).toContain('explicit config required');
        },
      );

      then('the `[args]` trailer still rides along', () => {
        /**
         * ⚠️ the trailer is this handler's own context, and it moved file with the catch.
         *   a reader who reports a failure pastes this line, so its loss would be quiet
         *   and would only surface in a support thread.
         */
        expect(result.stderr).toContain(
          '[args] readme,--repo,nope,--role,nope',
        );
      });

      then('the WHOLE SCREEN holds its shape', () => {
        /**
         * ⚠️ the pass-through path gets its own screen lock, because the two paths render
         *   through the SAME composer but with different layout around it — a snapshot of
         *   `[case1]` alone would not catch a drift that only the classified branch shows.
         */
        expect(asFrameSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });
});
