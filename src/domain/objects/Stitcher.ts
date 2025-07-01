import { DomainLiteral } from 'domain-objects';

import { Stitch } from './Stitch';
import { Thread } from './Thread';

/**
 * .what = a tactic to stitch, via computation
 */
export interface StitcherCompute<TThreadContext, TProcedureContext, TOutput> {
  form: 'COMPUTE';
  invoke: (
    input: { thread: Thread<TThreadContext> },
    context: TProcedureContext,
  ) => Stitch<TOutput>;
}

/**
 * .what = a tactic to stitch, via imagination
 */
export interface StitcherImagine<TThreadContext, TProcedureContext, TOutput> {
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
   * .what = a hash of the version of the stitcher tactic
   */
  // hash: string; // todo: usecase?

  /**
   * .what = a mech which takes a thread and encodes it into a prompt
   */
  enprompt: (input: { thread: Thread<TThreadContext> }) => string;

  /**
   * .what = a mech which invokes an llm to imagine based on prompt
   */
  imagine: (input: string, context: TProcedureContext) => Promise<string>;

  /**
   * .what = a mech which takes an imagined output prompt and decodes it into an updated thread
   */
  deprompt: (input: {
    thread: Thread<TThreadContext>;
    prompt: string;
  }) => Stitch<TOutput>;
}
export class StitcherImagine<TThreadContext, TProcedureContext, TOutput>
  extends DomainLiteral<
    StitcherImagine<TThreadContext, TProcedureContext, TOutput>
  >
  implements StitcherImagine<TThreadContext, TProcedureContext, TOutput> {}

/**
 * .what = a tactic via which a stitch can be produced
 */
export type Stitcher<TThreadContext, TProcedureContext, TOutput = any> =
  | StitcherCompute<TThreadContext, TProcedureContext, TOutput>
  | StitcherImagine<TThreadContext, TProcedureContext, TOutput>;
