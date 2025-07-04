import {
  addDuration,
  asUniDateTime,
  isUniDateTime,
  UniDateTime,
} from '@ehmpathy/uni-time';
import { getError, UnexpectedCodePathError } from 'helpful-errors';
import { given, then, when } from 'test-fns';
import { Empty } from 'type-fns';

import { genContextLogTrail } from '../../__test_assets__/genContextLogTrail';
import { genContextStitchTrail } from '../../__test_assets__/genContextStitchTrail';
import { getContextOpenAI } from '../../__test_assets__/getContextOpenAI';
import { genStitcherCodeFileRead } from '../../__test_assets__/stitchers/genStitcherCodeFileRead';
import { genStitcherCodeReview } from '../../__test_assets__/stitchers/genStitcherCodeReviewImagine';
import { stitcherCodeDiffImagine } from '../../__test_assets__/stitchers/stitcherCodeDiffImagine';
import { getExampleThreadCodeArtist } from '../../__test_assets__/threads/codeArtist';
import { exampleThreadDirector } from '../../__test_assets__/threads/director';
import { Stitch } from '../../domain/objects/Stitch';
import { StitchRoute } from '../../domain/objects/StitchRoute';
import { StitchStepCompute } from '../../domain/objects/StitchStep';
import { GStitcher } from '../../domain/objects/Stitcher';
import { Thread } from '../../domain/objects/Thread';
import { Threads } from '../../domain/objects/Threads';
import { ContextOpenAI } from '../stitch/adapters/imagineViaOpenAI';
import { genStitchFanout } from './compose/genStitchFanout';
import { genStitchRoute } from './compose/genStitchRoute';
import { enweaveOneRoute } from './enweaveOneRoute';

describe('enweaveOneRoute', () => {
  const context = { ...genContextStitchTrail(), ...genContextLogTrail() };
  given(
    'a route with compute stitchers (fast and no api keys required); same threads required for each stitcher',
    () => {
      const stitcherGetTime = new StitchStepCompute<
        GStitcher<Threads<{ main: Empty }>, GStitcher['context'], UniDateTime>
      >({
        slug: 'get-time',
        readme: null,
        form: 'COMPUTE',
        stitchee: 'main',
        invoke: () =>
          new Stitch({ input: null, output: asUniDateTime(new Date()) }),
      });
      const stitcherAddHours = new StitchStepCompute<
        GStitcher<Threads<{ main: Empty }>, GStitcher['context'], UniDateTime>
      >({
        slug: 'add-hours',
        readme: null,
        form: 'COMPUTE',
        stitchee: 'main',
        invoke: ({ threads }) => {
          const lastStitch =
            threads.main.stitches.slice(-1)[0] ??
            UnexpectedCodePathError.throw(
              'no stitches found on main thread yet.',
              { threads },
            );
          return new Stitch({
            input: lastStitch.output,
            output: addDuration(isUniDateTime.assure(lastStitch.output), {
              hours: 1,
            }),
          });
        },
      });

      const route = genStitchRoute({
        slug: 'time:get:hour+',
        readme: null,
        sequence: [stitcherGetTime, stitcherAddHours],
      });

      when('the wrong thread is given as an input', () => {
        const threadAuthor = new Thread({
          context: { role: 'author' as const },
          stitches: [],
        });

        then(
          'there should be a compiletime error, when the input.threads doesnt have the desired thread',
          async () => {
            // it also throws an error; but we care about the @ts-expect-error below, since compile time is most important
            await getError(
              enweaveOneRoute(
                // @ts-expect-error: 'author' does not exist in type 'Threads<"main">'.
                { route, threads: { author: threadAuthor } },
                {},
              ),
            );
          },
        );

        then(
          'there should be a compiletime error, when the input.threads does have the desired thread, but it was mislabeled',
          async () => {
            await enweaveOneRoute(
              // @ts-expect-error: Type '"author"' is not assignable to type '"main"'.
              { route, threads: { main: threadAuthor } },
              {},
            );
          },
        );
      });

      when('invoked with desired thread', () => {
        const threadMain = new Thread({
          context: { role: 'main' as const },
          stitches: [],
        });

        then('it should successfully enweave the full route', async () => {
          const { stitch, threads } = await enweaveOneRoute(
            { stitcher: route, threads: { main: threadMain } },
            context,
          );
          console.log(stitch.input);
          console.log(stitch.output);

          // stitch should look right
          expect(isUniDateTime(stitch.output));
          expect(isUniDateTime(stitch.input));
          expect(stitch.output).not.toEqual(stitch.input);

          // stitchee should be updated, too
          expect(threads.main.stitches.length).toEqual(
            threadMain.stitches.length + 2, // 2 stitchers were executed -> plus two stitches
          );
        });
      });
    },
  );

  type OutputFileWrite = { path: string; content: string };
  let routeArtistCodePropose: StitchRoute<
    GStitcher<
      Threads<{
        artist: { tools: string[]; facts: string[] };
        director: Empty;
      }>,
      ContextOpenAI & GStitcher['context'],
      OutputFileWrite
    >
  >;
  given('a route with imagine stitchers (closer to real world usecase)', () => {
    const stitcherCodeFileRead = new StitchStepCompute<
      GStitcher<Threads<{ artist: Empty }>>
    >({
      slug: 'mock:read-stubout',
      readme: null,
      form: 'COMPUTE',
      stitchee: 'artist',
      invoke: () => {
        // e.g., execute tooluse:file:read
        return new Stitch({
          input: null,
          output: `
/**
 * .what = calls the open-meteo weather api
 * .how =
 *   - uses procedural pattern
 *   - fails fast
 */
export const sdkOpenMeteo = {
  getWeather: (input: {...}, context: VisualogicContext & AuthContextOpenMeteo) => {
    ...
  }
}
          `.trim(),
        });
      },
    });

    const stitcherCodeFileWrite = new StitchStepCompute<
      GStitcher<
        Threads<{ artist: Empty }>,
        GStitcher['context'],
        OutputFileWrite
      >
    >({
      slug: 'mock:write-fillout',
      readme: null,
      form: 'COMPUTE',
      stitchee: 'artist',
      invoke: ({ threads }) => {
        // e.g., execute tooluse:file:write
        return new Stitch({
          input: null,
          output: {
            path: '@src/...', // mock that we did so
            content:
              threads.artist.stitches.slice(-1)[0]?.output ??
              UnexpectedCodePathError.throw(
                'expected artist to have had a stitch by now',
              ),
          },
        });
      },
    });

    const route = genStitchRoute({
      slug: 'code:propose',
      readme: null,
      sequence: [
        stitcherCodeFileRead,
        stitcherCodeDiffImagine,
        stitcherCodeFileWrite,
      ],
    });

    // expose the artist code review route, for composition test example below
    routeArtistCodePropose = route;

    when('given the threads required', () => {
      let threads: Threads<{
        artist: { tools: string[]; facts: string[] };
        director: Empty;
      }>;

      beforeAll(async () => {
        threads = {
          artist: await getExampleThreadCodeArtist(),
          director: exampleThreadDirector,
        };
      });

      then(
        'it should successfully execute the stitches as a weave',
        async () => {
          const context = { log: console, ...getContextOpenAI() };

          const output = await enweaveOneRoute(
            {
              route,
              threads,
            },
            context,
          );
          console.log(output);

          // verify that it used conflict markers and wrote the full output
          expect(output.stitch.output.content).toContain('<<<<<<< ORIGINAL'); // per the artist thread's context, it knows the tool of conflict-marker, that it should have used
          expect(output.stitch.output.content).toContain('>>>>>>> MODIFIED');
        },
      );
    });
  });

  let routeCriticCodeReview: StitchRoute<
    GStitcher<
      Threads<{
        artist: Empty;
        director: Empty;
        critic: { tools: string[]; facts: string[] };
      }>,
      ContextOpenAI & GStitcher['context'],
      OutputFileWrite
    >
  >;
  given(
    'a route with imagine stitchers, parallelized (closer to real world usecase)',
    () => {
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
// handle unique
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

// throw if unsupported
throw new UnexpectedCodePathError('unsupported input option');
},
);
          `.trim(),
        },
      });

      const route = genStitchRoute({
        slug: '[critic]<code:review>',
        readme:
          'review a code change; parallelize the perspectives to review from',
        sequence: [
          stitcherCodeFileRead,
          genStitchFanout({
            slug: '[critic]<code:review>.<fanout>[[review]]',
            parallels: [
              genStitcherCodeReview({ scope: 'technical', focus: 'blockers' }),
              genStitcherCodeReview({ scope: 'technical', focus: 'chances' }),
              genStitcherCodeReview({ scope: 'technical', focus: 'praises' }),
              genStitcherCodeReview({ scope: 'functional', focus: 'blockers' }),
              genStitcherCodeReview({ scope: 'functional', focus: 'chances' }),
              genStitcherCodeReview({ scope: 'functional', focus: 'praises' }),
            ],
            concluder: stitcherCodeReviewSummary,
          }),
        ],
      });

      // expose the artist code review route, for composition test example below
      routeCriticCodeReview = route;

      when('given the threads required', () => {
        let threads: Threads<{
          artist: { tools: string[]; facts: string[] };
          director: Empty;
        }>;

        beforeAll(async () => {
          threads = {
            artist: await getExampleThreadCodeArtist(),
            director: exampleThreadDirector,
          };
        });

        then(
          'it should successfully execute the stitches as a weave',
          async () => {
            const context = { log: console, ...getContextOpenAI() };

            const output = await enweaveOneRoute(
              {
                route,
                threads,
              },
              context,
            );
            console.log(output);

            // verify that it used conflict markers and wrote the full output
            expect(output.stitch.output.content).toContain('<<<<<<< ORIGINAL'); // per the artist thread's context, it knows the tool of conflict-marker, that it should have used
            expect(output.stitch.output.content).toContain('>>>>>>> MODIFIED');
          },
        );
      });
    },
  );

  given('a route with subroutes (real world composition example)', () => {
    // define the [artist]<code.propose> subroute

    // define the [critic]<code.review> subroute
    const routeCriticCodeReview = genStitchRoute({
      slug: '[critic]<code.review>',
      readme: 'review a code change; declare feedback and a grade',
      sequence: [stitcherCodeIssuesImagine],
    });

    when('given the threads required', () => {
      let threads: Threads<{
        artist: { tools: string[]; facts: string[] };
        director: Empty;
      }>;

      beforeAll(async () => {
        threads = {
          artist: await getExampleThreadCodeArtist(),
          director: exampleThreadDirector,
        };
      });

      then(
        'it should successfully execute the stitches as a weave',
        async () => {
          const context = { log: console, ...getContextOpenAI() };

          const output = await enweaveOneRoute(
            {
              route,
              threads,
            },
            context,
          );
          console.log(output);

          // verify that it used conflict markers and wrote the full output
          expect(output.stitch.output.content).toContain('<<<<<<< ORIGINAL'); // per the artist thread's context, it knows the tool of conflict-marker, that it should have used
          expect(output.stitch.output.content).toContain('>>>>>>> MODIFIED');
        },
      );
    });
  });
});
