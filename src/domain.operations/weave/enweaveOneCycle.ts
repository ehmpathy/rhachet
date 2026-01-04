import { HelpfulError, UnexpectedCodePathError } from 'helpful-errors';
import {
  addDuration,
  asIsoTimeStamp,
  getDuration,
  type IsoTimeStamp,
  isIsoTimeStampRange,
} from 'iso-time';

import type { StitchCycle } from '@src/domain.objects/StitchCycle';
import type { GStitcher } from '@src/domain.objects/Stitcher';
import { StitchSetEvent } from '@src/domain.objects/StitchSetEvent';
import { withStitchTrail } from '@src/domain.operations/stitch/withStitchTrail';

import { enweaveOneStitcher } from './enweaveOneStitcher';

export class StitcherHaltedError extends HelpfulError {}

/**
 * .what = executes a StitchCycle by looping repeatee until the decider chooses to stop
 * .why =
 *   - enables iterative behaviors (e.g. retry, polling, feedback loops)
 *   - separates logic of repeated step vs control logic (decider)
 * .note =
 *   - will halt by default after 100 cycles or 1 hr, configurable
 *   - if halted, will fail fast; can resume halted weaves on demand, after repair
 */
export const enweaveOneCycle = withStitchTrail(
  async <TStitcher extends GStitcher>(
    input: {
      stitcher: StitchCycle<TStitcher>;
      threads: TStitcher['threads'];
    },
    context: TStitcher['context'],
  ): Promise<StitchSetEvent<TStitcher['threads'], TStitcher['output']>> => {
    const { repeatee, decider, halter } = input.stitcher;

    // declare the state we'll mutate while the stitch is in progress
    const progress: {
      beganAt: IsoTimeStamp;
      threads: TStitcher['threads'];
      repetitions: number;
      stitch: TStitcher['output'] | null;
    } = {
      beganAt: asIsoTimeStamp(new Date()),
      repetitions: 0,
      stitch: null,
      threads: input.threads,
    };

    // declare mech to fulfil halter behavior
    const threshold = {
      repetitions: halter?.threshold?.repetitions ?? 100,
      duration: halter?.threshold?.duration ?? { hours: 1 },
    };
    const hasBreached = () => {
      if (progress.repetitions >= threshold.repetitions) return true;
      const now = asIsoTimeStamp(new Date());
      const deadline = addDuration(progress.beganAt, threshold.duration);
      return now > deadline;
    };
    const throwHalted = ({ reason }: { reason: 'DECIDED' | 'BREACHED' }) =>
      StitcherHaltedError.throw(
        `Cycle halted due to ${
          reason === 'DECIDED' ? 'decider output.' : 'threshold breach'
        } (${reason}). See the log event stream output for details.`,
        {
          reason,
          threshold,
          progress: {
            ...progress,
            duration: getDuration({
              of: {
                range: isIsoTimeStampRange.assure({
                  since: progress.beganAt,
                  until: asIsoTimeStamp(new Date()),
                }),
              },
            }),
          },
        },
      );

    // loop until the decider chooses to stop
    while (true) {
      // fail fast if the halter's threshold was breached
      if (hasBreached()) throwHalted({ reason: 'BREACHED' });

      // run the repeatee step
      const { stitch: repeateeStitch, threads: afterRepeatee } =
        await enweaveOneStitcher(
          { stitcher: repeatee, threads: progress.threads },
          context,
        );

      // update progress state
      progress.stitch = repeateeStitch;
      progress.threads = afterRepeatee;
      progress.repetitions++;

      // run the decider to determine whether to continue
      const { stitch: deciderStitch, threads: afterDecider } =
        await enweaveOneStitcher(
          { stitcher: decider, threads: progress.threads },
          context,
        );
      const choice = deciderStitch.output?.choice;
      if (!choice) {
        UnexpectedCodePathError.throw('no choice returned from cycle decider', {
          deciderStitch,
        });
      }

      // update threads with decider result
      progress.threads = afterDecider;

      // determine next action
      if (choice === 'halt') throwHalted({ reason: 'DECIDED' });
      if (choice === 'repeat') continue;
      if (choice === 'release') break;
      UnexpectedCodePathError.throw('unexpected choice from decider', {
        choice,
        deciderStitch,
      });
    }

    // declare the final result as a StitchSetEvent
    return StitchSetEvent.build({
      occurredAt: asIsoTimeStamp(new Date()),
      stitch:
        progress.stitch ??
        UnexpectedCodePathError.throw(
          'atleast one output stitch expected by now',
        ),
      threads: progress.threads,
    });
  },
);
