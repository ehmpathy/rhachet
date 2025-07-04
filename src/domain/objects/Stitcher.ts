import { ContextLogTrail } from 'as-procedure';
import { createIsOfEnum, Literalize } from 'type-fns';

import { ContextStitchTrail } from '../../logic/stitch/withStitchTrail';
import { StitchFanout } from './StitchFanout';
import { StitchRoute } from './StitchRoute';
import { StitchStep } from './StitchStep';
import { Threads } from './Threads';

/**
 * .what = the common generics of a stitcher
 */

export type GStitcher<
  TThreads extends Threads<any> = Threads<any>,
  TContext extends ContextStitchTrail & ContextLogTrail = ContextStitchTrail &
    ContextLogTrail,
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
export type Stitcher<T extends GStitcher = GStitcher> =
  | StitcherBase<StitcherForm> &
      (StitchStep<T> | StitchRoute<T> | StitchFanout<T>);

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
