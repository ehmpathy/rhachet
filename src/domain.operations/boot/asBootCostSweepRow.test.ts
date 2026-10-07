import { given, then, when } from 'test-fns';

import { genSampleBootSpecCost as asCost } from '@src/.test/assets/genSampleBootSpecCost';
import { asBootCostSweepRow } from '@src/domain.operations/boot/asBootCostSweepRow';

/**
 * .what = the roster row's render, with the right-alignment of its token column clamped
 * .why = the acceptance fixtures carry only three-digit counts, so only unequal widths here
 *   exercise the pad (`rule.require.clamp-edge-cases`)
 */
const cwd = '/repo';

describe('asBootCostSweepRow', () => {
  given('[case1] a roster whose counts differ in digit width', () => {
    // the real roster spans 668 → 62,986; `formatTokens` renders the wide one as 6 chars
    const widthTokens = 6;

    when('[t0] the NARROW row is rendered', () => {
      const row = asBootCostSweepRow({
        one: asCost({ tokens: 668 }),
        cwd,
        widthTokens,
      });

      then('its count is padded to the roster width', () => {
        // left-padded, so the narrow row's digits sit under the wide row's LAST digits
        expect(row).toContain('├─    668 tokens (no budget)');
      });

      then('the pad is left of the digits, never right', () => {
        // a right-pad would align the FIRST digit, which is the defect inverted — the eye
        // ranks magnitude by where a number ENDS
        expect(row).not.toContain('668    tokens');
      });
    });

    when('[t1] the WIDEST row is rendered', () => {
      const row = asBootCostSweepRow({
        one: asCost({ tokens: 62_986 }),
        cwd,
        widthTokens,
      });

      then('it takes no pad — it already fills the width', () => {
        expect(row).toContain('├─ 62,986 tokens (no budget)');
      });
    });

    when('[t2] a BUDGETED narrow row is rendered', () => {
      const row = asBootCostSweepRow({
        one: asCost({ tokens: 668, budget: 5_000 }),
        cwd,
        widthTokens,
      });

      then('the pad applies to the payload count, not the budget', () => {
        // the budget is a declared constant rather than a measured quantity, so it is not part
        // of the column a reader ranks. only the payload count aligns
        expect(row).toContain('├─    668 / 5,000 tokens (13%)');
      });
    });
  });

  given('[case2] a roster of one row', () => {
    when('[t0] the row is rendered at its own width', () => {
      const row = asBootCostSweepRow({
        one: asCost({ tokens: 1_480 }),
        cwd,
        widthTokens: 5,
      });

      then('no pad is added — the width is its own', () => {
        expect(row).toContain('├─ 1,480 tokens (no budget)');
      });
    });
  });

  given('[case3] a foreign spec', () => {
    when('[t0] the row is rendered', () => {
      const row = asBootCostSweepRow({
        one: asCost({ tokens: 668, isForeign: true }),
        cwd,
        widthTokens: 6,
      });

      then(
        'the alignment holds, and the ownership tag still trails the path',
        () => {
          // the two are independent: a pad must not displace the `(linked)` tag, and the tag
          // must not absorb the pad
          expect(row).toContain('├─    668 tokens (no budget)');
          expect(row).toContain('boot.yml (linked)');
        },
      );
    });
  });
});
