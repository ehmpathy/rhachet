import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import {
  asCloneSayHeadSnapshotSafe,
  expectCloneSaySuccessTree,
} from './enrollCloneHarness';

/**
 * .what = the two PURE `clone say` tree readers the realbrain suites lean on — the structural
 *   assertion and the snapshot masker
 *
 * 🚨 .why it is its own unit clamp = these two are the ONLY verification of a live say render,
 *   and both are exercised solely from acceptance suites that cost minutes and (for three of
 *   the five call sites) a real brain + a real token spend. so every branch of them ran at most
 *   once per gate, on whichever branch the brain happened to render — which is precisely the
 *   coin-flip property that made the OLD full-stdout snapshot flaky in the first place.
 *
 *   ⇒ a pure function whose branches are reachable only through a paid, nondeterministic
 *   pipeline is an unverified function. this puts every branch under a deterministic, sub-second
 *   clamp, so a defect in the READER cannot hide behind a brain that never took that branch.
 *
 * 🚨 .the measured defect this file caught = `expectCloneSaySuccessTree` shipped, for one edit,
 *   with `if (verdict === 'said to' && lines.length !== 1) throw`. that reads as an invariant and
 *   is not one: `said to` has FOUR renders, and three carry a degrade leaf (`feed faulted`,
 *   `feed not live`, `probe-blind`). so it would have reddened against a peer that is merely
 *   older than the read channel — a FALSE FAILURE on correct behavior, on a path no acceptance
 *   run reaches without an old peer to dispatch to. `[case2]` below is that row.
 *
 * ⚠️ it is a UNIT test, not an integration one: both subjects are pure string readers with no
 *   filesystem, socket, or process boundary (`rule.forbid.unit.remote-boundaries`). the module
 *   they live in performs no work at import.
 *
 * ⚠️ the DOGFOOD, with its reach stated (`rule.require.clamp-edge-cases`):
 *
 *   | mutation of the readers | this file |
 *   |---|---|
 *   | the `said to` check returns to `lines.length !== 1` | 🔴 1 red — `[case2]`, a legitimate degrade leaf reads as a defect |
 *   | the stray-tail filter is dropped | 🔴 1 red — `[case4]`, prose below the tree passes as a leaf |
 *   | the `enqueued for` leaf requirement is dropped | 🔴 1 red — `[case3]`, a hold ships with no caution |
 *   | the address check is dropped | 🔴 2 red — `[case5]` + `[case8]`, a tree that names ANOTHER clone passes |
 *   | the masker's guard is dropped | 🔴 red — `[case6]`/`[case7]`, a failure render is masked into a lie |
 *   | all restored | 🟢 green |
 */
describe('clone say tree readers', () => {
  // the exact head + leaf shapes `computeCloneSayReport` renders, copied from its own
  // snapshot so a drift between the renderer and these readers surfaces as a red here
  const HEAD_RELEASED = '😶🎙️ said to @:1a2b3c4d';
  const HEAD_ENQUEUED = '😶🎙️ enqueued for @:busy — mid-turn; lands next';
  const LEAF_HOLD =
    '   └─ 🟡 held behind the active turn, not yet taken — if that turn is aborted (ctrl-C, crash, prune) the hold dies with it, unsent';
  const LEAF_PROBE_BLIND =
    '   └─ 🟡 probe-blind (older clone) — verified by transcript; re-enroll for the full read';

  const SERIAL = '1a2b3c4d-1111-2222-3333-444455556666';

  given('[case1] a bare `said to` render — the extant happy path (V13)', () => {
    when('[t0] it is read', () => {
      then('the structural assertion admits it', () => {
        expectCloneSaySuccessTree({
          stdout: `${HEAD_RELEASED}\n`,
          serial: SERIAL,
        });
      });

      then('the masker yields the invariant envelope', () => {
        expect(
          asCloneSayHeadSnapshotSafe({ stdout: `${HEAD_RELEASED}\n` }),
        ).toEqual('😶🎙️ <verdict> @:<address>');
      });
    });
  });

  /**
   * 🚨 the row the file exists for. a `said to` WITH a degrade leaf is correct behavior — the
   *   peer is probe-blind, so the verdict came from the transcript and the leaf says so. a
   *   reader that demanded exactly one line would fail this, and no acceptance run would ever
   *   show it, because the suites dispatch to peers built from the current binary
   */
  given('[case2] a `said to` render WITH a degrade leaf — an older peer', () => {
    const stdout = `${HEAD_RELEASED}\n${LEAF_PROBE_BLIND}\n`;

    when('[t0] it is read', () => {
      then(
        'the structural assertion admits it — a degrade is not a defect',
        () => {
          expectCloneSaySuccessTree({ stdout, serial: SERIAL });
        },
      );

      then('the masker yields the SAME envelope as the bare render', () => {
        // the single-key property the no-`--ci` runner depends on: both `said to` shapes must
        // mask to one string, else the second shape mints its own snapshot and self-certifies
        expect(asCloneSayHeadSnapshotSafe({ stdout })).toEqual(
          asCloneSayHeadSnapshotSafe({ stdout: `${HEAD_RELEASED}\n` }),
        );
      });
    });
  });

  given('[case3] an `enqueued for` render — the hold branch', () => {
    when('[t0] the full render is read', () => {
      then('the structural assertion admits it', () => {
        expectCloneSaySuccessTree({
          stdout: `${HEAD_ENQUEUED}\n${LEAF_HOLD}\n`,
          serial: SERIAL,
          slug: 'busy',
        });
      });

      then('it masks to the SAME envelope as every other success render', () => {
        expect(
          asCloneSayHeadSnapshotSafe({
            stdout: `${HEAD_ENQUEUED}\n${LEAF_HOLD}\n`,
          }),
        ).toEqual('😶🎙️ <verdict> @:<address>');
      });
    });

    when('[t1] the hold-caution LEAF is absent', () => {
      then(
        'it is refused — a hold that names no abort risk misleads a retry',
        () => {
          const error = getError(() =>
            expectCloneSaySuccessTree({
              stdout: `${HEAD_ENQUEUED}\n`,
              serial: SERIAL,
              slug: 'busy',
            }),
          );
          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.message).toContain('no hold-caution leaf');
        },
      );
    });

    when('[t2] the head carries no detail suffix', () => {
      then('it is refused — a hold must state why it is held', () => {
        const error = getError(() =>
          expectCloneSaySuccessTree({
            stdout: `😶🎙️ enqueued for @:busy\n${LEAF_HOLD}\n`,
            serial: SERIAL,
            slug: 'busy',
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('no detail suffix');
      });
    });
  });

  given('[case4] a tail that is NOT a leaf', () => {
    when('[t0] stray prose follows the tree', () => {
      then('it is refused — a success tree carries leaves, never prose', () => {
        const error = getError(() =>
          expectCloneSaySuccessTree({
            stdout: `${HEAD_RELEASED}\nstray prose here\n`,
            serial: SERIAL,
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('not a `└─ 🟡` leaf');
      });
    });

    when('[t1] two leaves are rendered', () => {
      then('it is refused — a success render carries at most one', () => {
        const error = getError(() =>
          expectCloneSaySuccessTree({
            stdout: `${HEAD_RELEASED}\n${LEAF_PROBE_BLIND}\n${LEAF_HOLD}\n`,
            serial: SERIAL,
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('more than one leaf');
      });
    });
  });

  given('[case5] a success tree that names a DIFFERENT clone', () => {
    when('[t0] it is read against this clone`s serial', () => {
      then(
        'it is refused — the address must belong to the dispatch target',
        () => {
          const error = getError(() =>
            expectCloneSaySuccessTree({
              stdout: '😶🎙️ said to @:9f9f9f9f\n',
              serial: SERIAL,
            }),
          );
          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.message).toContain('DIFFERENT clone');
        },
      );
    });
  });

  given('[case6] a NON-success verdict render', () => {
    // the four refusal verdicts render on stderr with their own trees; none may pass here
    const stdout = '😶🎙️ buffered for @:1a2b3c4d\n';

    when('[t0] the structural assertion reads it', () => {
      then('it is refused — neither success verdict is named', () => {
        const error = getError(() =>
          expectCloneSaySuccessTree({ stdout, serial: SERIAL }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('neither success verdict');
      });
    });

    when('[t1] the MASKER reads it', () => {
      then(
        'it THROWS rather than mask — a masked lie would snap as a pass',
        () => {
          const error = getError(() => asCloneSayHeadSnapshotSafe({ stdout }));
          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.message).toContain('no safe mask applies');
        },
      );
    });
  });

  given('[case7] a render the masker must never silently accept', () => {
    when('[t0] stdout is empty', () => {
      then('it throws', () => {
        expect(
          getError(() => asCloneSayHeadSnapshotSafe({ stdout: '' })),
        ).toBeInstanceOf(ConstraintError);
      });
    });

    when('[t1] a blank line precedes the tree', () => {
      then(
        'it throws — the head is the FIRST line, never the first nonempty one',
        () => {
          // a stray newline before the tree is a real render defect
          // (`rule.forbid.snapshot-visual-blemishes`), so the masker must not paper over it
          // by a search for the head further down
          expect(
            getError(() =>
              asCloneSayHeadSnapshotSafe({ stdout: `\n${HEAD_RELEASED}\n` }),
            ),
          ).toBeInstanceOf(ConstraintError);
        },
      );
    });

    when('[t2] the glyph pair is swapped', () => {
      then('it throws', () => {
        expect(
          getError(() =>
            asCloneSayHeadSnapshotSafe({
              stdout: '🎙️😶 said to @:1a2b3c4d\n',
            }),
          ),
        ).toBeInstanceOf(ConstraintError);
      });
    });

    when('[t3] the `@:` sigil is absent', () => {
      then('it throws', () => {
        expect(
          getError(() =>
            asCloneSayHeadSnapshotSafe({ stdout: '😶🎙️ said to 1a2b3c4d\n' }),
          ),
        ).toBeInstanceOf(ConstraintError);
      });
    });
  });

  /**
   * 🚨 the second defect this file caught, and the more expensive one: `asSnapshotSafe` runs
   *   BEFORE the mask and rewrites a serial address to `@:__SERIAL__` / `@:__SERIAL8__`. the
   *   masker's guard was written with a `[0-9a-z-]+` address class, which those forms fail on
   *   their underscores and caps — so it THREW against every serial-addressed dispatch, which is
   *   both real-brain say suites (`clone.realbrain`, `clone.saybulk-probe`). the slug-addressed
   *   sites passed, so a run of only those reported green.
   *
   * ⇒ the cost avoided: those two suites each need a real claude boot + a token spend, so the
   *   defect would have surfaced minutes and dollars later, once per gate.
   */
  given('[case9] an address in each form `asSnapshotSafe` can produce', () => {
    // the three real post-mask forms: a full uuid, an 8-hex short address, a slug
    const ADDRESSES = ['__SERIAL__', '__SERIAL8__', 'joker'];

    when('[t0] each is masked', () => {
      then('all three yield the ONE invariant envelope', () => {
        for (const address of ADDRESSES)
          expect({
            address,
            masked: asCloneSayHeadSnapshotSafe({
              stdout: `😶🎙️ said to @:${address}\n`,
            }),
          }).toEqual({ address, masked: '😶🎙️ <verdict> @:<address>' });
      });
    });
  });

  given('[case8] a slug-addressed render', () => {
    when('[t0] the clone was dispatched to BY SLUG', () => {
      then('the slug satisfies the address check', () => {
        expectCloneSaySuccessTree({
          stdout: '😶🎙️ said to @:joker\n',
          serial: SERIAL,
          slug: 'joker',
        });
      });

      then('a serial-only read refuses it — the reason `slug` exists', () => {
        const error = getError(() =>
          expectCloneSaySuccessTree({
            stdout: '😶🎙️ said to @:joker\n',
            serial: SERIAL,
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('DIFFERENT clone');
      });
    });
  });
});
