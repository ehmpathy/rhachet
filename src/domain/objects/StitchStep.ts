import { DomainLiteral } from 'domain-objects';

import { Stitch } from './Stitch';
import { GStitcher, StitcherBase, StitcherForm } from './Stitcher';
import { Threads } from './Threads';

/**
 * .what = a step by which to stitch, via computation
 */
export interface StitchStepCompute<
  TStitcher extends GStitcher<Threads<any, any>, any, any>,
> extends StitcherBase<StitcherForm.COMPUTE> {
  /**
   * .what = the procedure which will compute the stitch upon invocation
   */
  invoke: (
    input: { threads: TStitcher['threads'] },
    context: TStitcher['context'],
  ) => Promise<Stitch<TStitcher['output']>> | Stitch<TStitcher['output']>;

  /**
   * .what = which thread will receive the stitch
   */
  stitchee: keyof TStitcher['threads'];
}

export class StitchStepCompute<
    TStitcher extends GStitcher<Threads<any, any>, any, any>,
  >
  extends DomainLiteral<StitchStepCompute<TStitcher>>
  implements StitchStepCompute<TStitcher> {}

/**
 * .what = a step by which to stitch, via imagination
 */
export interface StitchStepImagine<
  TStitcher extends GStitcher<Threads<any, any>, any, any>,
> extends StitcherBase<StitcherForm.IMAGINE> {
  /**
   * .what = which thread will receive the stitch
   */
  stitchee: keyof TStitcher['threads'];

  /**
   * .what = encodes threads into a prompt
   */
  enprompt: (input: { threads: TStitcher['threads'] }) => string;

  /**
   * .what = invokes an llm to imagine based on a prompt
   */
  imagine: (input: string, context: TStitcher['context']) => Promise<string>;

  /**
   * .what = decodes the imagined prompt into a stitch
   */
  deprompt: (input: {
    threads: TStitcher['threads'];
    promptOut: string;
    promptIn: string;
  }) => Stitch<TStitcher['output']>;
}

export class StitchStepImagine<
    TStitcher extends GStitcher<Threads<any, any>, any, any>,
  >
  extends DomainLiteral<StitchStepImagine<TStitcher>>
  implements StitchStepImagine<TStitcher> {}

/**
 * .what = a single step that can be stitched
 * .note = may be computed or imagined
 */
export type StitchStep<
  TStitcher extends GStitcher<Threads<any, any>, any, any>,
> = StitchStepCompute<TStitcher> | StitchStepImagine<TStitcher>;
