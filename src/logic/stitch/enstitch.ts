import { asUniDateTime } from '@ehmpathy/uni-time';
import { UnexpectedCodePathError } from 'helpful-errors';

import { Stitch } from '../../domain/objects/Stitch';
import { StitchSetEvent } from '../../domain/objects/StitchSetEvent';
import { StitchStep } from '../../domain/objects/StitchStep';
import { GStitcher } from '../../domain/objects/Stitcher';
import { Thread } from '../../domain/objects/Thread';
import { Threads } from '../../domain/objects/Threads';
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
type ReqThreadsSingle<T> = T extends Threads<infer TContextDict, any>
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
  const stitch: Stitch<TStitcher['output']> = await (() => {
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

  // return the updates
  return StitchSetEvent.build<
    StitchSetEvent<ReqThreadsSingle<TStitcher['threads']>, TStitcher['output']>,
    StitchSetEvent<ReqThreadsSingle<TStitcher['threads']>, TStitcher['output']>
  >({
    occurredAt: asUniDateTime(new Date()),
    trail: context.stitch.trail,
    stitch,
    threads: normThreadsToSingle({
      ...input.threads,
      [stitcheeKey]: stitcheeAfter,
    }),
  });
};
