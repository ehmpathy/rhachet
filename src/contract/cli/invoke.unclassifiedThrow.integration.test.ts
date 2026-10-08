import path from 'path';
import { given, then, useBeforeAll, when } from 'test-fns';

import { invokeRhachetCli } from '@src/.test/infra';
import { asSnapshotSafe } from '@src/.test/infra/asSnapshotSafe';

// .what = the rhachet repo root
// .why = the fixture config's registry readme uris are repo-relative, so the child
//   must run with cwd at the repo root for them to be found
const REPO_ROOT = path.resolve(__dirname, '../../..');

/**
 * .what = a config whose `getRoleRegistries` raises a PLAIN `Error` of its own
 * .why = it is a credential-free trigger for the defect under clamp: the throw is
 *   unclassified AND it is raised from `invoke`'s own body rather than from inside
 *   `program.parseAsync`
 *
 * 🔴 .note = the specimen is the fixture's own throw, never a production defect
 *   (`rule.require.clamp-edge-cases`).
 */
const CONFIG_PLAIN_THROW =
  'src/.test/example.use.repo/example.rhachet.use.plainThrow.ts';

/**
 * .what = a config whose registry list holds the same registry twice, so every role slug in
 *   it collides with itself
 * .why = `[case3]`'s specimen — a fault the contract CAN classify, on the same surface
 *   `[case1]` fails to classify on. the pair is what makes each case's verdict legible: one
 *   screen says `💥 MalfunctionError` at exit 1, the other `✋ ConstraintError` at exit 2,
 *   and both were raised from `invoke`'s body above `parseAsync`
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
 * .note = the repo root masks via the shared `asSnapshotSafe`; `:line:col` moves when an
 *   unrelated edit shifts a line, so it masks here
 */
const asFrameSnapshotSafe = (raw: string): string =>
  asSnapshotSafe({
    of: raw,
    masks: [{ path: REPO_ROOT, into: '/REPO_ROOT' }],
  }).replace(/:\d+:\d+/g, ':LINE:COL');

describe('invoke — an unclassified throw (integration)', () => {
  /**
   * .what = the end-to-end half of the clamp; `asCliErrorClassified.test.ts` holds the
   *   unit half. only a real spawn shows that the frame reaches STDERR and that the
   *   process exit code is the class's own rather than node's default.
   * .note = credential-free by construction — no brain, no network, no keyrack.
   */
  given('[case1] a config that raises a PLAIN Error, above the parse', () => {
    const result = useBeforeAll(async () =>
      invokeRhachetCli({
        args: [
          '--config',
          CONFIG_PLAIN_THROW,
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
         * 🟡 the paired positive. a frame that classified the fault but dropped what
         *   actually broke would trade one opaque report for another.
         */
        expect(result.stderr).toContain(
          'a fixture config refused to load, by design',
        );
      });

      then('the HINT names the THROW SITE as the repair', () => {
        /**
         * 🟡 the fix for an unclassified error is never "re-run it" — it is to raise a
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
         * .why = classification must never cost the trace — a cure that classified the
         *   error and dropped its trace would lose the one piece of evidence that names
         *   where the fault actually lives (`rule.forbid.failhide`).
         *
         * 🟡 asserted on `getRoleRegistries`, the frame that actually threw — never on
         *   the mere presence of the word `stack`, which an empty string would satisfy.
         */
        expect(result.stderr).toContain('"stack"');
        expect(result.stderr).toContain('getRoleRegistries');
      });

      then('NO bare node dump reaches the human', () => {
        /**
         * .why = every other row here asserts the presence of the classified frame; this
         *   one asserts the absence of a raw node dump — a render that ships the frame
         *   AND still lets the throw escape unclassified would satisfy every row but this.
         *
         * .note = `Node.js v` is node's own uncaught-exception banner, and the source line
         *   with its caret is what a dump raised through `tsx` prints. no rendered frame
         *   emits either. a `node:internal/` marker would match no line either way.
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
         * 🟡 paired, never alone: the snapshot alone would go green on ANY consistent
         *   output, including a regressed one, until a human read the diff. the pointwise
         *   rows carry the guarantees; this row carries the presentation.
         */
        expect(asFrameSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t1] the process exits', () => {
      then('the code is the CLASS OWN code, never node default', () => {
        /**
         * 🟡 `MalfunctionError.code.exit` is 1, and node's uncaught-exception default is
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
     * .what = the pass-through path — a classified error still renders correctly. the
     *   catch wraps the whole of `invoke`, not only `parseAsync`.
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
         * 🟡 the trailer is this handler's own context. a reader who reports a failure
         *   pastes this line, so its loss would be quiet and would only surface in a
         *   support thread.
         */
        expect(result.stderr).toContain(
          '[args] readme,--repo,nope,--role,nope',
        );
      });

      then('the WHOLE SCREEN holds its shape', () => {
        /**
         * 🟡 the pass-through path gets its own screen lock, because the two paths render
         *   through the SAME composer but with different layout around it — a snapshot of
         *   `[case1]` alone would not catch a drift that only the classified branch shows.
         */
        expect(asFrameSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case3] a DUPLICATE role.slug across two linked registries', () => {
    /**
     * .what = a duplicate role.slug across two linked registries raises a
     *   `ConstraintError` — the caller chose which registries to link, so the collision
     *   is theirs to settle (exit 2, `rule.require.exit-code-semantics`).
     * .note = same surface as `[case1]` — a config fault raised from `invoke`'s body
     *   above `parseAsync` — one specimen the contract cannot classify, one it can.
     */
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
        logOnError: false,
      }),
    );

    when('[t0] the cli renders the failure', () => {
      then('it is a CONSTRAINT — the caller chose these registries', () => {
        /**
         * 🚨 the inverse of `[case1]`'s first row, deliberately. a `MalfunctionError` here
         *   would tell the caller the server broke on a fault only THEY can settle.
         */
        expect(result.stderr).toContain('✋ ConstraintError:');
        expect(result.stderr).not.toContain('MalfunctionError');
      });

      then('it names WHICH slug, and WHICH two registries', () => {
        /**
         * 🟡 the fix is "unlink one, or rename the role" — and a caller can take neither
         *   move until they know which slug collided and which two registries claimed it.
         *   a message that named the fault alone would name a fix they cannot act on
         *   (`rule.require.errors-name-the-fix`).
         */
        expect(result.stderr).toContain('echoer');
        expect(result.stderr).toContain('slugRegistryFirst');
        expect(result.stderr).toContain('slugRegistrySecond');
      });

      then('the WHOLE SCREEN holds its shape', () => {
        expect(asFrameSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t1] the process exits', () => {
      then('the code is 2 — the caller fixes it, never the server', () => {
        /**
         * .note = an automation branches on this exit code.
         */
        expect(result.status).toEqual(2);
      });
    });
  });
});
