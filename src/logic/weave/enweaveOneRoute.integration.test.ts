import {
  addDuration,
  asUniDateTime,
  isUniDateTime,
  UniDateTime,
} from '@ehmpathy/uni-time';
import { getError, UnexpectedCodePathError } from 'helpful-errors';
import { given, then, when } from 'test-fns';
import { Empty } from 'type-fns';

import { Stitch } from '../../domain/objects/Stitch';
import { GStitcher, StitcherCompute } from '../../domain/objects/Stitcher';
import { Thread } from '../../domain/objects/Thread';
import { Threads } from '../../domain/objects/Threads';
import { enweaveOneRoute } from './enweaveOneRoute';
import { genStitchRoute } from './route/genStitchRoute';

describe('enweaveOneRoute', () => {
  given(
    'a route with compute stitchers (fast and no api keys required)',
    () => {
      const stitcherGetTime = new StitcherCompute<
        GStitcher<Threads<'main'>, Empty, UniDateTime>
      >({
        form: 'COMPUTE',
        stitchee: 'main',
        invoke: () =>
          new Stitch({ input: null, output: asUniDateTime(new Date()) }),
      });
      const stitcherAddHours = new StitcherCompute<
        GStitcher<Threads<'main'>, Empty, UniDateTime>
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
});
