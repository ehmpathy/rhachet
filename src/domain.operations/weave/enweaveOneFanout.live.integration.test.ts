import { given, then, when } from 'test-fns';
import type { Empty } from 'type-fns';

import { genContextLogTrail } from '@src/.test/genContextLogTrail';
import { getContextOpenAI } from '@src/.test/getContextOpenAI';
import { describeBrainLiveOnDemand } from '@src/.test/infra/describeBrainLiveOnDemand';
import { genStitcherCodeReview } from '@src/.test/stitchers/genStitcherCodeReviewImagine';
import type { Stitch } from '@src/domain.objects/Stitch';
import type { GStitcher } from '@src/domain.objects/Stitcher';
import { StitchStepCompute } from '@src/domain.objects/StitchStep';
import type { Threads } from '@src/domain.objects/Threads';
import { genContextStitchTrail } from '@src/domain.operations/context/genContextStitchTrail';
import { genThread } from '@src/domain.operations/thread/genThread';

import { genStitchFanout } from './compose/genStitchFanout';
import { enweaveOneFanout } from './enweaveOneFanout';

// the whole file is tier 3: its imagine case calls a live brain; the compute cases sit in
//   enweaveOneFanout.integration.test.ts and run on every push
describeBrainLiveOnDemand('enweaveOneFanout, with a live brain', () => {
  const context = { ...genContextStitchTrail(), ...genContextLogTrail() };
  given(
    '[case1] a route with imagine stitchers, parallelized (closer to real world usecase)',
    () => {
      const stitchCodeRead = {
        input: null,
        output: {
          path: '__path__',
          content: `
import { UnexpectedCodePathError } from 'helpful-errors';
import { IsoTimeStamp } from 'iso-time';
import { PickOne } from 'type-fns';

import { daoJobProspect } from '@src/access/daos/jobProspectDao';
import { withDatabaseContext } from '@src/utils/database/withDatabaseContext';

export const getProspects = withDatabaseContext(
async (
input: PickOne<{
  byProvider: { providerUuid: string };
}> & {
  page: {
    since?: { openedAt: IsoTimeStamp };
    until?: { openedAt: IsoTimeStamp };
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

      when(
        '[t0] the fanout is enwoven with the critic and director threads',
        () => {
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
        },
      );
    },
  );
});
