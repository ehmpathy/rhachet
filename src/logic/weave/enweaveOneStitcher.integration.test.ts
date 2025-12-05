import { asUniDateTime, toMilliseconds } from '@ehmpathy/uni-time';
import { UnexpectedCodePathError } from 'helpful-errors';
import { given, then, when } from 'test-fns';
import type { Empty } from 'type-fns';
import { getUuid } from 'uuid-fns';

import { genContextLogTrail } from '../../.test/genContextLogTrail';
import { getContextOpenAI } from '../../.test/getContextOpenAI';
import { genStitcherCodeFileRead } from '../../.test/stitchers/genStitcherCodeFileRead';
import { genStitcherCodeFileWrite } from '../../.test/stitchers/genStitcherCodeFileWrite';
import { genStitcherCodeReview } from '../../.test/stitchers/genStitcherCodeReviewImagine';
import { stitcherCodeDiffImagine } from '../../.test/stitchers/stitcherCodeDiffImagine';
import { getExampleThreadCodeArtist } from '../../.test/threads/codeArtist';
import { getExampleThreadCodeCritic } from '../../.test/threads/codeCritic';
import { exampleThreadDirector } from '../../.test/threads/director';
import type { GStitcher } from '../../domain/objects/Stitcher';
import { StitchStepCompute } from '../../domain/objects/StitchStep';
import type { Threads } from '../../domain/objects/Threads';
import { genContextStitchTrail } from '../context/genContextStitchTrail';
import type { ContextOpenAI } from '../stitch/adapters/imagineViaOpenAI';
import { genThread } from '../thread/genThread';
import { asStitcher } from './compose/asStitcher';
import { asStitcherFlat } from './compose/asStitcherFlat';
import { genStitchCycle } from './compose/genStitchCycle';
import { genStitchFanout } from './compose/genStitchFanout';
import { genStitchRoute } from './compose/genStitchRoute';
import { enweaveOneStitcher } from './enweaveOneStitcher';

jest.setTimeout(toMilliseconds({ minutes: 3 }));

describe('enweaveOneStitcher', () => {
  const baseContext = {
    ...genContextStitchTrail(),
    ...genContextLogTrail(),
  };
  const context = { ...baseContext, ...getContextOpenAI() };

  // takes a while; skip by default
  given.runIf(!process.env.CI)(
    'a review loop that proposes, reviews, summarizes, and judges code improvement until blockers are gone or 3 attempts max',
    () => {
      const stitcherCodeReviewConcluder = new StitchStepCompute<
        GStitcher<
          Threads<{ critic: Empty }, 'multiple'>,
          typeof context,
          { blockers: string[]; summary: string[] }
        >
      >({
        slug: '[critic]<review:concluder>',
        readme: null,
        form: 'COMPUTE',
        stitchee: 'critic',
        invoke: ({ threads }) => {
          const summary = threads.critic.peers
            .map((peer) => peer.stitches.slice(-1)[0]?.output)
            .filter(Boolean) as string[];
          const blockers = summary.filter((x) => x.includes('blocker'));
          return { input: summary, output: { blockers, summary } };
        },
      });

      const stitcherCodeReviewFanout = asStitcher(
        genStitchFanout({
          slug: '[critic]<code:review>.<fanout>[[review]]',
          readme: null,
          parallels: [
            genStitcherCodeReview({ scope: 'technical', focus: 'blockers' }),
            // genStitcherCodeReview({ scope: 'technical', focus: 'chances' }),
            // genStitcherCodeReview({ scope: 'technical', focus: 'praises' }),
            genStitcherCodeReview({ scope: 'functional', focus: 'blockers' }),
            // genStitcherCodeReview({ scope: 'functional', focus: 'chances' }),
            // genStitcherCodeReview({ scope: 'functional', focus: 'praises' }),
          ],
          concluder: stitcherCodeReviewConcluder,
        }),
      );

      const directorSummarize = new StitchStepCompute<
        GStitcher<
          Threads<{ director: Empty; critic: Empty }>,
          typeof context,
          { directive: string; blockers: string[] }
        >
      >({
        slug: '[director]<summarize>',
        form: 'COMPUTE',
        stitchee: 'director',
        readme: 'turn critic summary into a director directive',
        invoke: ({ threads }) => {
          const last = threads.critic.stitches.slice(-1)[0]?.output;
          return {
            input: last,
            output: {
              directive: `resolve blockers, blockers: ${JSON.stringify(
                last?.blockers,
                null,
                2,
              )}`,
              blockers: last?.blockers,
            },
          };
        },
      });

      const artistCodeProposeRoute = asStitcher(
        genStitchRoute({
          slug: '[artist]<code:propose>',
          readme: 'imagine diff, then write to file',
          sequence: [
            stitcherCodeDiffImagine,
            genStitcherCodeFileWrite<'artist', Threads<{ artist: Empty }>>({
              stitchee: 'artist',
            }),
          ],
        }),
      );

      const criticCodeReviewRoute = asStitcher(
        genStitchRoute({
          slug: '[critic]<code:review>',
          readme: 'review the code from multiple perspectives',
          sequence: [
            genStitcherCodeFileRead<
              'critic',
              Threads<{ artist: Empty; critic: Empty }>
            >({
              stitchee: 'critic',
              output: ({ threads }) =>
                (threads.artist?.stitches.slice(-1)[0]?.output as any) ??
                UnexpectedCodePathError.throw(
                  'expected to find file write output stitch',
                  { threads },
                ),
            }),
            stitcherCodeReviewFanout,
          ],
        }),
      );

      const codeIterateRoute = asStitcherFlat<
        GStitcher<
          Threads<{
            artist: { tools: string[]; facts: string[] };
            critic: { tools: string[]; facts: string[] };
            director: Empty;
          }>,
          ContextOpenAI & GStitcher['context']
        >
      >(
        genStitchRoute({
          slug: '[code:iterate]',
          readme: 'one pass of propose + review + summarize',
          sequence: [
            artistCodeProposeRoute,
            criticCodeReviewRoute,
            directorSummarize,
          ],
        }),
      );

      const judgeDeciderNextStep = new StitchStepCompute<
        GStitcher<
          Threads<{ critic: Empty; judge: Empty }>,
          typeof context,
          { choice: 'release' | 'repeat' }
        >
      >({
        slug: '[judge]<decide:release?>',
        form: 'COMPUTE',
        stitchee: 'judge',
        readme: 'release if more than 3 reviews',
        invoke: ({ threads }) => {
          const choice =
            threads.critic.stitches.length >= 3 ? 'release' : 'repeat';
          return {
            input: { stitches: threads.critic.stitches.length },
            output: { choice },
          };
        },
      });

      const mechanicCodeDiffIterateUntilRelease = asStitcher(
        genStitchCycle({
          slug: '[mechanic]<code:iterate-until-release>',
          readme: 'iterate until no blockers or max 3 tries',
          repeatee: codeIterateRoute,
          decider: judgeDeciderNextStep,
        }),
      );

      const stitcherRestitchLatestArtistOutput = new StitchStepCompute<
        GStitcher<
          Threads<{ artist: Empty }>,
          typeof context,
          { restitched: string }
        >
      >({
        slug: '[artist]<restitch:latest>',
        readme: 'Restitch artists latest output for final record',
        form: 'COMPUTE',
        stitchee: 'artist',
        invoke: ({ threads }) => {
          const latest = threads.artist.stitches.slice(-1)[0];
          if (!latest?.output || typeof latest.output !== 'object')
            throw new Error('No valid artist output to restitch');
          return latest;
        },
      });

      const rootRouteCodeDiff = genStitchRoute({
        slug: '[mechanic]<code:diff>',
        readme:
          'read initial file, then iterate against directive until no blockers or 3 tries',
        sequence: [
          genStitcherCodeFileRead<'artist', Threads<{ artist: Empty }>>({
            stitchee: 'artist',
            output: {
              path: '__path__',
              content: `
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
            },
          }),
          mechanicCodeDiffIterateUntilRelease,
          stitcherRestitchLatestArtistOutput,
        ] as const,
      });
      console.log(JSON.stringify(rootRouteCodeDiff, null, 2));

      when(
        'executing the full review loop with realistic threads for artist, critic, director, and judge',
        () => {
          let threads: Threads<{
            artist: { tools: string[]; facts: string[] };
            critic: { tools: string[]; facts: string[] };
            director: Empty;
            judge: Empty;
          }>;

          beforeAll(async () => {
            threads = {
              artist: await getExampleThreadCodeArtist(),
              critic: await getExampleThreadCodeCritic(),
              director: exampleThreadDirector.clone({
                stitches: [
                  {
                    uuid: getUuid(),
                    createdAt: asUniDateTime(new Date()),
                    input: null,
                    output: { directive: 'fillout the stubout' },
                    stitcher: null,
                    trail: null,
                  }, // start with this directive
                ],
              }),
              judge: genThread({ role: 'judge' }),
            };
          });

          then('it should have a readable route plan declared', () => {
            // expect(rootRouteCodeDiff).toMatchSnapshot();
            expect(
              JSON.stringify(rootRouteCodeDiff, null, 2),
            ).toMatchSnapshot();
          });

          then(
            'it should exit after 3 cycles if blockers are always returned',
            async () => {
              const output = await enweaveOneStitcher(
                { stitcher: rootRouteCodeDiff, threads },
                context,
              );

              expect(output.threads.artist.stitches.length).toBeGreaterThan(0);
              expect(output.threads.critic.stitches.length).toBeGreaterThan(0);
              expect(output.threads.judge.stitches.length).toBeGreaterThan(0);

              expect(
                JSON.stringify(
                  deepReplaceShortUuidsWithLetters(
                    deepOmit(output, [
                      'occurredAt',
                      'createdAt',
                      'input',
                      'output',
                      'tools',
                      'facts',
                      'uuid',
                      'stitchUuid',
                    ]),
                  ),
                  null,
                  2,
                ),
              ).toMatchSnapshot();
            },
          );
        },
      );
    },
  );
});

function deepOmit(obj: unknown, keys: string[]): unknown {
  if (Array.isArray(obj)) {
    return obj.map((item) => deepOmit(item, keys));
  }

  if (obj !== null && typeof obj === 'object') {
    const raw = { ...obj };
    for (const key of keys) {
      delete (raw as any)[key];
    }

    return Object.fromEntries(
      Object.entries(raw).map(([k, v]) => [k, deepOmit(v, keys)]),
    );
  }

  return obj;
}

const shortUuidRegex = /\(([0-9a-f]{7})\)/gi;

function getLetterLabel(index: number): string {
  let label = '';
  while (index >= 0) {
    label = String.fromCharCode((index % 26) + 65) + label;
    index = Math.floor(index / 26) - 1;
  }
  return label;
}

function deepReplaceShortUuidsWithLetters(obj: unknown): unknown {
  const seen = new Map<string, string>();
  let index = 0;

  const replace = (value: unknown): unknown => {
    if (typeof value === 'string') {
      return value.replace(shortUuidRegex, (_, shortId) => {
        const key = shortId.toLowerCase();
        if (!seen.has(key)) {
          seen.set(key, getLetterLabel(index++));
        }
        return `(${seen.get(key)!})`;
      });
    }

    if (Array.isArray(value)) {
      return value.map(replace);
    }

    if (value !== null && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([k, v]) => [k, replace(v)]),
      );
    }

    return value;
  };

  return replace(obj);
}
