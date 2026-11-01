import { MalfunctionError } from 'helpful-errors';
import { given, then, useBeforeAll, when } from 'test-fns';
import type { Empty } from 'type-fns';

import { genContextLogTrail } from '@src/.test/genContextLogTrail';
import { getContextOpenAI } from '@src/.test/getContextOpenAI';
import { describeBrainLiveOnDemand } from '@src/.test/infra/describeBrainLiveOnDemand';
import { stitcherCodeDiffImagine } from '@src/.test/stitchers/stitcherCodeDiffImagine';
import { getExampleThreadCodeArtist } from '@src/.test/threads/codeArtist';
import { exampleThreadDirector } from '@src/.test/threads/director';
import type { GStitcher } from '@src/domain.objects/Stitcher';
import { StitchStepCompute } from '@src/domain.objects/StitchStep';
import type { Threads } from '@src/domain.objects/Threads';
import { genContextStitchTrail } from '@src/domain.operations/context/genContextStitchTrail';

import { genStitchRoute } from './compose/genStitchRoute';
import { enweaveOneRoute } from './enweaveOneRoute';

// the whole file is tier 3: its imagine case calls a live brain; the compute cases sit in
//   enweaveOneRoute.integration.test.ts and run on every push
describeBrainLiveOnDemand('enweaveOneRoute, with a live brain', () => {
  const context = {
    ...genContextStitchTrail(),
    ...genContextLogTrail(),
    ...getContextOpenAI(),
  };
  type OutputFileWrite = { path: string; content: string };
  given(
    '[case1] a route with imagine stitchers (closer to real world usecase)',
    () => {
      const stitcherCodeFileRead = new StitchStepCompute<
        GStitcher<Threads<{ artist: Empty }>>
      >({
        slug: 'mock:read-stubout',
        readme: null,
        form: 'COMPUTE',
        stitchee: 'artist',
        invoke: () => {
          // e.g., execute tooluse:file:read
          return {
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
          };
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
          return {
            input: null,
            output: {
              path: '@src/...', // mock that we did so
              content:
                threads.artist.stitches.slice(-1)[0]?.output ??
                MalfunctionError.throw(
                  'expected artist to have had a stitch by now',
                ),
            },
          };
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

      when(
        '[t0] the route is enwoven with the artist and director threads',
        () => {
          // .note = useBeforeAll hands back a proxy over a Record, so the threads ride a field
          const scene = useBeforeAll(
            async (): Promise<{
              threads: Threads<{
                artist: { tools: string[]; facts: string[] };
                director: Empty;
              }>;
            }> => ({
              threads: {
                artist: await getExampleThreadCodeArtist(),
                director: exampleThreadDirector,
              },
            }),
          );

          then(
            'it should successfully execute the stitches as a weave',
            async () => {
              const output = await enweaveOneRoute(
                {
                  stitcher: route,
                  threads: scene.threads,
                },
                context,
              );
              console.log(output);

              // verify that it used conflict markers and wrote the full output
              expect(output.stitch.output.content).toContain(
                '<<<<<<< ORIGINAL',
              ); // per the artist thread's context, it knows the tool of conflict-marker, that it should have used
              expect(output.stitch.output.content).toContain(
                '>>>>>>> MODIFIED',
              );
            },
          );
        },
      );
    },
  );
});
