import { getError } from 'helpful-errors';
import { given, then, when } from 'test-fns';
import { Empty } from 'type-fns';

import { genContextLogTrail } from '../../../__test_assets__/genContextLogTrail';
import { genContextStitchTrail } from '../../../__test_assets__/genContextStitchTrail';
import { Stitch } from '../../../domain/objects/Stitch';
import { StitchStepCompute } from '../../../domain/objects/StitchStep';
import { GStitcher } from '../../../domain/objects/Stitcher';
import { Thread } from '../../../domain/objects/Thread';
import { Threads } from '../../../domain/objects/Threads';
import { enweaveOneFanout } from '../enweaveOneFanout';
import { genStitchFanout } from './genStitchFanout';

describe('genStitchFanout type preservation', () => {
  const context = { ...genContextStitchTrail(), ...genContextLogTrail() };

  given('a fanout with two compute steps and a numeric concluder', () => {
    const threadMain = new Thread({
      context: { role: 'main' as const },
      stitches: [],
    });

    const parallelA = new StitchStepCompute<
      GStitcher<Threads<{ main: Empty }>, typeof context, number>
    >({
      slug: 'random:a',
      readme: null,
      form: 'COMPUTE',
      stitchee: 'main',
      invoke: () => ({ input: null, output: 10 }),
    });

    const parallelB = new StitchStepCompute<
      GStitcher<Threads<{ main: Empty }>, typeof context, number>
    >({
      slug: 'random:b',
      readme: null,
      form: 'COMPUTE',
      stitchee: 'main',
      invoke: () => ({ input: null, output: 20 }),
    });

    const concluder = new StitchStepCompute<
      GStitcher<Threads<{ main: Empty }, 'multiple'>, typeof context, number>
    >({
      slug: 'sum',
      readme: null,
      form: 'COMPUTE',
      stitchee: 'main',
      invoke: ({ threads }) => {
        const numbers = [threads.main.seed, ...threads.main.peers].map(
          (t) => t.stitches.at(-1)?.output ?? 0,
        );
        return {
          input: numbers,
          output: numbers.reduce((a, b) => a + b, 0),
        };
      },
    });

    const stitcherFanout = genStitchFanout({
      slug: 'test:fanout:sum',
      readme: null,
      parallels: [parallelA, parallelB],
      concluder,
    });

    when('used in enweaveOneFanout', () => {
      then(
        'it should produce a stitch.output of type number and multiple threads',
        async () => {
          const { stitch, threads } = await enweaveOneFanout(
            {
              stitcher: stitcherFanout,
              threads: { main: threadMain },
            },
            context,
          );

          // ✅ Compile-time check: output is number
          const testOutput: number = stitch.output;

          // ✅ Compile-time check: threads.main is in single shape
          const stitches = threads.main.stitches;

          // ✅ Runtime check: sum = 30
          expect(testOutput).toEqual(30);
          expect(stitches).toHaveLength(2);
        },
      );

      then('it should fail if you assume wrong output type', async () => {
        await getError(async () => {
          const { stitch } = await enweaveOneFanout(
            {
              stitcher: stitcherFanout,
              threads: { main: threadMain },
            },
            context,
          );

          // @ts-expect-error: stitch.output is number, not string
          const wrongType: string = stitch.output;
          expect(wrongType);
        });
      });
    });
  });
});
