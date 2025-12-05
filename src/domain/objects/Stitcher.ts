import type { ContextLogTrail } from 'as-procedure';
import { createIsOfEnum, type Literalize } from 'type-fns';

import type { ContextStitchTrail } from '../../logic/stitch/withStitchTrail';
import type { StitchChoice } from './StitchChoice';
import type { StitchCycle } from './StitchCycle';
import type { StitchFanout } from './StitchFanout';
import type { StitchRoute } from './StitchRoute';
import type { StitchStep } from './StitchStep';
import type { Threads } from './Threads';

/**
 * .what = the common generics of a stitcher
 */
export type GStitcher<
  TThreads extends Threads<any, any> = Threads<any, 'single'>,
  TContext extends ContextLogTrail & ContextStitchTrail = ContextLogTrail &
    ContextStitchTrail,
  TOutput = any,
> = {
  threads: TThreads;
  context: TContext;
  output: TOutput;
};

/**
 * .what = the canonical set of stitcher forms
 */
export enum StitcherForm {
  /**
   * .what = a stitch step executed via computation of procedural logic
   */
  COMPUTE = 'COMPUTE',

  /**
   * .what = a stitch step executed via imagination of an llm
   */
  IMAGINE = 'IMAGINE',

  /**
   * .what = a stitch combo via linear sequence
   */
  ROUTE = 'ROUTE',

  /**
   * .what = a stitch combo via parallel fanout + fanin
   */
  FANOUT = 'FANOUT',

  /**
   * .what = a stitch combo via conditional stitcher selection
   */
  CHOICE = 'CHOICE',

  /**
   * .what = a stitch combo via repetition of stitchers
   */
  CYCLE = 'CYCLE',

  /**
   * .what = a stitch combo which gracefully awaits some condition to be satisfied
   */
  AWAIT = 'AWAIT',
}
export const isOfStitcherForm = createIsOfEnum(StitcherForm);

/**
 * .what = a generic stitcher which can be executed
 * .why =
 *   - generalizes references to atomic StitchSteps or composite StitchRoutes, StitchFanouts, etc
 *   - enables universal, recursive operations against both atomic and composite stitchers, since their contracts are the same
 *   - guarantees `.form` is defined for all stitcher types to enable disambiguation via runtime narrowage
 */
export type Stitcher<
  T extends GStitcher<
    // note: only single role.threaded stitchers are generically called stitchers
    Threads<any, 'single'>,
    any,
    any
  > = GStitcher<Threads<any, 'single'>, any, any>,
> = StitcherBase<StitcherForm> &
  (
    | StitchStep<T>
    | StitchRoute<T>
    | StitchFanout<T>
    | StitchChoice<T>
    | StitchCycle<T>
  );

/**
 * .what = an extensible base declaration of a stitcher
 * .why =
 *   - ensures all stitchers will conform to desired standards
 */
export interface StitcherBase<TForm extends StitcherForm> {
  /**
   * .what = used to disambiguate and narrow which shape of stitcher it is
   */
  form: Literalize<TForm>;

  /**
   * .what = a unique identifier for this particular stitcher
   * .why =
   *   - enables traces via trail markers
   *   - enables unique key references and equality comparisons
   */
  slug: string;

  /**
   * .what = a human readable description of the step
   */
  readme: string | null;
}

/**
 * .what = an observable description of a stitcher
 * .why =
 *   - used to summarize a stitcher
 * .note =
 *    - the readme will often be truncated to top 210 char. goal = max(signal to noise)!
 */
export type StitcherDesc<TForm extends StitcherForm> = Pick<
  StitcherBase<TForm>,
  'slug' | 'readme' | 'form'
>;

/**
 * .what = converts a full stitcher into a StitcherDesc
 * .why = used for observability and trail markers
 */
export const asStitcherDesc = <TStitcher extends StitcherBase<any>>(input: {
  stitcher: TStitcher;
}): StitcherDesc<TStitcher['form']> => {
  const { slug, readme, form } = input.stitcher;
  return { form, slug, readme };
};

/**
 * .what = extracts the GStitcher generic from a Stitcher
 * .why = enables typed access to threads, context, and output shape of a Stitcher instance
 */
export type GStitcherOf<T> = [T] extends [Stitcher<infer G>] ? G : never; // !: only this version works out of the two below. neat!
// export type GStitcherOf<T> = T extends Stitcher<infer G>
//   ? G extends GStitcher<any, any, any>
//     ? G
//     : never
//   : never;
// export type GStitcherOf<T> = T extends Stitcher<infer G> ? G : never;

/**
 * .what = flattens a gstitcher's type declaration
 */
export type GStitcherFlat<T> =
  T extends GStitcher<infer Threads, infer Context, infer Output>
    ? GStitcher<Threads, Context, Output>
    : never;
