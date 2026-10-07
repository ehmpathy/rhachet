import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { getError, given, then, useThen, when } from 'test-fns';

import { calcBrainTokens } from '../brainCost/calcBrainTokens';
import { asBootEmittedPayload } from './asBootEmittedPayload';
import { calcBootPayloadTokens } from './calcBootPayloadTokens';

/**
 * .what = clamps the boot payload token counter
 * .why = the count gates a boot (`0.wish.md` requirement 2), so it must be a real bpe count
 *        of the whole emitted payload, chrome included
 *
 * .note = a `genStatsLines` that returns an empty array renders `[...[], ...body, ...[]]`,
 *   which joins byte-identically to the body alone. so the body-only cases below state a
 *   real absence of chrome rather than a mock of one.
 */
describe('calcBootPayloadTokens', () => {
  const genNoStatsLines = () => [];

  // the real counter, so every expected number below is a real bpe count
  const CONTEXT = { countTokens: calcBrainTokens };

  given(
    "[case1] a glyph-dense payload, as this repo's briefs actually are",
    () => {
      // the glyphs a rhachet brief is dense in — each tokenizes far worse than 4 chars
      const linesBody = [
        '<stats>',
        'quant',
        '  ├── files = 255',
        '  │   ├── briefs = 162',
        '  │   └── skills = 22',
        '</stats>',
        '',
        '🔴 **the halt names four strategies, cheapest first** ⇒ catalogize · condense',
        '🟡 ✓ ✗ ✨ 🧢 ✋ 🥾 — the glyph palette this repo roots its surfaces on',
      ];

      when('[t0] the payload is counted', () => {
        const counted = useThen('it counts', async () =>
          calcBootPayloadTokens(
            { of: { linesBody, genStatsLines: genNoStatsLines } },
            CONTEXT,
          ),
        );

        then('chars is the EMITTED length, never the assembled one', () => {
          // 🔴 the literal clamp. `console.log` appends exactly one '\n', so a counter that
          //    measures the joined string measures one byte fewer than the wire carries —
          //    an UNDERCOUNT, the one direction requirement 7 forbids.
          expect(counted.chars).toEqual(
            asBootEmittedPayload({ linesStats: [], linesBody }).length,
          );
        });

        then('tokens is a real count, never a char-derived estimate', () => {
          // the chars/4 estimate, kept inline so the assertion states what it compares
          const estimateByCharsDivFour = Math.ceil(counted.chars / 4);

          expect(counted.tokens).toBeGreaterThan(0);
          expect(counted.tokens).not.toEqual(estimateByCharsDivFour);
        });

        then(
          'the estimate UNDERCOUNTS this payload — the dangerous direction',
          () => {
            // the gate must count no fewer tokens than the payload holds (`0.wish.md` requirement 2)
            const estimateByCharsDivFour = Math.ceil(counted.chars / 4);

            expect(estimateByCharsDivFour).toBeLessThan(counted.tokens);
          },
        );

        then('the true density is FAR below 4.0 chars per token', () => {
          // the bound is 3.8, not 4.0: the `chars / 4` heuristic yields ~3.97, so only a bound
          // below that goes red under it (`rule.require.clamp-edge-cases`)
          const density = counted.chars / counted.tokens;

          expect(density).toBeLessThan(3.8);
        });
      });
    },
  );

  given('[case2] an empty payload', () => {
    when('[t0] the payload is counted', () => {
      const counted = useThen('it counts', async () =>
        calcBootPayloadTokens(
          { of: { linesBody: [], genStatsLines: genNoStatsLines } },
          CONTEXT,
        ),
      );

      then(
        'the count is the one newline a log of it would put on the wire',
        () => {
          // .note = never zero, and that is the point: `console.log('')` emits one byte. the
          //   boot never reaches this case — an empty universe returns before the gate
          //   (`bootRoleResources.ts`) — so this clamps the counter's literalness at its
          //   degenerate end rather than a real boot.
          expect(counted.chars).toEqual(1);
          expect(counted.tokens).toEqual(1);
        },
      );
    });
  });

  given('[case3] plain english prose, where the estimate is closest', () => {
    const linesBody = ['The quick brown fox jumps over the lazy dog.'];

    when('[t0] the payload is counted', () => {
      const counted = useThen('it counts', async () =>
        calcBootPayloadTokens(
          { of: { linesBody, genStatsLines: genNoStatsLines } },
          CONTEXT,
        ),
      );

      then('the count is the real bpe count, pinned', () => {
        // .note = pinned to a value, never a range — the count is deterministic for the
        //         `o200k_base` vocabulary, so a range would hide a vocabulary change.
        // .note = 45 chars, never 44: the sentence is 44 and the emitted payload carries the
        //   newline `console.log` appends. 🟡 the TOKEN count does not move with it — bpe
        //   merges the newline into the token before it — which is one more demonstration
        //   that a char count cannot stand in for a token count in either direction.
        expect(counted.chars).toEqual(45);
        expect(counted.tokens).toEqual(10);
      });
    });
  });

  given('[case4] a payload whose boot emits stats blocks around it', () => {
    // the real render: a stats block is emitted TWICE, once as a header and once as a
    // footer, and each one reports the number the gate computes
    const linesBody = [
      '<readme path="a/readme.md">',
      'a role that does one job, and says so.',
      '</readme>',
      '',
    ];
    const genStatsLines = (statsInput: {
      counted: { tokens: number } | null;
    }): string[] => [
      '<stats>',
      'quant',
      '  ├── files = 1',
      `  └── tokens = ${statsInput.counted?.tokens ?? 0} (full emitted payload, o200k_base)`,
      '</stats>',
      '',
    ];

    when('[t0] the payload is counted', () => {
      const counted = useThen('it counts', async () =>
        calcBootPayloadTokens({ of: { linesBody, genStatsLines } }, CONTEXT),
      );

      const countedBodyOnly = useThen(
        'the body alone is counted, for contrast',
        async () =>
          calcBootPayloadTokens(
            { of: { linesBody, genStatsLines: genNoStatsLines } },
            CONTEXT,
          ),
      );

      then('the stats blocks are IN the count', () => {
        // 🔴 the scope clamp: a body-only count omits two blocks the boot emits, and it
        //    errs LOW — the direction that passes an over-budget boot
        expect(counted.tokens).toBeGreaterThan(countedBodyOnly.tokens);
      });

      then('BOTH blocks are counted, never just one', () => {
        // the gap must cover two renders, so half of it is one block's own token count.
        // a one-block defect would land at half this bound
        const tokensOneBlock = (counted.tokens - countedBodyOnly.tokens) / 2;

        expect(tokensOneBlock).toBeGreaterThan(5);
      });

      then(
        'the count has SETTLED — it reports the number it is part of',
        () => {
          // 🔴 the convergence clamp. the stats block prints the total, so its own rendered
          //    length feeds back through that number's digits. a count that did not converge
          //    would print a total that disagrees with the string it was measured from —
          //    a number that is wrong about itself, which is worse than an absent one.
          //
          // the fixed-point test, stated directly: render the block with the returned total,
          // assemble the exact emitted string, and it must measure to that same total.
          //
          // 🔴 .note = the assembly is `asBootEmittedPayload`, never a re-joined copy. a copy
          //   would drift from the emitter the moment either side changed, which is the very
          //   disagreement that operation exists to make impossible.
          const linesStats = genStatsLines({
            counted: { tokens: counted.tokens },
          });

          expect(
            asBootEmittedPayload({ linesStats, linesBody }).length,
          ).toEqual(counted.chars);
        },
      );
    });
  });

  given('[case5] a payload whose stats block can never settle', () => {
    const linesBody = ['<readme path="a/readme.md">', 'one line.', '</readme>'];

    // a block that grows by one line per token counted, so every pass renders a LONGER
    // block than the pass before it — no fixed point exists
    const genStatsLinesDivergent = (statsInput: {
      counted: { tokens: number } | null;
    }): string[] => [
      '<stats>',
      ...Array.from(
        { length: statsInput.counted?.tokens ?? 0 },
        () => '  a line the block grew',
      ),
      '</stats>',
      '',
    ];

    // .note = a THUNK, never the call's result. the counter is synchronous now, so a direct
    //   call would raise before `getError` ever saw it
    const genOneError = async (): Promise<Error> =>
      await getError(() =>
        calcBootPayloadTokens(
          { of: { linesBody, genStatsLines: genStatsLinesDivergent } },
          CONTEXT,
        ),
      );

    when('[t0] the payload is counted', () => {
      /**
       * .what = runs the divergent count ONCE; the `then`s below read its verdict
       * .note = `useThen` hands back a proxy, whose constructor `toBeInstanceOf` would read,
       *   so the `instanceof` checks run here against the true error object
       */
      const verdict = useThen('it raises', async () => {
        const error = await genOneError();
        return {
          isMalfunction: error instanceof MalfunctionError,
          isConstraint: error instanceof ConstraintError,
          message: error.message,
        };
      });

      then('it RAISES rather than return the last pass', () => {
        // 🔴 a `return counted` on fall-through would let a payload that never settled yield
        //    a total no render would have printed — the cap's verdict would then be a
        //    function of `PASSES_MAX` rather than of the payload.
        expect(verdict.isMalfunction).toEqual(true);
      });

      then('the message names what did not converge', () => {
        expect(verdict.message).toContain('did not converge');
      });

      then('it is a MALFUNCTION, never a constraint', () => {
        // .why = no act of the caller's can fix it. they handed over a payload; our own
        //        render fed our own counter and the pair would not settle
        //        (`rule.require.exit-code-semantics`).
        expect(verdict.isConstraint).toEqual(false);
      });
    });
  });
});
