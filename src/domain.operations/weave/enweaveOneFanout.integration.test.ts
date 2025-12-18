import { getError } from 'helpful-errors';
import { given, then, when } from 'test-fns';
import type { Empty } from 'type-fns';

import { genContextLogTrail } from '@src/.test/genContextLogTrail';
import { getContextOpenAI } from '@src/.test/getContextOpenAI';
import { genStitcherCodeReview } from '@src/.test/stitchers/genStitcherCodeReviewImagine';
import { stitcherFanoutRandomSum } from '@src/.test/stitchers/stitcherFanoutRandomSum';
import { stitcherFanoutWithRoutes } from '@src/.test/stitchers/stitcherFanoutSubroutes';
import type { Stitch } from '@src/domain.objects/Stitch';
import type { GStitcher } from '@src/domain.objects/Stitcher';
import { StitchStepCompute } from '@src/domain.objects/StitchStep';
import { Thread } from '@src/domain.objects/Thread';
import type { Threads } from '@src/domain.objects/Threads';
import { genContextStitchTrail } from '@src/domain.operations/context/genContextStitchTrail';
import { genThread } from '@src/domain.operations/thread/genThread';

import { genStitchFanout } from './compose/genStitchFanout';
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

  given.only(
    'a route with imagine stitchers, parallelized (closer to real world usecase)',
    () => {
      const stitchCodeRead = {
        input: null,
        output: {
          path: '__path__',
          content: `
import { UnexpectedCodePathError } from 'helpful-errors';
import { UniDateTime } from '@ehmpathy/uni-time';
import { PickOne } from 'type-fns';

import { daoJobProspect } from '@src/access/daos/jobProspectDao';
import { withDatabaseContext } from '@src/utils/database/withDatabaseContext';

export const getProspects = withDatabaseContext(
async (
input: PickOne<{
  byProvider: { providerUuid: string };
}> & {
  page: {
    since?: { openedAt: UniDateTime };
    until?: { openedAt: UniDateTime };
    limit: number;
  };
},
context,
) => {
  if (input.byProvider)
    return daoJobProspect.findAllByProvider(
      {
        by: {
          providerUuid: input.byProvider.providerUuid,
        },
        filter: {
          sinceOpenedAt: input.page.since?.openedAt,
          untilOpenedAt: input.page.until?.openedAt,
        },
        limit: input.page.limit,
      },
      context,
    );

  throw new UnexpectedCodePathError('unsupported input option');
},
          `.trim(),
        },
      };

      const stitcherCodeReviewConcluder = new StitchStepCompute<
        GStitcher<
          Threads<{ critic: Empty }, 'multiple'>,
          typeof context,
          string[]
        >
      >({
        slug: 'sum',
        readme: null,
        form: 'COMPUTE',
        stitchee: 'critic',
        invoke: ({ threads }) => {
          const feedbacks = threads.critic.peers.map(
            (peer) => peer.stitches.slice(-1)[0]?.output,
          );
          return {
            input: feedbacks,
            output: feedbacks,
          };
        },
      });

      const fanout = genStitchFanout({
        slug: '[critic]<code:review>.<fanout>[[review]]',
        readme: null,
        parallels: [
          genStitcherCodeReview({ scope: 'technical', focus: 'blockers' }),
          genStitcherCodeReview({ scope: 'technical', focus: 'chances' }),
          genStitcherCodeReview({ scope: 'technical', focus: 'praises' }),
          genStitcherCodeReview({ scope: 'functional', focus: 'blockers' }),
          genStitcherCodeReview({ scope: 'functional', focus: 'chances' }),
          genStitcherCodeReview({ scope: 'functional', focus: 'praises' }),
        ],
        concluder: stitcherCodeReviewConcluder,
      });

      when('given the threads required', () => {
        then(
          'it should successfully execute the stitches as a weave',
          async () => {
            const output = await enweaveOneFanout(
              {
                stitcher: fanout,
                threads: {
                  critic: {
                    ...genThread({
                      role: 'critic' as const,
                      tools: [],
                      facts: [],
                    }),
                    stitches: [stitchCodeRead as Stitch<any>],
                  },
                  director: genThread({ role: 'director' as const }),
                },
              },
              { ...context, ...getContextOpenAI() },
            );

            expect(output.stitch.output.length).toEqual(6);
            console.log(output.stitch.output);
          },
        );
      });
    },
  );
});
