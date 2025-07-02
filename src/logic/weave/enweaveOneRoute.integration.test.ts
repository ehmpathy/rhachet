import {
  addDuration,
  asUniDateTime,
  isUniDateTime,
  UniDateTime,
} from '@ehmpathy/uni-time';
import { getError, UnexpectedCodePathError } from 'helpful-errors';
import { given, then, when } from 'test-fns';
import { Empty } from 'type-fns';

import { getContextOpenAI } from '../../__test_assets__/getContextOpenAI';
import { stitcherCodeDiffImagine } from '../../__test_assets__/stitchers/stitcherCodeDiffImagine';
import { getExampleThreadCodeArtist } from '../../__test_assets__/threads/codeArtist';
import { exampleThreadDirector } from '../../__test_assets__/threads/director';
import { Stitch } from '../../domain/objects/Stitch';
import { GStitcher, StitcherCompute } from '../../domain/objects/Stitcher';
import { Thread } from '../../domain/objects/Thread';
import { Threads } from '../../domain/objects/Threads';
import { enweaveOneRoute } from './enweaveOneRoute';
import { genStitchRoute } from './route/genStitchRoute';

describe('enweaveOneRoute', () => {
  given(
    'a route with compute stitchers (fast and no api keys required); same threads required for each stitcher',
    () => {
      const stitcherGetTime = new StitcherCompute<
        GStitcher<Threads<{ main: Empty }>, Empty, UniDateTime>
      >({
        form: 'COMPUTE',
        stitchee: 'main',
        invoke: () =>
          new Stitch({ input: null, output: asUniDateTime(new Date()) }),
      });
      const stitcherAddHours = new StitcherCompute<
        GStitcher<Threads<{ main: Empty }>, Empty, UniDateTime>
      >({
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
        name: 'get hour from now',
        description: null,
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
            { route, threads: { main: threadMain } },
            {},
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

  given('a route with imagine stitchers (closer to real world usecase)', () => {
    type OutputFileWrite = { path: string; content: string };

    const stitcherCodeFileRead = new StitcherCompute<
      GStitcher<Threads<{ artist: Empty }>, Empty, string>
    >({
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

    const stitcherCodeFileWrite = new StitcherCompute<
      GStitcher<Threads<{ artist: Empty }>, Empty, OutputFileWrite>
    >({
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
      name: 'propose a code change; imagine + file:write it',
      description: null,
      sequence: [
        stitcherCodeFileRead,
        stitcherCodeDiffImagine,
        stitcherCodeFileWrite,
      ],
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
