import { given, then, when } from 'test-fns';

import { asBootCostReadout } from './asBootCostReadout';
import type { BootBatch } from './BootBatch';
import type { BootSource } from './BootSource';
import type { BootPayload } from './genBootPayload';
import type { BootCostRow } from './getAllCostRows';

const asSource = (coordinates: string): BootSource =>
  ({ coordinates, invocation: `roles boot ${coordinates}` }) as BootSource;

const asPayload = (input: {
  batches: BootBatch[];
  budget?: { tokens: number };
}): BootPayload =>
  ({
    batches: input.batches,
    budget: input.budget ?? null,
  }) as BootPayload;

const asRow = (input: Partial<BootCostRow>): BootCostRow => ({
  slug: 'x.md',
  kind: 'say',
  tokens: 100,
  ...input,
});

/**
 * .what = whether any rendered line carries this text
 * .why = the readout is a line array, so a per-line matcher would need the index — and an
 *        index couples every case to the header's own line count
 */
const hasLineWith = (lines: string[], text: string): boolean =>
  lines.some((line) => line.includes(text));

describe('asBootCostReadout', () => {
  given('[case1] a payload reached by a role coordinate', () => {
    when('[t0] the readout is rendered', () => {
      // 🔴 the clamp on the header verb. `BootSource.invocation` names the BOOT, so a
      //    readout that heads itself with it names a command the reader did not type
      then('it heads with the cost verb, never the boot verb', () => {
        const lines = asBootCostReadout({
          payload: asPayload({ batches: [] }),
          counted: { tokens: 10 },
          rows: [],
          source: asSource('--repo .this --role any'),
          limit: 10,
        });
        expect(lines[0]).toEqual('🧢 roles cost --repo .this --role any');
      });
    });
  });

  given('[case2] percents that differ in decimal width', () => {
    when('[t0] the rows are rendered', () => {
      // a column that steps mid-list reads as a defect
      // (`rule.forbid.snapshot-visual-blemishes`)
      then('every percent carries one decimal', () => {
        const lines = asBootCostReadout({
          payload: asPayload({ batches: [] }),
          counted: { tokens: 100 },
          rows: [
            asRow({ slug: 'a.md', tokens: 50 }),
            asRow({ slug: 'b.md', tokens: 5 }),
          ],
          source: asSource('--repo r --role x'),
          limit: 10,
        });
        expect(hasLineWith(lines, '50.0%  a.md')).toEqual(true);
        expect(hasLineWith(lines, ' 5.0%  b.md')).toEqual(true);
      });
    });
  });

  given('[case3] more rows than the limit admits', () => {
    const rows = [
      asRow({ slug: 'a.md', tokens: 50 }),
      asRow({ slug: 'b.md', tokens: 30 }),
      asRow({ slug: 'c.md', tokens: 20 }),
    ];

    when('[t0] the list is capped', () => {
      // a capped list that drops its tail reports a payload smaller than the one it
      // measured (`rule.forbid.failhide`)
      then('the tail is summed rather than dropped', () => {
        const lines = asBootCostReadout({
          payload: asPayload({ batches: [] }),
          counted: { tokens: 100 },
          rows,
          source: asSource('--repo r --role x'),
          limit: 1,
        });
        expect(hasLineWith(lines, '50.0%  … 2 more')).toEqual(true);
        expect(hasLineWith(lines, '50  50.0%  a.md')).toEqual(true);
      });

      then('the capped rows do not appear by name', () => {
        const lines = asBootCostReadout({
          payload: asPayload({ batches: [] }),
          counted: { tokens: 100 },
          rows,
          source: asSource('--repo r --role x'),
          limit: 1,
        });
        expect(hasLineWith(lines, 'b.md')).toEqual(false);
      });
    });
  });

  given('[case4] a payload with no budget declared', () => {
    when('[t0] the readout is rendered', () => {
      then('it says so rather than print a cap of zero', () => {
        const lines = asBootCostReadout({
          payload: asPayload({ batches: [] }),
          counted: { tokens: 10 },
          rows: [],
          source: asSource('--repo r --role x'),
          limit: 10,
        });
        expect(
          hasLineWith(lines, 'none declared — this boot is uncapped'),
        ).toEqual(true);
      });
    });
  });

  given('[case5] a payload with a budget declared', () => {
    when('[t0] the readout is rendered', () => {
      then('it names the cap and the share used', () => {
        const lines = asBootCostReadout({
          payload: asPayload({ batches: [], budget: { tokens: 1000 } }),
          counted: { tokens: 500 },
          rows: [],
          source: asSource('--repo r --role x'),
          limit: 10,
        });
        expect(hasLineWith(lines, '1,000 tokens (50% used)')).toEqual(true);
      });
    });
  });

  given('[case6] a payload of mixed batch kinds', () => {
    when('[t0] the readout is rendered', () => {
      then('the counts are reported per kind', () => {
        const lines = asBootCostReadout({
          payload: asPayload({
            batches: [
              { slug: 'a.md', kind: 'say', lines: ['a'] },
              { slug: 'b.md', kind: 'say', lines: ['b'] },
              { slug: 'briefs.ref', kind: 'ref', lines: ['c'] },
            ],
          }),
          counted: { tokens: 10 },
          rows: [],
          source: asSource('--repo r --role x'),
          limit: 10,
        });
        expect(hasLineWith(lines, 'batches = 2 say · 1 ref')).toEqual(true);
      });
    });

    when('[t1] a ref block and a say file are ranked', () => {
      // a bare `also` beside a column of paths reads as a file named `also`
      const lines = asBootCostReadout({
        payload: asPayload({ batches: [] }),
        counted: { tokens: 100 },
        rows: [
          asRow({ slug: 'a.md', kind: 'say', tokens: 40 }),
          asRow({ slug: 'also', kind: 'ref', tokens: 20 }),
        ],
        source: asSource('--repo r --role x'),
        limit: 10,
      });

      then('the ref row names its xml block, as the payload spells it', () => {
        expect(hasLineWith(lines, '20.0%  <also>')).toEqual(true);
      });

      then('the say row names its path, unmarked', () => {
        expect(hasLineWith(lines, '40.0%  a.md')).toEqual(true);
        expect(hasLineWith(lines, '<a.md>')).toEqual(false);
      });
    });
  });

  given('[case7] a payload whose column does not reach its total', () => {
    // the ranked column counts each batch alone, so it never reaches the total — the
    //    stats blocks and xml belong to no batch, and the residual is named rather than left unaccounted
    const rows = [asRow({ slug: 'a.md', tokens: 60 })];

    when('[t0] the readout is rendered', () => {
      then('the residual is named as chrome, never left unaccounted', () => {
        const lines = asBootCostReadout({
          payload: asPayload({ batches: [] }),
          counted: { tokens: 100 },
          rows,
          source: asSource('--repo r --role x'),
          limit: 10,
        });
        // 🔴 `40.0%`, never `40%` — chrome shares the rank column's percent format
        //    (`rule.forbid.snapshot-visual-blemishes`)
        expect(hasLineWith(lines, 'chrome  = 40 tokens (40.0%)')).toEqual(true);
      });

      then('the readout says the column plus chrome is the total', () => {
        const lines = asBootCostReadout({
          payload: asPayload({ batches: [] }),
          counted: { tokens: 100 },
          rows,
          source: asSource('--repo r --role x'),
          limit: 10,
        });
        expect(
          hasLineWith(lines, 'the column plus chrome is the total'),
        ).toEqual(true);
      });

      // chrome is a floor no say/ref edit reaches, so to rank it among rows an author
      // could cut would advise a trim that cannot be made
      then('chrome does not appear among the ranked rows', () => {
        const lines = asBootCostReadout({
          payload: asPayload({ batches: [] }),
          counted: { tokens: 100 },
          rows,
          source: asSource('--repo r --role x'),
          limit: 10,
        });
        // bound the slice to the RANK BLOCK — the header to the blank line that closes
        // it. the trailing `.note` names chrome by design, so an unbounded slice would
        // assert against prose rather than against the column
        const indexHeader = lines.findIndex((line) =>
          line.includes('where the tokens go'),
        );
        const linesRank = lines
          .slice(indexHeader + 1)
          .slice(0, lines.slice(indexHeader + 1).indexOf(''));
        expect(linesRank.length).toBeGreaterThan(0);
        expect(linesRank.some((line) => line.includes('chrome'))).toEqual(
          false,
        );
      });
    });
  });
});
