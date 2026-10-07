import { given, then, when } from 'test-fns';

import { asBootBudgetReadout } from './asBootBudgetReadout';
import { asBudgetStrategyLines } from './asBudgetStrategyLines';
import { getAllBudgetStrategies } from './getAllBudgetStrategies';

/**
 * .what = clamps the halt surface's LAYOUT INVARIANTS, across both ladders
 * .why = a snapshot pins one shape; an invariant closes the class — a gloss column off its
 *        peers, a count word that disagrees with its rows (`rule.require.clamp-edge-cases`)
 *
 * .note = the gloss column is read OFF the rendered rows and compared against its peers, so
 *   no assertion restates the layout arithmetic.
 *
 * .note = every case loops `modes`: a hardcoded count word is invisible in simple mode and
 *   shows in subject mode alone.
 */
describe('asBootBudgetReadout', () => {
  const modes = ['simple', 'subject'] as const;

  given('[case1] the ladder, in either mode', () => {
    for (const mode of modes) {
      when(`[t0] rendered for mode=${mode}`, () => {
        const strategies = getAllBudgetStrategies({ mode });
        const lines = asBudgetStrategyLines({ strategies });

        then('every gloss begins at ONE column', () => {
          // every rung's gloss aligns to the same column, for any ladder length
          const columns = strategies.map((strategy, index) =>
            lines[index]!.indexOf(strategy.gloss),
          );
          expect(columns.every((column) => column > 0)).toEqual(true);
          expect(new Set(columns).size).toEqual(1);
        });

        then('each rung is exactly one line, and eliminate ends the ladder', () => {
          // a rung's gloss fits on its own row; a continuation line beneath the last rung
          // reads as a second gloss for eliminate
          expect(lines.length).toEqual(strategies.length);
          expect(lines[lines.length - 1]).toContain('eliminate');
          expect(lines[lines.length - 1]).toContain('`not`');
        });

        then('the last rung closes the tree, and no other rung does', () => {
          // the elbow is computed per index; only the final rung carries `└─`
          const elbows = strategies.map((_, index) =>
            lines[index]!.trimStart(),
          );
          expect(
            elbows.slice(0, -1).every((line) => line.startsWith('├─')),
          ).toEqual(true);
          expect(elbows[elbows.length - 1]!.startsWith('└─')).toEqual(true);
        });
      });
    }
  });

  given('[case2] the fix line that heads the ladder', () => {
    for (const mode of modes) {
      when(`[t0] rendered for mode=${mode}`, () => {
        const readout = asBootBudgetReadout({
          rung: 'halt',
          invocation: 'roles boot --what boot.yml',
          budget: { tokens: 20 },
          payload: { tokens: 418 },
          mode,
          coordinates: '--what boot.yml',
          subjects: null,
        }).join('\n');

        then('its COUNT WORD matches the rungs beneath it', () => {
          // 🔴 the count word is derived from the ladder length, never hardcoded — this
          //    grades that it stays derived
          const word = { 4: 'four', 5: 'five' }[
            getAllBudgetStrategies({ mode }).length
          ];
          expect(word).toBeDefined();
          expect(readout).toContain(`${word} strategies, cheapest first`);
        });
      });
    }

    when('[t1] the two modes are compared', () => {
      then('subject mode earns exactly ONE rung more', () => {
        expect(getAllBudgetStrategies({ mode: 'subject' }).length).toEqual(
          getAllBudgetStrategies({ mode: 'simple' }).length + 1,
        );
      });

      then('the extra rung is `narrow`, and it LEADS', () => {
        // 🔴 the order IS the pit of success: `narrow` touches no document at all, so it is
        //    the cheapest rung there is. a ladder that appended it would teach an author to
        //    reach for a lossy remedy before a lossless one
        const [first, ...rest] = getAllBudgetStrategies({ mode: 'subject' });
        expect(first!.verb).toEqual('narrow');
        expect(rest.map((strategy) => strategy.verb)).toEqual(
          getAllBudgetStrategies({ mode: 'simple' }).map(
            (strategy) => strategy.verb,
          ),
        );
      });
    });
  });

  given('[case3] the WARN rung — a spec the caller cannot write', () => {
    when('[t0] rendered', () => {
      const readout = asBootBudgetReadout({
        rung: 'warn',
        invocation: 'roles boot --repo bhrain --role driver',
        budget: { tokens: 20 },
        payload: { tokens: 418 },
        mode: 'subject',
        coordinates: '--repo bhrain --role driver',
        subjects: null,
      }).join('\n');

      then('it offers NO rung of the ladder — in either mode', () => {
        // 🔴 asserted NEGATIVELY, and `mode: subject` on purpose: a warn is the one render
        //    where mode must NOT reach the output at all. every rung names a write into a
        //    version-pinned store, so a builder who let mode leak here would ship advice the
        //    caller cannot act on
        for (const { verb } of getAllBudgetStrategies({ mode: 'subject' }))
          expect(readout).not.toContain(verb);
        expect(readout).not.toContain('strategies, cheapest first');
      });

      then('it says the overage, and whose spec it is', () => {
        expect(readout).toContain('over budget');
        expect(readout).toContain('not yours to trim');
      });

      then('it names no PATH the reader would try to open', () => {
        // the spec resolves into a version-pinned store, so a path here reads as an
        // invitation to edit a file the next install wipes
        expect(readout).toContain('declared upstream');
        expect(readout).not.toContain('node_modules');
      });
    });
  });
});
