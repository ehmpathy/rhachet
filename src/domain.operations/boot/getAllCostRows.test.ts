import { given, then, when } from 'test-fns';

import { getAllCostRows } from './getAllCostRows';

describe('getAllCostRows', () => {
  // a FAKE counter — one token per char. these cases clamp the SORT and the per-row
  //   shape, never the tokenizer's arithmetic (`rule.forbid.unit.remote-boundaries`).
  //   the accuracy clamps live in `calcBootPayloadTokens.test.ts`, which injects the
  //   real encoder — kept separate so a unit suite pays no construction cost for
  //   a comparison this file does not need.
  const CONTEXT = {
    countTokens: (input: { of: { words: string } }) => ({
      chars: input.of.words.length,
      tokens: input.of.words.length,
    }),
  };

  given('[case1] batches of unequal weight', () => {
    when('[t0] the rows are computed', () => {
      then('the heaviest sorts first', () => {
        const rows = getAllCostRows(
          {
            batches: [
              { slug: 'light.md', kind: 'say', lines: ['a'] },
              { slug: 'heavy.md', kind: 'say', lines: ['a b c d e f g h i j'] },
            ],
          },
          CONTEXT,
        );
        expect(rows.map((row) => row.slug)).toEqual(['heavy.md', 'light.md']);
      });

      then('each row carries its own kind', () => {
        const rows = getAllCostRows(
          { batches: [{ slug: 'briefs.ref', kind: 'ref', lines: ['a'] }] },
          CONTEXT,
        );
        expect(rows[0]!.kind).toEqual('ref');
      });

      // 🔴 a row carries COST and no share — the renderer derives every percent it prints
      //    from `tokens` via one owner, so a stored share would be a second statement of one
      //    derived quantity
      then('a row carries no precomputed share', () => {
        const rows = getAllCostRows(
          { batches: [{ slug: 'a.md', kind: 'say', lines: ['abc'] }] },
          CONTEXT,
        );
        expect(Object.keys(rows[0]!).sort()).toEqual([
          'kind',
          'slug',
          'tokens',
        ]);
      });
    });
  });
});
