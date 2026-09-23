import { given, then, when } from 'test-fns';

import { asPtyGeometry, PTY_GEOMETRY_FLOOR } from './asPtyGeometry';

/**
 * .what = the geometry clamp that keeps a clone screen READABLE
 *
 * .why = this is the clamp for a defect measured live on 2026-09-16. a clone enrolled at a
 *   host size of `0` produced an emulator at `cols=2 rows=1` — `@xterm/headless`'s own
 *   minimum — and every `rhx clone say` to it returned
 *   `withheld / focus-unrecognized`, permanently. the debug log that caught it:
 *   `.agent/.cache/repo=rhachet/skill=clone-say/debug.2026-09-16.log`
 *
 * 🔴 .the teeth = the pre-cure code was `process.stdout.columns ?? 80`. `??` passes `0`
 *   through, so `[case2]` is the row that goes red under the un-fixed defect — it asserts
 *   the one value a nullish-coalesce cannot catch.
 */
describe('asPtyGeometry', () => {
  given('[case1] a host that reports a real terminal size', () => {
    when('[t0] the size is clamped', () => {
      then('it passes through untouched', () => {
        expect(asPtyGeometry({ cols: 120, rows: 40 })).toEqual({
          cols: 120,
          rows: 40,
        });
      });

      then('a size exactly at the floor is kept', () => {
        expect(asPtyGeometry({ cols: 80, rows: 24 })).toEqual({
          cols: 80,
          rows: 24,
        });
      });
    });
  });

  given('[case2] a host that reports ZERO — the measured defect', () => {
    when('[t0] the size is clamped', () => {
      then('both axes reach the readability floor', () => {
        expect(asPtyGeometry({ cols: 0, rows: 0 })).toEqual({
          cols: PTY_GEOMETRY_FLOOR.cols,
          rows: PTY_GEOMETRY_FLOOR.rows,
        });
      });

      then('the result is never xterm own 2x1 minimum', () => {
        const clamped = asPtyGeometry({ cols: 0, rows: 0 });
        expect(clamped.cols).toBeGreaterThan(2);
        expect(clamped.rows).toBeGreaterThan(1);
      });
    });
  });

  given('[case3] a host that reports an absent size — a pipe', () => {
    when('[t0] the size is clamped', () => {
      then('undefined reaches the floor', () => {
        expect(asPtyGeometry({ cols: undefined, rows: undefined })).toEqual({
          cols: 80,
          rows: 24,
        });
      });

      then('null reaches the floor', () => {
        expect(asPtyGeometry({ cols: null, rows: null })).toEqual({
          cols: 80,
          rows: 24,
        });
      });
    });
  });

  given('[case4] a host whose axes disagree', () => {
    when('[t0] one axis is degenerate and the other is real', () => {
      then('each axis is clamped on its own', () => {
        expect(asPtyGeometry({ cols: 0, rows: 40 })).toEqual({
          cols: 80,
          rows: 40,
        });
        expect(asPtyGeometry({ cols: 200, rows: 0 })).toEqual({
          cols: 200,
          rows: 24,
        });
      });
    });
  });

  given('[case5] a host that reports a value no grid can hold', () => {
    when('[t0] the size is clamped', () => {
      then('a negative reaches the floor', () => {
        expect(asPtyGeometry({ cols: -5, rows: -1 })).toEqual({
          cols: 80,
          rows: 24,
        });
      });

      then('a fraction at the floor truncates to the floor', () => {
        expect(asPtyGeometry({ cols: 80.5, rows: 24.5 })).toEqual({
          cols: 80,
          rows: 24,
        });
      });

      then('NaN reaches the floor', () => {
        expect(asPtyGeometry({ cols: NaN, rows: NaN })).toEqual({
          cols: 80,
          rows: 24,
        });
      });

      then('Infinity reaches the floor', () => {
        expect(asPtyGeometry({ cols: Infinity, rows: Infinity })).toEqual({
          cols: 80,
          rows: 24,
        });
      });
    });
  });

  given('[case6] a host that measures a REAL size imprecisely', () => {
    /**
     * 🔴 .the teeth = the first cure rejected every non-integer outright, so a host that reported
     *   `120.7` was sent to the 80-col floor — 40 real columns DISCARDED to repair a fractional
     *   part. this case is the row that goes red under that over-broad reject.
     */
    when('[t0] the size is clamped', () => {
      then('a fraction above the floor is truncated, never replaced', () => {
        expect(asPtyGeometry({ cols: 120.7, rows: 40.2 })).toEqual({
          cols: 120,
          rows: 40,
        });
      });

      then(
        'the floor only ever RAISES an axis, never lowers a readable one',
        () => {
          const clamped = asPtyGeometry({ cols: 200.9, rows: 50.9 });
          expect(clamped.cols).toBeGreaterThan(PTY_GEOMETRY_FLOOR.cols);
          expect(clamped.rows).toBeGreaterThan(PTY_GEOMETRY_FLOOR.rows);
        },
      );
    });
  });
});
