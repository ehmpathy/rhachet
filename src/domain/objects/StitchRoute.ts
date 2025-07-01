import { GStitcher, Stitcher } from './Stitcher';
import { Threads } from './Threads';

/**
 * .what = a route of stitchers to enstich in sequence; a composed tactic
 */
export interface StitchRoute<
  TThreads extends Threads<any, any>,
  TProcedureContext,
  TOutput,
> {
  /**
   * .what = a human readable unique key, within the registered namespace
   */
  slug: string;

  /**
   * .what = a human readable name
   * .why = display a grokable name for the route
   */
  name: string;

  /**
   * .what = a grokable description of the route; e.g., the readme
   */
  description: string | null;

  /**
   * .what = declares the input's required for the route
   */
  input: {
    threads: TThreads;
  };

  /**
   * .what = declares the output expected from the route
   * .todo
   *   - will we ever have cases where we want to expose multiple output stitches?
   *   - will we ever have cases where we want to expose the threads?
   */
  output: {
    stitch: TOutput;
  };

  /**
   * .what = the route of stitchers to execute in sequence
   */
  route: [
    ...Stitcher<GStitcher<TThreads, TProcedureContext, any>>[],
    Stitcher<GStitcher<TThreads, TProcedureContext, TOutput>>, // last stitcher must return the final output of the contract
  ];
}
