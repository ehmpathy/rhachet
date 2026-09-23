import { given, then, useThen, when } from 'test-fns';

import { genCloneLoopLagWatch } from './genCloneLoopLagWatch';

/**
 * .what = block this process's event loop for a stated span, synchronously
 * .why = the ONLY way to prove a loop-lag watch has teeth is to stall the loop it watches.
 *   a fake clock cannot do it: the drift this measures is the gap between when a timer was
 *   due and when the loop got round to it, so a mocked timer would report zero drift while
 *   the very pathology went unobserved
 */
const blockTheLoop = (input: { forMs: number }): void => {
  const until = Date.now() + input.forMs;
  while (Date.now() < until) {
    // a busy wait — the stall itself, deliberately synchronous
  }
};

const sleep = (ms: number): Promise<void> =>
  new Promise((settle) => setTimeout(settle, ms));

/**
 * .what = run the watch across a caller-staged span and report what it traced
 * .why = the trace lines are reported as PRIMITIVES (a count, the first line) rather than as
 *   the array itself — `useThen` hands back a lazy proxy, and a proxy over an array answers
 *   neither a deep-equality nor a `.length` read
 */
const runTheWatch = async (input: {
  lagThresholdMs: number;
  stopFirst: boolean;
  blockForMs: number;
}): Promise<{ count: number; first: string }> => {
  const lines: string[] = [];
  const watch = genCloneLoopLagWatch({
    trace: (line) => lines.push(line),
    tickMs: 10,
    lagThresholdMs: input.lagThresholdMs,
  });

  if (input.stopFirst) watch.stop();

  if (input.blockForMs > 0) blockTheLoop({ forMs: input.blockForMs });
  await sleep(60); // let any missed tick land

  watch.stop();
  return { count: lines.length, first: lines[0] ?? '' };
};

describe('genCloneLoopLagWatch', () => {
  given('[case1] a HEALTHY loop', () => {
    when('[t0] the watch runs across several ticks with no stall', () => {
      const traced = useThen('the watch runs', async () =>
        runTheWatch({ lagThresholdMs: 200, stopFirst: false, blockForMs: 0 }),
      );

      then(
        'no drift line lands — a chatty diagnostic is one nobody reads',
        () => {
          expect({ count: traced.count, first: traced.first }).toEqual({
            count: 0,
            first: '',
          });
        },
      );
    });
  });

  given('[case2] a BLOCKED loop — the measured pathology', () => {
    when('[t0] the loop is stalled well past the bound', () => {
      const traced = useThen('the watch reports the stall', async () =>
        runTheWatch({ lagThresholdMs: 100, stopFirst: false, blockForMs: 400 }),
      );

      then('exactly one line lands — node fires a missed interval once', () => {
        expect(traced.count).toEqual(1);
      });

      then('the line NAMES the stall and its measured drift', () => {
        const drift = Number(
          /event loop stalled (\d+)ms/.exec(traced.first)?.[1],
        );
        expect({
          names: traced.first.startsWith('clone daemon event loop stalled'),
          driftAtLeastTheBlock: drift >= 300,
        }).toEqual({ names: true, driftAtLeastTheBlock: true });
      });
    });
  });

  given('[case3] a STOPPED watch', () => {
    when('[t0] the loop stalls AFTER stop()', () => {
      const traced = useThen('the watch runs', async () =>
        runTheWatch({ lagThresholdMs: 100, stopFirst: true, blockForMs: 300 }),
      );

      then(
        'no line lands — stop() retires the watch, never merely mutes it',
        () => {
          expect({ count: traced.count, first: traced.first }).toEqual({
            count: 0,
            first: '',
          });
        },
      );
    });
  });
});
