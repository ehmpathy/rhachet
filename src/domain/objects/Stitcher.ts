import { DomainLiteral } from 'domain-objects';

import { Stitch } from './Stitch';
import { Threads, ThreadRole } from './Threads';

/**
 * .what = the common generics of a stitcher
 */
export type GStitcher<
  TThreadIndex extends Threads<ThreadRole, any> = Threads<ThreadRole, any>,
  TProcedureContext = any,
  TOutput = any,
> = {
  threads: TThreadIndex;
  procedure: {
    context: TProcedureContext;
  };
  output: TOutput;
};

/**
 * .what = a tactic via which to stitch, via computation
 */
export interface StitcherCompute<TStitcher extends GStitcher> {
  form: 'COMPUTE';

  /**
   * .what = the procedure which will compute the stitch upon invocation
   */
  invoke: (
    input: { threads: TStitcher['threads'] },
    context: TStitcher['procedure']['context'],
  ) => Promise<Stitch<TStitcher['output']>> | Stitch<TStitcher['output']>;

  /**
   * .what = which thread will receive the stitch
   * .note =
   *   - many threads may be leveraged within a stitch
   *   - however, only one thread actually receives the stitch (goes through the fabric)
   *   - the rest are simply looped into the stitch; read, but not written
   */
  stitchee: keyof TStitcher['threads'];
}
export class StitcherCompute<TStitcher extends GStitcher>
  extends DomainLiteral<StitcherCompute<TStitcher>>
  implements StitcherCompute<TStitcher> {}

/**
 * .what = a tactic via which to stitch, via imagination
 */
export interface StitcherImagine<TStitcher extends GStitcher> {
  form: 'IMAGINE';

  /**
   * .what = a unique, readable identifier for the tactic
   */
  slug: string;

  /**
   * .what = a human readable description of the tactic, to summarize
   */
  readme: string | null;

  /**
   * .what = which thread will receive the stitch
   * .note =
   *   - many threads may be leveraged within a stitch
   *   - however, only one thread actually receives the stitch (goes through the fabric)
   *   - the rest are simply looped into the stitch; read, but not written
   */
  stitchee: keyof TStitcher['threads'];

  /**
   * .what = a mech which takes a thread and encodes it into a prompt
   */
  enprompt: (input: { threads: TStitcher['threads'] }) => string;

  /**
   * .what = a mech which invokes an llm to imagine based on prompt
   */
  imagine: (
    input: string,
    context: TStitcher['procedure']['context'],
  ) => Promise<string>;

  /**
   * .what = a mech which takes an imagined output prompt and decodes it into an updated thread
   */
  deprompt: (input: {
    threads: TStitcher['threads'];
    promptOut: string;
    promptIn: string;
  }) => Stitch<TStitcher['output']>;
}
export class StitcherImagine<TStitcher extends GStitcher>
  extends DomainLiteral<StitcherImagine<TStitcher>>
  implements StitcherImagine<TStitcher> {}

/**
 * .what = a tactic via which a stitch can be produced
 */
export type Stitcher<TStitcher extends GStitcher> =
  | StitcherCompute<TStitcher>
  | StitcherImagine<TStitcher>;
