import { UnexpectedCodePathError } from 'helpful-errors';
import { asIsoTimeStamp } from 'iso-time';
import { getUuid } from 'uuid-fns';

import { Stitch } from '@src/domain.objects/Stitch';
import { asStitcherDesc, type GStitcher } from '@src/domain.objects/Stitcher';
import { StitchSetEvent } from '@src/domain.objects/StitchSetEvent';
import type { StitchStep } from '@src/domain.objects/StitchStep';
import {
  asStitchTrailDesc,
  StitchTrailMarker,
} from '@src/domain.objects/StitchTrail';
import { Thread } from '@src/domain.objects/Thread';
import type { Threads } from '@src/domain.objects/Threads';

import { invokeImagineStitcher } from './invokeImagineStitcher';

/**
 * .what = extracts the base thread to stitch into
 * .why  = handles both single and multiple thread formats
 */
export const getStitchee = <T>(
  thread: Thread<T> | { seed: Thread<T>; peers: Thread<T>[] },
): Thread<T> => {
  if ('seed' in thread && 'peers' in thread) {
    return thread.seed;
  }
  return thread;
};

/**
 * .what = normalizes a threads object to the 'single' shape
 * .why = simplifies downstream usage that expects Threads<any, 'single'>
 */
export const normThreadsToSingle = <TThreads extends Threads<any, any>>(
  input: TThreads,
): ReqThreadsSingle<TThreads> => {
  const result = {} as ReqThreadsSingle<TThreads>;
  for (const key in input) {
    const value = input[key]!;
    (result as any)[key] =
      'seed' in value && 'peers' in value
        ? value.seed // reduce multiple to seed
        : value; // already single
  }
  return result;
};
type ReqThreadsSingle<T> =
  T extends Threads<infer TContextDict, any>
    ? Threads<TContextDict, 'single'>
    : never;

/**
 * .what = enstitche a single stitch step to produce a stitch
 */
export const enstitch = async <
  TStitcher extends GStitcher<
    // we declare Threads<any, any> explicitly here to ensure that this supports Threads<any, multiple>
    Threads<any, any>,
    any,
    any
  >,
>(
  input: {
    stitcher: StitchStep<TStitcher>;
    threads: TStitcher['threads'];
  },
  context: TStitcher['context'],
): Promise<
  StitchSetEvent<ReqThreadsSingle<TStitcher['threads']>, TStitcher['output']>
> => {
  // enstitch the output
  const result: Pick<
    Stitch<TStitcher['output']>,
    'input' | 'output'
  > = await (() => {
    // if the stitcher is of type "compute", then execute the computation; // todo: add observability on duration
    if (input.stitcher.form === 'COMPUTE')
      return input.stitcher.invoke({ threads: input.threads }, context);

    // if the stitcher is of type "imagine", then execute the imagination // todo: add observability
    if (input.stitcher.form === 'IMAGINE')
      return invokeImagineStitcher(
        { stitcher: input.stitcher, threads: input.threads },
        context,
      );

    // otherwise, unsupported and unexpected; should have been compiletime prevented
    throw new UnexpectedCodePathError(
      'why did we get an unsupported stitcher.form?',
      { stitcher: input.stitcher },
    );
  })();
  const stitchUuid = getUuid();
  const stitch = Stitch.build({
    uuid: stitchUuid,
    createdAt: asIsoTimeStamp(new Date()),
    stitcher: asStitcherDesc({ stitcher: input.stitcher }),
    trail: {
      desc: asStitchTrailDesc({
        trail: [
          ...context.stitch.trail,
          StitchTrailMarker.build({
            stitchUuid,
            stitcherSlug: input.stitcher.slug,
          }),
        ],
      }),
      // markers: context.stitch.trail, // todo: enable via context verbosity control
    },
    input: result.input,
    output: result.output,
  });

  // mutate the input thread to attach the new stitch
  const stitcheeKey = input.stitcher.stitchee;
  const stitcheeBefore = Thread.build(
    getStitchee(
      input.threads[stitcheeKey] ??
        UnexpectedCodePathError.throw(
          'could not find stitchee from input.threads',
        ),
    ),
  );
  const stitcheeAfter = stitcheeBefore.clone({
    stitches: [...stitcheeBefore.stitches, stitch], // append the latest stitch
  });

  // declare that this stitch has been set into "the fabric of reality"; energy => stitch
  const event = StitchSetEvent.build<
    StitchSetEvent<ReqThreadsSingle<TStitcher['threads']>, TStitcher['output']> // propagate the type:inference
  >({
    occurredAt: asIsoTimeStamp(new Date()),
    stitch,
    threads: normThreadsToSingle({
      ...input.threads,
      [stitcheeKey]: stitcheeAfter,
    }),
  });

  // emit events via stitch trail stream, if requested
  if (context.stitch.stream) await context.stitch.stream.emit(event);

  // and bubble it up
  return event;
};
