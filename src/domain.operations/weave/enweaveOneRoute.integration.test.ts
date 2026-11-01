import { getError, MalfunctionError } from 'helpful-errors';
import {
  addDuration,
  asIsoTimeStamp,
  type IsoTimeStamp,
  isIsoTimeStamp,
} from 'iso-time';
import { given, then, when } from 'test-fns';
import type { Empty } from 'type-fns';

import { genContextLogTrail } from '@src/.test/genContextLogTrail';
import type { GStitcher } from '@src/domain.objects/Stitcher';
import { StitchStepCompute } from '@src/domain.objects/StitchStep';
import { Thread } from '@src/domain.objects/Thread';
import type { Threads } from '@src/domain.objects/Threads';
import { genContextStitchTrail } from '@src/domain.operations/context/genContextStitchTrail';

import { genStitchRoute } from './compose/genStitchRoute';
import { enweaveOneRoute } from './enweaveOneRoute';

describe('enweaveOneRoute', () => {
  const context = {
    ...genContextStitchTrail(),
    ...genContextLogTrail(),
  };
  given(
    'a route with compute stitchers (fast and no api keys required); same threads required for each stitcher',
    () => {
      const stitcherGetTime = new StitchStepCompute<
        GStitcher<Threads<{ main: Empty }>, GStitcher['context'], IsoTimeStamp>
      >({
        slug: 'get-time',
        readme: null,
        form: 'COMPUTE',
        stitchee: 'main',
        invoke: () => ({ input: null, output: asIsoTimeStamp(new Date()) }),
      });
      const stitcherAddHours = new StitchStepCompute<
        GStitcher<Threads<{ main: Empty }>, GStitcher['context'], IsoTimeStamp>
      >({
        slug: 'add-hours',
        readme: null,
        form: 'COMPUTE',
        stitchee: 'main',
        invoke: ({ threads }) => {
          const lastStitch =
            threads.main.stitches.slice(-1)[0] ??
            MalfunctionError.throw('no stitches found on main thread yet.', {
              threads,
            });
          return {
            input: lastStitch.output,
            output: addDuration(isIsoTimeStamp.assure(lastStitch.output), {
              hours: 1,
            }),
          };
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
                { stitcher: route, threads: { author: threadAuthor } },
                context,
              ),
            );
          },
        );

        then(
          'there should be a compiletime error, when the input.threads does have the desired thread, but it was mislabeled',
          async () => {
            await enweaveOneRoute(
              // @ts-expect-error: Type '"author"' is not assignable to type '"main"'.
              { stitcher: route, threads: { main: threadAuthor } },
              context,
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
          expect(isIsoTimeStamp(stitch.output));
          expect(isIsoTimeStamp(stitch.input));
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
