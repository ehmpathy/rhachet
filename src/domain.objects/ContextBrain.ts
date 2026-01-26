import { DomainLiteral, type RefByUnique } from 'domain-objects';
import type { Artifact } from 'rhachet-artifact';
import type { GitFile } from 'rhachet-artifact-git';
import type { z } from 'zod';

import type { BrainAtom } from './BrainAtom';
import type { BrainAtomPlugs } from './BrainAtomPlugs';
import type { BrainOutput } from './BrainOutput';
import type { BrainRepl } from './BrainRepl';
import type { BrainReplPlugs } from './BrainReplPlugs';

/**
 * .what = union type for a chosen brain (atom or repl)
 * .why = enables brain.choice to hold either type with type precision
 */
export type BrainChoice = BrainAtom | BrainRepl;

/**
 * .what = type guard to check if a brain is an atom
 * .why = enables runtime checks and type narrow for atom-specific operations
 */
export const isBrainAtom = (brain: BrainChoice): brain is BrainAtom =>
  'ask' in brain && !('act' in brain);

/**
 * .what = type guard to check if a brain is a repl
 * .why = enables runtime checks and type narrow for repl-specific operations
 */
export const isBrainRepl = (brain: BrainChoice): brain is BrainRepl =>
  'ask' in brain && 'act' in brain;

/**
 * .what = runtime context for unified access to brain atoms and repls
 * .why =
 *   - provides a clean interface to invoke brains by reference
 *   - handles lookup, role embed, and delegation transparently
 *   - enables dynamic brain swap without caller changes
 */
export interface ContextBrain<TBrainChoice = BrainChoice | null> {
  /**
   * .what = interface to invoke brain atoms and repls
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
      }) => Promise<BrainOutput<TOutput>>;
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
      }) => Promise<BrainOutput<TOutput>>;

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
      }) => Promise<BrainOutput<TOutput>>;
    };

    /**
     * .what = pre-bound brain selected at context creation
     * .why = enables callers to invoke brain.choice directly without repeat ref
     */
    choice: TBrainChoice;
  };
}
export class ContextBrain<TBrainChoice = BrainChoice | null>
  extends DomainLiteral<ContextBrain<TBrainChoice>>
  implements ContextBrain<TBrainChoice> {}
