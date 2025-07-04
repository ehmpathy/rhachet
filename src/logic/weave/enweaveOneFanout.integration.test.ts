import { getError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { genContextLogTrail } from '../../__test_assets__/genContextLogTrail';
import { genContextStitchTrail } from '../../__test_assets__/genContextStitchTrail';
import { stitcherFanoutRandomSum } from '../../__test_assets__/stitchers/stitcherFanoutRandomSum';
import { stitcherFanoutWithRoutes } from '../../__test_assets__/stitchers/stitcherFanoutSubroutes';
import { Thread } from '../../domain/objects/Thread';
import { enweaveOneFanout } from './enweaveOneFanout';

describe('enweaveOneFanout', () => {
  const context = { ...genContextStitchTrail(), ...genContextLogTrail() };
  given('a fanout that computes 5 random numbers then sums them', () => {
    const threadMain = new Thread({
      context: { role: 'main' as const },
      stitches: [],
    });

    when('invoked with the correct thread', () => {
      then(
        'it should return a number stitch equal to the sum of the random outputs',
        async () => {
          const { stitch, threads } = await enweaveOneFanout(
            {
              stitcher: stitcherFanoutRandomSum,
              threads: { main: threadMain },
            },
            context,
          );
          console.log({ stitch, threads });

          // validate output is a number
          expect(typeof stitch.output).toBe('number');

          // validate input to the concluder is a number[]
          expect(Array.isArray(stitch.input)).toBe(true);
          expect(
            stitch.input.every((n: unknown) => typeof n === 'number'),
          ).toBe(true);

          // validate stitch.output === sum(stitch.input)
          const expectedSum = (stitch.input as number[]).reduce(
            (a, b) => a + b,
            0,
          );
          expect(stitch.output).toBe(expectedSum);

          // validate thread output is form: 'single'
          expect(threads.main.stitches.at(-1)?.output).toBe(expectedSum);
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
            {
              stitcher: stitcherFanoutRandomSum,
              // @ts-expect-error: wrong thread role
              threads: { wrong: threadWrong },
            },
            context,
          ),
        );
      });
    });
  });

  given('a fanout with one route of 2 steps and another of 3 steps', () => {
    const threadMain = new Thread({
      context: { role: 'main' as const },
      stitches: [],
    });

    then(
      'it should output a stitch where input = [3, 6] and output = 9',
      async () => {
        const { stitch, threads } = await enweaveOneFanout(
          {
            stitcher: stitcherFanoutWithRoutes,
            threads: { main: threadMain },
          },
          context,
        );

        expect(Array.isArray(stitch.input)).toBe(true);
        expect(stitch.input).toEqual([3, 6]);
        expect(stitch.output).toBe(9);

        expect(threads.main.stitches.at(-1)?.output).toBe(9);
      },
    );
  });
});
