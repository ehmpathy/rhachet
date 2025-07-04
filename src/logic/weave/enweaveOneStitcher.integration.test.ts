import { given, then, when } from 'test-fns';
import { Empty } from 'type-fns';

import { genContextLogTrail } from '../../__test_assets__/genContextLogTrail';
import { genContextStitchTrail } from '../../__test_assets__/genContextStitchTrail';
import { getContextOpenAI } from '../../__test_assets__/getContextOpenAI';
import { genStitcherCodeFileRead } from '../../__test_assets__/stitchers/genStitcherCodeFileRead';
import { genStitcherCodeReview } from '../../__test_assets__/stitchers/genStitcherCodeReviewImagine';
import { getExampleThreadCodeArtist } from '../../__test_assets__/threads/codeArtist';
import { getExampleThreadCodeCritic } from '../../__test_assets__/threads/codeCritic';
import { exampleThreadDirector } from '../../__test_assets__/threads/director';
import { Stitch } from '../../domain/objects/Stitch';
import { StitchStepCompute } from '../../domain/objects/StitchStep';
import { GStitcher } from '../../domain/objects/Stitcher';
import { Threads } from '../../domain/objects/Threads';
import { asStitcher } from './compose/asStitcher';
import { genStitchFanout } from './compose/genStitchFanout';
import { genStitchRoute } from './compose/genStitchRoute';
import { enweaveOneStitcher } from './enweaveOneStitcher';

describe('enweaveOneStitcher', () => {
  const baseContext = {
    ...genContextStitchTrail(),
    ...genContextLogTrail(),
  };
  const context = { ...baseContext, ...getContextOpenAI() };

  given('a route with a nested fanout of imagine steps', () => {
    const stitcherCodeFileRead = genStitcherCodeFileRead<
      'critic',
      Threads<{ critic: Empty }>
    >({
      stitchee: 'critic',
      output: {
        path: '__path__',
        content: `
import { UnexpectedCodePathError } from '@ehmpathy/error-fns';
import { UniDateTime } from '@ehmpathy/uni-time';
import { PickOne } from 'type-fns';

import { daoJobProspect } from '../../data/dao/jobProspectDao';
import { withDatabaseContext } from '../../utils/database/withDatabaseContext';

export const getProspects = withDatabaseContext(
  async (
    input: PickOne<{ byProvider: { providerUuid: string }; }> & {
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
          by: { providerUuid: input.byProvider.providerUuid },
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
);
          `.trim(),
      },
    });

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
        return new Stitch({
          input: feedbacks,
          output: feedbacks,
        });
      },
    });

    const stitcherCodeReviewFanout = asStitcher(
      genStitchFanout({
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
      }),
    );

    const route = genStitchRoute({
      slug: '[critic]<code:review>',
      readme:
        'review a code change; parallelize the perspectives to review from',
      sequence: [stitcherCodeFileRead, stitcherCodeReviewFanout],
    });

    when('given the threads required', () => {
      let threads: Threads<{
        artist: { tools: string[]; facts: string[] };
        critic: { tools: string[]; facts: string[] };
        director: Empty;
      }>;

      beforeAll(async () => {
        threads = {
          artist: await getExampleThreadCodeArtist(),
          critic: await getExampleThreadCodeCritic(),
          director: exampleThreadDirector,
        };
      });

      then(
        'it should successfully execute the stitches as a weave',
        async () => {
          const output = await enweaveOneStitcher(
            { stitcher: route, threads },
            context,
          );

          expect(output.stitch.output).toHaveLength(6);
        },
      );
    });
  });
  given(
    'a route with a nested fanout of imagine steps, with a choosable cycle',
    () => {
      // declare judge's choice to cycle or exit
    },
  );
});
