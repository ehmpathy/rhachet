import { DomainLiteral, type RefByUnique } from 'domain-objects';
import type { Artifact } from 'rhachet-artifact';
import type { GitFile } from 'rhachet-artifact-git';
import type { z } from 'zod';

import type { BrainAtom } from './BrainAtom';
import type { BrainRepl } from './BrainRepl';

/**
 * .what = runtime context providing unified access to brain atoms and repls
 * .why =
 *   - provides a clean interface for invoking brains by reference
 *   - handles lookup, role embedding, and delegation transparently
 *   - enables dynamic brain swapping without caller changes
 */
export interface ContextBrain {
  /**
   * .what = interface for invoking brain atoms and repls
   */
  brain: {
    atom: {
      /**
       * .what = lookup and invoke a brain atom by reference
       * .why = provides ergonomic access to atoms with automatic lookup
       */
      imagine: <TOutput>(input: {
        brain: RefByUnique<typeof BrainAtom>;
        role: { briefs?: Artifact<typeof GitFile>[] };
        prompt: string;
        schema: { output: z.Schema<TOutput> };
      }) => Promise<TOutput>;
    };

    repl: {
      /**
       * .what = lookup and invoke a brain repl by reference
       * .why = provides ergonomic access to repls with automatic lookup
       */
      imagine: <TOutput>(input: {
        brain: RefByUnique<typeof BrainRepl>;
        role: { briefs?: Artifact<typeof GitFile>[] };
        prompt: string;
        schema: { output: z.Schema<TOutput> };
      }) => Promise<TOutput>;
    };
  };
}
export class ContextBrain
  extends DomainLiteral<ContextBrain>
  implements ContextBrain {}
