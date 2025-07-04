import { getError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { genContextLogTrail } from '../../__test_assets__/genContextLogTrail';
import { genContextStitchTrail } from '../../__test_assets__/genContextStitchTrail';
import { stitcherFanoutRandomSum } from '../../__test_assets__/stitchers/stitcherFanoutRandomSum';
import { Thread } from '../../domain/objects/Thread';
import { enweaveOneFanout } from './enweaveOneFanout';

describe('fanoutRandomSum', () => {
  const context = { ...genContextStitchTrail(), ...genContextLogTrail() };

  given('a fanout that computes 5 random numbers then sums them', () => {
    const threadMain = new Thread({
      context: { role: 'main' as const },
      stitches: [],
    });

    when('invoked with the correct thread', () => {
      then(
        'it should return a number stitch equal to the sum of the 5 random outputs',
        async () => {
          const { stitch, threads } = await enweaveOneFanout(
            {
              stitcher: stitcherFanoutRandomSum,
              threads: { main: threadMain },
            },
            context,
          );

          // validate stitch result is a number
          expect(typeof stitch.output).toBe('number');

          // validate fanout structure: main should now be a fanin thread (seed + peers)
          const allThreads = [threads.main.seed, ...threads.main.peers];
          expect(allThreads.length).toBe(5); // 5 fanout outputs
          const outputs = allThreads.map((t) => t.stitches.at(-1)?.output);
          expect(outputs.every((n) => typeof n === 'number')).toBe(true);

          const expectedSum = outputs.reduce(
            (acc, val) => acc + (val as number),
            0,
          );
          expect(stitch.output).toBe(expectedSum);
        },
      );
    });

    when('invoked with an incorrect thread role', () => {
      const threadWrong = new Thread({
        context: { role: 'wrong' as const },
        stitches: [],
      });

      then('it should throw at compile time due to wrong role', async () => {
        await getError(
          enweaveOneFanout(
            // @ts-expect-error: wrong thread role
            { stitcher: fanoutRandomSum, threads: { wrong: threadWrong } },
            context,
          ),
        );
      });
    });
  });
});
