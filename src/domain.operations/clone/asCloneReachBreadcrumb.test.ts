import { given, then, when } from 'test-fns';

import { asCloneReachBreadcrumb } from './asCloneReachBreadcrumb';

/**
 * .what = the crumb's rows, addressed by NAME — its root, and each branch by the command
 *   that branch carries
 * .why = `const [, lineSay, lineGet] = crumb.split('\n')` states "row 2 is the say" as a
 *   positional decode every reader must simulate, in five places
 *   (`rule.forbid.inline-decode-friction`). named, each row says which one it is.
 *
 * ⚠️ the branches are found by their COMMAND rather than by their GLYPH — the same reason
 *   `asCloneReachBreadcrumbFromOutput` records: the glyph is decoration and the command is
 *   the capability, so a purely visual change must not redden a row about the reach.
 *
 * ⚠️ `say` is NULLABLE by contract, never by defensiveness — a deaf clone emits no say
 *   branch at all, and `[case5]` asserts exactly that absence.
 *
 * 🚨 this reader is deliberately NOT used by the branch-ORDER row below. that row's whole
 *   subject IS the position, so a find-by-command read would have answered a nitpick by
 *   deletion of the one clamp that catches a swap.
 */
const asCrumbRows = (input: {
  slug: string | null;
  serial: string;
  reachable: boolean;
}): { root: string; say: string | null; get: string | null } => {
  const [root, ...branches] = asCloneReachBreadcrumb(input).split('\n');
  return {
    root: root!,
    say: branches.find((row) => row.includes('rhx clone say')) ?? null,
    get: branches.find((row) => row.includes('rhx clone get')) ?? null,
  };
};

describe('asCloneReachBreadcrumb', () => {
  given('[case1] a NAMED clone, addressed by its slug', () => {
    when('[t0] the breadcrumb is composed', () => {
      then('the exact text is locked, treestruct and all', () => {
        // the exact text is clamped so the one human-faced success line cannot drift
        // silently — the same guarantee `asCloneAccrualWarnLine` holds for the advisory
        expect(
          asCloneReachBreadcrumb({
            slug: 'super',
            serial: '7f3a1b2c-4d5e-6f70-8a9b-0c1d2e3f4a5b',
            reachable: true,
          }),
        ).toEqual(
          [
            '😶 clone enrolled',
            '   ├─ 🎙️ rhx clone say @:super --what "…"',
            '   └─ 🎧 rhx clone get @:super --tail 50',
          ].join('\n'),
        );
      });

      then(
        'the slug WINS — the serial appears in no form, long or short',
        () => {
          /**
           * 🚨 asserted as an ABSENCE OF BOTH forms, never of the full uuid alone. a
           *   naive clamp on the 36-char serial would pass even if the line leaked the
           *   8-hex prefix, since the prefix is a different string. the two-part assert
           *   is what makes this row catch a slug/serial precedence slip either way.
           */
          const line = asCloneReachBreadcrumb({
            slug: 'super',
            serial: '7f3a1b2c-4d5e-6f70-8a9b-0c1d2e3f4a5b',
            reachable: true,
          });
          expect(line).not.toContain('7f3a1b2c-4d5e-6f70-8a9b-0c1d2e3f4a5b');
          expect(line).not.toContain('7f3a1b2c');
        },
      );

      then('the ROOT states the outcome, with no reach detail on it', () => {
        /**
         * 🚨 .why this row exists = the shape carries the 2026-09-06 verdict. the line's
         *   job is CONFIRMATION, and only a root that names the outcome can hold it. a
         *   collapse back to one line would state the reach alone — the disclosure read
         *   the verdict retired — and no exact-text row would catch that as a REGRESSION
         *   rather than as a reworded line.
         */
        const { root } = asCrumbRows({
          slug: 'super',
          serial: '7f3a1b2c-4d5e-6f70-8a9b-0c1d2e3f4a5b',
          reachable: true,
        });
        expect(root).toEqual('😶 clone enrolled');
        expect(root).not.toContain('rhx clone');
      });
    });
  });

  given('[case2] the reach loop the branches must name', () => {
    when('[t0] the breadcrumb is composed', () => {
      then('BOTH halves are named — speak to it, and hear it back', () => {
        /**
         * 🚨 .why both = a `say` alone is HALF a loop. `clone say` dispatches and
         *   returns; the reply lands in the clone's transcript rather than on the
         *   dispatcher's screen. so a human handed the say alone can speak and cannot
         *   hear — a second dead end on the path this breadcrumb exists to open.
         *
         * ⚠️ asserted as the two COMMANDS rather than as the two glyphs, so a change to
         *   the decoration cannot redden a row about the capability.
         */
        const line = asCloneReachBreadcrumb({
          slug: 'super',
          serial: '7f3a1b2c-4d5e-6f70-8a9b-0c1d2e3f4a5b',
          reachable: true,
        });
        expect(line).toContain('rhx clone say @:super');
        expect(line).toContain('rhx clone get @:super');
      });

      then('the glyphs are the pair the two commands already emit', () => {
        /**
         * ⚠️ `🎙️`/`🎧` are settled on `invokeCloneSay` and `asCloneConversationText`.
         *   a fresh coinage here would be glyph-synonym drift, and the human who runs
         *   either command would meet a glyph this line never promised. the pair also
         *   carries DIRECTION — mic in, headphones out — which is what makes the two
         *   rows read as ONE loop.
         */
        const { say, get } = asCrumbRows({
          slug: 'super',
          serial: '7f3a1b2c-4d5e-6f70-8a9b-0c1d2e3f4a5b',
          reachable: true,
        });
        expect(say).toContain('🎙️');
        expect(get).toContain('🎧');
      });

      then(
        'each branch is a GLYPH then the bare command — no word label',
        () => {
          /**
           * 🚨 the command IS the label. a `say:` in front of `rhx clone say` states the
           *   same word twice, six characters apart; a `hear:` in front of `rhx clone get`
           *   states a word the command does not use. the glyph carries the DIRECTION and
           *   the command carries the VERB, with no overlap
           *   (rule.require.brevity, rule.forbid.rambles).
           *
           * ⚠️ every label pair weighed failed on its own ground — `talk` is already the
           *   settled name for the two-way conversation, `see` disagrees with `🎧` and
           *   reads as a verb that does not exist. this row is what stops a fourth attempt
           *   from re-opening a vacancy that was never real.
           */
          const { say, get } = asCrumbRows({
            slug: 'super',
            serial: '7f3a1b2c-4d5e-6f70-8a9b-0c1d2e3f4a5b',
            reachable: true,
          });
          expect(say).toEqual('   ├─ 🎙️ rhx clone say @:super --what "…"');
          expect(get).toEqual('   └─ 🎧 rhx clone get @:super --tail 50');
        },
      );

      then('the branch ORDER is speak-then-hear, never the reverse', () => {
        /**
         * ⚠️ the order is the loop's own order, so it is a guarantee rather than a
         *   preference: a human reads top-down and does these two acts in exactly that
         *   sequence. the exact-text row above would survive a swap only by accident of
         *   its own text; this row states the reason a swap is wrong.
         *
         * 🚨 this is the ONE row that keeps a POSITIONAL read, and it must. its whole
         *   subject is which row comes first, so `asCrumbRows`'s find-by-command read
         *   would answer either way and this clamp would lose its teeth — a nitpick
         *   answered by the deletion of a guarantee is a worse trade than the nitpick.
         */
        const [, lineSecond, lineThird] = asCloneReachBreadcrumb({
          slug: 'super',
          serial: '7f3a1b2c-4d5e-6f70-8a9b-0c1d2e3f4a5b',
          reachable: true,
        }).split('\n');
        expect(lineSecond).toContain('rhx clone say');
        expect(lineThird).toContain('rhx clone get');
      });
    });
  });

  given('[case3] a BARE enroll, addressed by its serial', () => {
    when('[t0] the breadcrumb is composed', () => {
      then('the SHORT serial is shown — the typable form, not the uuid', () => {
        /**
         * 🚨 .why the short form = the address a human is handed must be the address a
         *   human can type. `clone list` already renders this 8-hex prefix
         *   (`asCloneSerialHuman`) and `getOneCloneByRef` resolves any hex body of 4+
         *   chars back to the clone — so the full uuid was the ONE render that
         *   disagreed with both its neighbours, while it bought no extra reach.
         */
        expect(
          asCloneReachBreadcrumb({
            slug: null,
            serial: '7f3a1b2c-4d5e-6f70-8a9b-0c1d2e3f4a5b',
            reachable: true,
          }),
        ).toEqual(
          [
            '😶 clone enrolled',
            '   ├─ 🎙️ rhx clone say @:7f3a1b2c --what "…"',
            '   └─ 🎧 rhx clone get @:7f3a1b2c --tail 50',
          ].join('\n'),
        );
      });

      then('the FULL uuid never reaches the screen', () => {
        /**
         * ⚠️ the paired negative. the exact-text row above would also pass if the value
         *   somehow rendered BOTH forms; this row bounds it. the tail segments are the
         *   part a human would have had to copy, and they are what the abbreviation
         *   exists to spare them.
         */
        const line = asCloneReachBreadcrumb({
          slug: null,
          serial: '7f3a1b2c-4d5e-6f70-8a9b-0c1d2e3f4a5b',
          reachable: true,
        });
        expect(line).not.toContain('4d5e-6f70-8a9b-0c1d2e3f4a5b');
      });

      then('BOTH branches carry the same address, never one of each', () => {
        /**
         * 🚨 the two rows are two views of ONE clone, so a split address would hand a
         *   human a say that reaches one clone and a get that reads another. the
         *   abbreviation is computed once for that reason, and this row is what holds
         *   the single-computation guarantee.
         */
        const line = asCloneReachBreadcrumb({
          slug: null,
          serial: '7f3a1b2c-4d5e-6f70-8a9b-0c1d2e3f4a5b',
          reachable: true,
        });
        expect(line).toContain('rhx clone say @:7f3a1b2c --what');
        expect(line).toContain('rhx clone get @:7f3a1b2c --tail');
      });
    });
  });

  given('[case4] the value a caller pads', () => {
    when('[t0] the breadcrumb is composed', () => {
      then('it carries no blank line of its own, at either end', () => {
        /**
         * ⚠️ the pad is the emit's, never this value's. were it baked in here, every
         * exact-text clamp would assert the spare lines too — so a later change to the
         * vertical rhythm would redden a row about CONTENT, and the two concerns would
         * stop to be separable.
         */
        const line = asCloneReachBreadcrumb({
          slug: 'super',
          serial: '7f3a1b2c-4d5e-6f70-8a9b-0c1d2e3f4a5b',
          reachable: true,
        });
        expect(line.startsWith('😶')).toEqual(true);
        expect(line.endsWith('--tail 50')).toEqual(true);
      });
    });
  });

  given('[case5] a DEAF clone — enrolled, but with no dispatch socket', () => {
    when('[t0] the breadcrumb is composed', () => {
      then('the `say` is ABSENT — the command it cannot honor', () => {
        /**
         * 🚨 .why this is the sharpest row in the file = the line used to print the say
         *   unconditionally, so a `--no-socket` enroll (or any enroll that stood up no
         *   socket) confirmed success and then named a next move that fails. the human
         *   followed the instruction and met a DEAF refusal.
         *
         *   ⇒ that is the SAME shape the whole wish exists to retire — a confident
         *   message that names a fix which does not work — recurred one layer up from the
         *   node-pty error. raised as a blocker by the `r010` lane at i075.
         */
        const line = asCloneReachBreadcrumb({
          slug: 'super',
          serial: '7f3a1b2c-4d5e-6f70-8a9b-0c1d2e3f4a5b',
          reachable: false,
        });
        expect(line).not.toContain('rhx clone say');
        expect(line).not.toContain('🎙️');
      });

      then('the `get` REMAINS — a deaf clone is still observable', () => {
        /**
         * ⚠️ the asymmetry is the domain's, never a hedge. `CloneUnreachableCause.DEAF`
         *   is defined as *"can't hear a say, but `get` still observes it"* — so to drop
         *   both branches would understate what the human can still do, and would make
         *   the deaf render a dead end of its own.
         */
        const line = asCloneReachBreadcrumb({
          slug: 'super',
          serial: '7f3a1b2c-4d5e-6f70-8a9b-0c1d2e3f4a5b',
          reachable: false,
        });
        expect(line).toContain('🎧 rhx clone get @:super --tail 50');
      });

      then('the exact deaf text is locked, cause and all', () => {
        /**
         * ⚠️ the ROOT carries the cause. a reader who sees one branch where the reachable
         *   render has two needs to know WHY the say is absent, and a fourth row that
         *   explains an absent row would be a row about the output rather than about the
         *   clone (rule.require.brevity).
         */
        expect(
          asCloneReachBreadcrumb({
            slug: null,
            serial: '7f3a1b2c-4d5e-6f70-8a9b-0c1d2e3f4a5b',
            reachable: false,
          }),
        ).toEqual(
          [
            '😶 clone enrolled — deaf, so it cannot hear a `say`',
            '   └─ 🎧 rhx clone get @:7f3a1b2c --tail 50',
          ].join('\n'),
        );
      });

      then('it still CONFIRMS — the clone did enroll', () => {
        /**
         * 🚨 the 2026-09-06 verdict holds on this path too: the line's job is
         *   confirmation, and a deaf clone stood up just as surely as a reachable one. to
         *   emit no line at all would restore the silence that verdict retired, and would
         *   read to a human as an enroll that failed.
         */
        const { root } = asCrumbRows({
          slug: 'super',
          serial: '7f3a1b2c-4d5e-6f70-8a9b-0c1d2e3f4a5b',
          reachable: false,
        });
        expect(root).toContain('clone enrolled');
      });
    });
  });
});
