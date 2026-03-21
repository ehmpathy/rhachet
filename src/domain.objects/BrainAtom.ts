import { DomainEntity } from 'domain-objects';
import type { Artifact } from 'rhachet-artifact';
import type { GitFile } from 'rhachet-artifact-git';
import type { Empty } from 'type-fns';
import type { z } from 'zod';

import type { BrainEpisode } from './BrainEpisode';
import type { BrainOutput } from './BrainOutput';
import type { BrainPlugs } from './BrainPlugs';
import type { BrainPlugToolDefinition } from './BrainPlugToolDefinition';
import type { BrainPlugToolExecution } from './BrainPlugToolExecution';
import type { BrainSpec } from './BrainSpec';

/**
 * .what = conditional type for prompt based on whether tools are plugged
 * .why = enables tool result continuation via BrainPlugToolExecution array
 *
 * .note
 * - string: initial prompt or follow-up question
 * - BrainPlugToolExecution[]: tool results continuation (always array, even for single tool)
 */
export type AsBrainPromptFor<TPlugs extends BrainPlugs> = TPlugs extends {
  tools: BrainPlugToolDefinition[];
}
  ? string | BrainPlugToolExecution[]
  : string;

/**
 * .what = an LLM inference endpoint capable of creative language imagination
 * .why =
 *   - enables registration of pluggable LLM atoms (e.g., claude, gpt, llama)
 *   - provides a standardized contract for single-turn or multi-turn inference
 *
 * .note = TContext enables typed context injection for brain suppliers
 *   - suppliers bind their required context at return type
 *   - callers inject context via genContextBrainSupplier
 *   - defaults to Empty for backwards compatibility
 */
export interface BrainAtom<TContext = Empty> {
  /**
   * .what = identifier for the plugin package that provides this atom
   * .example = "anthropic", "openai", "ollama"
   */
  repo: string;

  /**
   * .what = unique identifier for this specific atom within the repo
   * .example = "claude-opus-4.5", "gpt-4o", "llama-3-70b"
   */
  slug: string;

  /**
   * .what = human-readable description of this atom's capabilities
   * .why = helps developers understand what this atom is best suited for
   */
  description: string;

  /**
   * .what = static specification that the brain supplier guarantees
   * .why = enables callers to compare cost/gain before invocation
   */
  spec: BrainSpec;

  /**
   * .what = the ask operation contract (renamed from imagine)
   * .why = standardizes how all atoms are invoked, regardless of provider
   *
   * .note = `on.episode` enables continuation from a prior episode
   * .note = TPlugs enables progressive complexity: no tools → no null checks
   * .note = prompt accepts BrainPlugToolExecution[] when tools are plugged
   * .note = method syntax enables bivariance for inline implementations
   */
  ask<TOutput, TPlugs extends BrainPlugs = BrainPlugs>(
    input: {
      on?: { episode: BrainEpisode };
      plugs?: TPlugs;
      role: { briefs?: Artifact<typeof GitFile>[] };
      prompt: AsBrainPromptFor<TPlugs>;
      schema: { output: z.Schema<TOutput> };
    },
    context?: TContext,
  ): Promise<BrainOutput<TOutput, 'atom', TPlugs>>;
}
export class BrainAtom<TContext = Empty>
  extends DomainEntity<BrainAtom<TContext>>
  implements BrainAtom<TContext>
{
  public static unique = ['repo', 'slug'] as const;
}
