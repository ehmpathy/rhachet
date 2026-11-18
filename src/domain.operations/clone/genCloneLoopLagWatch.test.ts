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

/**
 * .what = block this process's event loop until it has BURNT a stated span of cpu
 * .why = a wall-clock busy wait on a loaded host is descheduled part of the time, so the cpu it
 *   spends is not fixed. a burn measured in cpu time is, so the line's cpu figure has a floor
 */
const burnTheLoopCpu = (input: { cpuMs: number }): void => {
  const from = process.cpuUsage();
  while (true) {
    const spent = process.cpuUsage(from);
    if ((spent.user + spent.system) / 1000 >= input.cpuMs) return;
  }
};

/**
 * .what = block this process's event loop for a stated span, OFF the cpu
 * .why = a sync call that waits in the kernel (a tty or fs write the far side does not drain)
 *   holds the loop with no cpu spent. `Atomics.wait` on a buffer no one notifies is exactly
 *   that shape, with no fs or tty for a test to arrange
 */
const blockTheLoopOffCpu = (input: { forMs: number }): void => {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, input.forMs);
};

const sleep = (ms: number): Promise<void> =>
  new Promise((settle) => setTimeout(settle, ms));

/**
 * .what = parse the stall line into its three measures
 * .why = the class cases assert on the measures, not the text; one parse keeps each case to its
 *   claim
 */
const asStallMeasures = (
  line: string,
): { driftMs: number; cpuMs: number; loopActiveMs: number } | null => {
  const match =
    /^clone daemon event loop stalled (\d+)ms \(cpu (\d+)ms, loop active (\d+)ms\)\n$/.exec(
      line,
    );
  if (!match) return null;
  return {
    driftMs: Number(match[1]),
    cpuMs: Number(match[2]),
    loopActiveMs: Number(match[3]),
  };
};

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
  blockBy?: 'wall' | 'cpu-burn' | 'off-cpu';
}): Promise<{ count: number; first: string }> => {
  const lines: string[] = [];
  const watch = genCloneLoopLagWatch({
    trace: (line) => lines.push(line),
    tickMs: 10,
    lagThresholdMs: input.lagThresholdMs,
  });

  if (input.stopFirst) watch.stop();

  const blockBy = input.blockBy ?? 'wall';
  if (input.blockForMs > 0 && blockBy === 'wall')
    blockTheLoop({ forMs: input.blockForMs });
  if (input.blockForMs > 0 && blockBy === 'cpu-burn')
    burnTheLoopCpu({ cpuMs: input.blockForMs });
  if (input.blockForMs > 0 && blockBy === 'off-cpu')
    blockTheLoopOffCpu({ forMs: input.blockForMs });
  await sleep(60); // let any missed tick land

  watch.stop();
  return { count: lines.length, first: lines[0] ?? '' };
};

describe('genCloneLoopLagWatch', () => {
  given('[case1] a HEALTHY loop', () => {
    when('[t0] the watch runs across several ticks with no stall', () => {
      // .note = the bound sits far above the stall a starved jest worker meets under a full
      //   parallel run (a gc pause, cpu contention); this case asks only that a loop no test
      //   stalls stays quiet, and a 200ms bound flaked on a loaded box
      const traced = useThen('the watch runs', async () =>
        runTheWatch({ lagThresholdMs: 2000, stopFirst: false, blockForMs: 0 }),
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

  given('[case3] a SHORT stall, at the 200ms bound [case1] once held', () => {
    when('[t0] the loop is stalled 300ms against a 200ms bound', () => {
      // .note = [case1] widened its bound to stay quiet on a loaded box; this case keeps the
      //   low band under proof. a busy wait of 300ms always yields drift >= 300ms, so the
      //   report is deterministic however loaded the box
      const traced = useThen('the watch reports the stall', async () =>
        runTheWatch({ lagThresholdMs: 200, stopFirst: false, blockForMs: 300 }),
      );

      then('a stall in the 200–400ms band is reported, once', () => {
        expect(traced.count).toEqual(1);
        expect(traced.first.startsWith('clone daemon event loop stalled')).toBe(
          true,
        );
      });
    });
  });

  given(
    '[case5] a loop the daemon holds with its OWN sync work (on-cpu)',
    () => {
      when('[t0] the loop burns 400ms of cpu in one sync span', () => {
        const traced = useThen('the watch reports the stall', async () =>
          runTheWatch({
            lagThresholdMs: 100,
            stopFirst: false,
            blockForMs: 400,
            blockBy: 'cpu-burn',
          }),
        );

        then(
          'the line reports the cpu the loop burnt, and loop active near the drift',
          () => {
            const measures = asStallMeasures(traced.first);
            expect(measures).not.toBeNull();
            expect({
              cpuAtLeastTheBurn: measures!.cpuMs >= 380,
              activeNearDrift:
                measures!.loopActiveMs >= measures!.driftMs * 0.5,
            }).toEqual({ cpuAtLeastTheBurn: true, activeNearDrift: true });
          },
        );
      });
    },
  );

  given('[case6] a loop held in a blocked sync call (off-cpu)', () => {
    when('[t0] the loop waits in the kernel well past the bound', () => {
      const traced = useThen('the watch reports the stall', async () =>
        runTheWatch({
          lagThresholdMs: 100,
          stopFirst: false,
          blockForMs: 400,
          blockBy: 'off-cpu',
        }),
      );

      then(
        'the line reads loop active near the drift, but cpu far below it',
        () => {
          const measures = asStallMeasures(traced.first);
          expect(measures).not.toBeNull();
          expect({
            // relative to the drift, since cpu is process-wide: gc and native threads add to it
            //   on a loaded host, never in proportion to the span the loop sat blocked
            cpuFarBelowDrift: measures!.cpuMs < measures!.driftMs * 0.5,
            activeNearDrift: measures!.loopActiveMs >= measures!.driftMs * 0.5,
          }).toEqual({ cpuFarBelowDrift: true, activeNearDrift: true });
        },
      );
    });
  });

  given('[case7] a loop that stalls twice, apart', () => {
    when('[t0] a 300ms stall, a turn of the loop, then a 600ms stall', () => {
      const traced = useThen('the watch reports both stalls', async () => {
        // .note = deliberate mutation — a local list the watch's trace appends to; never escapes
        const lines: string[] = [];
        const watch = genCloneLoopLagWatch({
          trace: (line) => lines.push(line),
          tickMs: 10,
          lagThresholdMs: 100,
        });
        blockTheLoop({ forMs: 300 });
        await sleep(60); // the loop turns: the first stall's line lands
        blockTheLoop({ forMs: 600 });
        await sleep(60);
        watch.stop();
        return {
          count: lines.length,
          drifts: lines
            .map((line) => asStallMeasures(line)?.driftMs ?? -1)
            .join(','),
        };
      });

      then('one line per stall lands, in the order the stalls occurred', () => {
        const drifts = traced.drifts.split(',').map(Number);
        expect(traced.count).toEqual(2);
        // drift reads a tick or so below the block (case2: a 400ms block, drift >= 300), so
        //   the order is proven by the gap between the two, never by exact bounds
        expect({
          firstNamesTheShortStall: drifts[0]! >= 200 && drifts[0]! < 500,
          secondIsTheLongerStall: drifts[1]! >= drifts[0]! + 150,
        }).toEqual({
          firstNamesTheShortStall: true,
          secondIsTheLongerStall: true,
        });
      });
    });
  });

  given('[case4] a STOPPED watch', () => {
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
