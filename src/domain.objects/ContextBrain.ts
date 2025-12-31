import { DomainLiteral, type RefByUnique } from 'domain-objects';
import type { Artifact } from 'rhachet-artifact';
import type { GitFile } from 'rhachet-artifact-git';
import type { z } from 'zod';

import type { BrainAtom } from './BrainAtom';
import type { BrainAtomPlugs } from './BrainAtomPlugs';
import type { BrainRepl } from './BrainRepl';
import type { BrainReplPlugs } from './BrainReplPlugs';

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
       * .what = lookup and invoke a brain atom for single-turn inference
       * .why = provides ergonomic access to atoms with automatic lookup
       */
      ask: <TOutput>(input: {
        brain: RefByUnique<typeof BrainAtom>;
        plugs?: BrainAtomPlugs;
        role: { briefs?: Artifact<typeof GitFile>[] };
        prompt: string;
        schema: { output: z.Schema<TOutput> };
      }) => Promise<TOutput>;
    };

    repl: {
      /**
       * .what = lookup and invoke a brain repl for readonly analysis
       * .why = provides safe agentic analysis without file modifications
       */
      ask: <TOutput>(input: {
        brain: RefByUnique<typeof BrainRepl>;
        plugs?: BrainReplPlugs;
        role: { briefs?: Artifact<typeof GitFile>[] };
        prompt: string;
        schema: { output: z.Schema<TOutput> };
      }) => Promise<TOutput>;

      /**
       * .what = lookup and invoke a brain repl for read+write actions
       * .why = provides full agentic capabilities with file modifications
       */
      act: <TOutput>(input: {
        brain: RefByUnique<typeof BrainRepl>;
        plugs?: BrainReplPlugs;
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
