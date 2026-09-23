import { given, then, when } from 'test-fns';

import type { CloneScreenRead } from '../screen/genCloneScreenFeed';
import {
  awaitCloneSubmitReady,
  getCloneSubmitBaseline,
} from './awaitCloneSubmitReady';
import { computeCloneSubmitDelay } from './computeCloneSubmitDelay';

/**
 * .what = a rendered screen whose input box holds the given rows
 * .why = the classifier locates the box as the `❯` band between the last full-width rule
 *   pair, so a fixture must draw that shape (the measured haiku structure)
 */
const genScreen = (input: { boxRows: string[] }): CloneScreenRead => {
  const rule = '─'.repeat(40);
  const lines = [
    'some earlier turn',
    rule,
    ...input.boxRows.map((row, i) => (i === 0 ? `❯ ${row}` : `  ${row}`)),
    rule,
  ];
  return {
    live: true,
    lines,
    // every row BRIGHT — a submit-ready wait reads counts, never the dim ghost signal
    linesBright: lines,
    cursorX: 2,
    cursorY: 2,
    cols: 80,
    rows: lines.length,
  };
};

/** a deterministic clock + sleep pair, so no clamp waits on wall time */
const genClock = () => {
  // .note = deliberate mutation — a virtual clock local to one test, never shared
  let at = 0;
  return {
    now: () => at,
    sleep: async (ms: number) => {
      at += ms;
    },
    advance: (ms: number) => {
      at += ms;
    },
  };
};

describe('awaitCloneSubmitReady', () => {
  given('[case1] a live screen whose box fills on the third poll', () => {
    when('[t0] the submit wait runs', () => {
      then(
        'it submits as soon as the content is OBSERVED in the box',
        async () => {
          // 🔴 the clamp for the submit cure. the retired blind sleep guessed the commit
          // interval and a 50ms floor lost a bracketed paste outright (measured 2026-09-17);
          // this waits for the content to APPEAR, so the Enter can never precede the commit
          const clock = genClock();
          // .note = deliberate mutation — a bounded read counter local to this case
          let reads = 0;
          const read = (): CloneScreenRead => {
            reads += 1;
            // the box is empty for the first two polls, then the paste commits
            return reads <= 2
              ? genScreen({ boxRows: [''] })
              : genScreen({ boxRows: ['alpha', 'bravo'] });
          };

          const result = await awaitCloneSubmitReady({
            read,
            message: 'alpha\nbravo',
            countBefore: 0,
            sleep: clock.sleep,
            now: clock.now,
          });

          expect(result.observed).toEqual(true);
        },
      );
    });
  });

  given(
    '[case2] a live screen whose box ALREADY holds one copy of the message',
    () => {
      when('[t0] the wait runs against a baseline of 1', () => {
        then(
          'it waits for a RISE, never a presence — a forced re-write is not submitted early',
          async () => {
            // `--force` may write into a box that ALREADY holds this text, so a presence test
            // would fire the Enter before the new paste committed. the baseline is passed in and
            // the wait holds until the count climbs ABOVE it
            const clock = genClock();
            // .note = deliberate mutation — a bounded read counter local to this case
            let reads = 0;
            const read = (): CloneScreenRead => {
              reads += 1;
              // one copy already present for the first two polls, two copies after the commit
              return reads <= 2
                ? genScreen({ boxRows: ['dup'] })
                : genScreen({ boxRows: ['dup', 'dup'] });
            };

            const result = await awaitCloneSubmitReady({
              read,
              message: 'dup',
              countBefore: 1,
              sleep: clock.sleep,
              now: clock.now,
            });

            expect(result.observed).toEqual(true);
            // it did NOT return on the first read, where the needle was already present
            expect(reads).toBeGreaterThan(1);
          },
        );
      });
    },
  );

  given('[case3] a live screen whose box never shows the content', () => {
    when('[t0] the wait runs', () => {
      then('it gives up at the budget, and says so', async () => {
        // the budget bounds a pathological screen. it reports `observed: false` rather than
        // claim a commit it never saw — the caller submits anyway and the verdict channel
        // reports what actually landed (rule.forbid.failhide)
        const clock = genClock();
        const read = (): CloneScreenRead => genScreen({ boxRows: [''] });

        const result = await awaitCloneSubmitReady({
          read,
          message: 'never-appears',
          countBefore: 0,
          sleep: clock.sleep,
          now: clock.now,
        });

        expect(result.observed).toEqual(false);
      });
    });
  });

  given('[case4] a screen that cannot be read', () => {
    when('[t0] the wait runs', () => {
      then(
        'it degrades to the PROVEN blind sleep, and reports it was not observed',
        async () => {
          // an unfed or faulted feed offers no observation, so this falls back to exactly the
          // prior write path's length-scaled sleep — the cure never makes a degraded feed worse
          const clock = genClock();
          const read = (): CloneScreenRead => ({
            live: false,
            reason: 'feed-not-live',
          });
          const message = 'hello there';

          const result = await awaitCloneSubmitReady({
            read,
            message,
            countBefore: 0,
            sleep: clock.sleep,
            now: clock.now,
          });

          expect(result.observed).toEqual(false);
          expect(result.waitedMs).toEqual(
            computeCloneSubmitDelay({ messageLength: message.length }),
          );
        },
      );
    });
  });
});

describe('getCloneSubmitBaseline', () => {
  given('[case1] a box that already holds the message', () => {
    when('[t0] the baseline is read', () => {
      then('it counts the message already in the box', () => {
        const read = (): CloneScreenRead => genScreen({ boxRows: ['dup'] });
        expect(getCloneSubmitBaseline({ read, message: 'dup' })).toEqual(1);
      });
    });
  });

  given('[case2] a screen that cannot be read', () => {
    when('[t0] the baseline is read', () => {
      then('it yields 0 — the safe baseline, so any later rise counts', () => {
        const read = (): CloneScreenRead => ({
          live: false,
          reason: 'feed-faulted',
        });
        expect(getCloneSubmitBaseline({ read, message: 'dup' })).toEqual(0);
      });
    });
  });
});
