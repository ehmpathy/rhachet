import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { asCliErrorClassified } from './asCliErrorClassified';
import { asCliErrorGlyph } from './asCliErrorGlyph';
import { getExitCodeFromError } from './getExitCodeFromError';

/**
 * .what = pins the glyph each error class renders under, so the human channel carries
 *   the same verdict the exit code does
 * .why = the two classes name OPPOSITE parties. under one hardcoded glyph they read
 *   identically on screen, and an assertion written against that glyph is trivially
 *   true for both — so it can never redden on a misclassified row. the glyph must
 *   DIFFER for the screen to carry the distinction at all
 */
describe('asCliErrorGlyph', () => {
  given('[case1] a MalfunctionError — ours to repair', () => {
    when('[t0] the glyph is read', () => {
      then('it is 💥', () => {
        expect(
          asCliErrorGlyph({ error: new MalfunctionError('boom') }),
        ).toEqual('💥');
      });
    });
  });

  given('[case2] a ConstraintError — the caller`s to amend', () => {
    when('[t0] the glyph is read', () => {
      then('it is ✋', () => {
        expect(asCliErrorGlyph({ error: new ConstraintError('nope') })).toEqual(
          '✋',
        );
      });
    });
  });

  given('[case3] both classes at once', () => {
    when('[t0] their glyphs are compared', () => {
      then('they DIFFER — the property the whole class split rests on', () => {
        // 🚨 the decisive row. the two above would both stay green under a hardcoded
        //   glyph if it happened to match one of them; only this row states the actual
        //   requirement — that a human can tell the two apart at a glance. without it,
        //   a regression to one glyph reddens at most one case and could read as a
        //   single wrong constant rather than a lost distinction
        expect(
          asCliErrorGlyph({ error: new MalfunctionError('a') }),
        ).not.toEqual(asCliErrorGlyph({ error: new ConstraintError('b') }));
      });
    });
  });

  given('[case4] a plain Error, unbranded by any class verdict', () => {
    when('[t0] the glyph is read', () => {
      then('it is 💥 — OURS, because no human input can produce one', () => {
        /**
         * 🚨 this row used to assert `✋`, on the argument that it was *"the softer
         *   claim, since no verdict was made."* that argument is wrong, and how it is
         *   wrong is worth the space: **there is no soft glyph.** `✋` does not
         *   withhold a verdict — it renders "yours to amend" on a terminal, which is an
         *   accusation of the caller. so the choice was never hard-vs-soft; it was
         *   whom to accuse when we do not know.
         *
         * ⚠️ and the answer is settled ELSEWHERE, twice — this file was the dissenter:
         *   `getExitCodeFromError` returns 1 (ours) for an unbranded error, and
         *   `asCliErrorClassified` converts one to a `MalfunctionError` outright, on
         *   the stated grounds that *"no input a human types should be able to produce
         *   one, so `yours to amend` would be a false accusation."*
         *
         * ⇒ a `✋` here put the two machine channels and the human channel on opposite
         *   verdicts — the precise split `withCliOutputErrors` records the frame
         *   extraction as owed to.
         */
        expect(asCliErrorGlyph({ error: new Error('bare') })).toEqual('💥');
      });
    });
  });

  given('[case6] the three channels that each answer "whose is it?"', () => {
    when('[t0] an unbranded error is put to all three', () => {
      then('they AGREE — ours', () => {
        /**
         * 🚨 the row that would have caught the defect. `[case4]` alone pins this
         *   file's own answer and can be green while the repo holds two contradictory
         *   ones; only a row that reads the peers can see a DISAGREEMENT.
         *
         * ⚠️ `asCliErrorClassified` is asserted by CLASS rather than by glyph — a glyph
         *   comparison here would route both sides through the transformer under test,
         *   so it would stay green if that transformer went wrong in one direction.
         */
        const bare = new Error('bare');
        expect(asCliErrorGlyph({ error: bare })).toEqual('💥');
        expect(getExitCodeFromError({ error: bare })).toEqual(1);
        expect(asCliErrorClassified({ error: bare })).toBeInstanceOf(
          MalfunctionError,
        );
      });
    });
  });

  given('[case5] every variant a caller could encounter', () => {
    when('[t0] the whole table is rendered', () => {
      then('the variant table is pinned', () => {
        // ⚠️ snapped as ONE table rather than as four one-glyph snapshots. the contract's
        //   content is the MAPPING, so a reviewer needs the rows beside each other — and
        //   a per-case snapshot of `"✋"` shows a diff that reads identically whether the
        //   class split holds or collapsed (`rule.require.contract-snapshot-exhaustiveness`)
        expect({
          MalfunctionError: asCliErrorGlyph({
            error: new MalfunctionError('boom'),
          }),
          ConstraintError: asCliErrorGlyph({
            error: new ConstraintError('nope'),
          }),
          'Error (unclassified)': asCliErrorGlyph({ error: new Error('bare') }),
        }).toMatchSnapshot();
      });
    });
  });
});
