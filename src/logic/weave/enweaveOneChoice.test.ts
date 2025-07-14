import { asUniDateTime } from '@ehmpathy/uni-time';
import { given, then, when } from 'test-fns';
import { Empty } from 'type-fns';

import { genContextLogTrail } from '../../.test/genContextLogTrail';
import { genContextStitchTrail } from '../../.test/genContextStitchTrail';
import { StitchStepCompute } from '../../domain/objects/StitchStep';
import { GStitcher } from '../../domain/objects/Stitcher';
import { Threads } from '../../domain/objects/Threads';
import { genThread } from '../thread/genThread';
import { asStitcher } from './compose/asStitcher';
import { genStitchChoice } from './compose/genStitchChoice';
import { enweaveOneChoice } from './enweaveOneChoice';

describe('enweaveOneChoice', () => {
  const context = {
    ...genContextLogTrail(),
    ...genContextStitchTrail(),
  };

  given('a release decision with 3 options: release, iterate, abort', () => {
    const stitcherOptionRelease = new StitchStepCompute<
      GStitcher<Threads<{ main: Empty }>, GStitcher['context'], 'released'>
    >({
      slug: 'stitcherOptionRelease',
      readme: 'Push this to prod',
      form: 'COMPUTE',
      stitchee: 'main',
      invoke: () => ({ input: null, output: 'released' }),
    });

    const stitcherOptionIterate = new StitchStepCompute<
      GStitcher<Threads<{ main: Empty }>, GStitcher['context'], 'iterated'>
    >({
      slug: 'stitcherOptionIterate',
      readme: 'Keep improving before release',
      form: 'COMPUTE',
      stitchee: 'main',
      invoke: () => ({ input: null, output: 'iterated' }),
    });

    const stitcherOptionAbort = new StitchStepCompute<
      GStitcher<Threads<{ main: Empty }>, GStitcher['context'], 'aborted'>
    >({
      slug: 'stitcherOptionAbort',
      readme: 'Stop this effort',
      form: 'COMPUTE',
      stitchee: 'main',
      invoke: () => ({ input: null, output: 'aborted' }),
    });

    const stitcherDecideNextStep = new StitchStepCompute<
      GStitcher<
        Threads<{ main: Empty }>,
        GStitcher['context'],
        { choice: { slug: string } }
      >
    >({
      slug: 'stitcherDecideNextStep',
      readme: 'Choose next step based on quality',
      form: 'COMPUTE',
      stitchee: 'main',
      invoke: () => ({
        input: null,
        output: { choice: { slug: 'stitcherOptionIterate' } },
      }),
    });

    const chooseNextStep = genStitchChoice({
      slug: 'chooseNextStep',
      readme: 'Should we now release, iterate, or abort?',
      decider: stitcherDecideNextStep,
      options: [
        stitcherOptionRelease,
        stitcherOptionIterate,
        stitcherOptionAbort,
      ],
    });

    when('evaluating whether to release', () => {
      const threads: Threads<{ main: Empty }> = {
        main: genThread({ role: 'main' }),
      };

      then('it should select "iterate" as next step', async () => {
        const result = await enweaveOneChoice(
          {
            stitcher: chooseNextStep,
            threads,
          },
          context,
        );

        console.log(JSON.stringify(result, null, 2));

        expect(result.stitch.output).toBe('iterated');
        expect(result.threads.main.stitches.length).toBe(2);
        expect(result.occurredAt).toEqual(asUniDateTime(result.occurredAt));
      });
    });
  });

  given('a nested decision tree for triaging a home issue', () => {
    // Leaf stitchers
    const stitcherOptionPlumberUrgent = new StitchStepCompute<
      GStitcher<
        Threads<{ main: Empty }>,
        GStitcher['context'],
        'plumber-urgent'
      >
    >({
      slug: 'plumber-urgent',
      readme: null,
      form: 'COMPUTE',
      stitchee: 'main',
      invoke: () => ({ input: null, output: 'plumber-urgent' }),
    });

    const stitcherOptionPlumberSchedule = new StitchStepCompute<
      GStitcher<
        Threads<{ main: Empty }>,
        GStitcher['context'],
        'inspection-scheduled'
      >
    >({
      slug: 'inspect-later',
      readme: null,
      form: 'COMPUTE',
      stitchee: 'main',
      invoke: () => ({ input: null, output: 'inspection-scheduled' }),
    });

    const stitcherOptionElectricianRefer = new StitchStepCompute<
      GStitcher<Threads<{ main: Empty }>, GStitcher['context'], 'refer-utility'>
    >({
      slug: 'refer-utility',
      readme: null,
      form: 'COMPUTE',
      stitchee: 'main',
      invoke: () => ({ input: null, output: 'refer-utility' }),
    });

    const stitcherOptionElectricianDispatch = new StitchStepCompute<
      GStitcher<
        Threads<{ main: Empty }>,
        GStitcher['context'],
        'dispatch-electrician'
      >
    >({
      slug: 'dispatch-electrician',
      readme: null,
      form: 'COMPUTE',
      stitchee: 'main',
      invoke: () => ({ input: null, output: 'dispatch-electrician' }),
    });

    // Inner choice for "leaking water"
    const leakDecider = new StitchStepCompute<
      GStitcher<
        Threads<{ main: Empty }>,
        GStitcher['context'],
        { choice: { slug: string } }
      >
    >({
      slug: 'decide-leak-type',
      readme: null,
      form: 'COMPUTE',
      stitchee: 'main',
      invoke: () => ({
        input: null,
        output: { choice: { slug: 'inspect-later' } },
      }),
    });

    const leakChoice = genStitchChoice({
      slug: 'choice:leak',
      readme: null,
      decider: leakDecider,
      options: [stitcherOptionPlumberUrgent, stitcherOptionPlumberSchedule],
    });

    // Root decision tree
    const rootDecider = new StitchStepCompute<
      GStitcher<
        Threads<{ main: Empty }>,
        GStitcher['context'],
        { choice: { slug: string } }
      >
    >({
      slug: 'decide-main-issue',
      readme: null,
      form: 'COMPUTE',
      stitchee: 'main',
      invoke: () => ({
        input: null,
        output: { choice: { slug: 'choice:leak' } },
      }),
    });

    const rootChoice = genStitchChoice({
      slug: 'choice:root',
      readme: 'What kind of issue is this?',
      decider: rootDecider,
      options: [
        asStitcher(leakChoice),
        stitcherOptionElectricianRefer,
        stitcherOptionElectricianDispatch,
      ],
    });

    when('executing a multi-level decision tree', () => {
      const threads: Threads<{ main: Empty }> = {
        main: genThread({ role: 'main' }),
      };

      then(
        'it should follow nested decisions and reach final output',
        async () => {
          const result = await enweaveOneChoice(
            {
              stitcher: rootChoice,
              threads,
            },
            context,
          );

          expect(result.stitch.output).toEqual('inspection-scheduled');
          expect(result.threads.main.stitches.length).toBeGreaterThanOrEqual(2);
          expect(result.occurredAt).toEqual(asUniDateTime(result.occurredAt));
        },
      );

      then('it should error if decider picks an invalid slug', async () => {
        const badDecider = new StitchStepCompute<
          GStitcher<
            Threads<{ main: Empty }>,
            GStitcher['context'],
            { choice: { slug: string } }
          >
        >({
          slug: 'bad-decider',
          readme: null,
          form: 'COMPUTE',
          stitchee: 'main',
          invoke: () => ({
            input: null,
            output: { choice: { slug: 'not-real' } },
          }),
        });

        const brokenChoice = genStitchChoice({
          slug: 'broken-choice',
          readme: null,
          decider: badDecider,
          options: [stitcherOptionPlumberUrgent],
        });

        await expect(
          enweaveOneChoice(
            {
              stitcher: brokenChoice,
              threads,
            },
            context,
          ),
        ).rejects.toThrow('could not find chosen option');
      });
    });
  });
});
