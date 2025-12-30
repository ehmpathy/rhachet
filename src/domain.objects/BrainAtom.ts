import { DomainEntity } from 'domain-objects';
import type { Artifact } from 'rhachet-artifact';
import type { GitFile } from 'rhachet-artifact-git';
import type { Empty } from 'type-fns';
import type { z } from 'zod';

/**
 * .what = an LLM inference endpoint capable of creative language imagination
 * .why =
 *   - enables registration of pluggable LLM atoms (e.g., claude, gpt, llama)
 *   - provides a standardized contract for single-turn or multi-turn inference
 *   - enables dynamic swapping of models at runtime
 */
export interface BrainAtom {
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
   * .what = the imagination operation contract
   * .why = standardizes how all atoms are invoked, regardless of provider
   *
   * .note = plugin is responsible for handling role.briefs appropriately.
   *   this design maximizes leverage of each brain's unique capabilities:
   *   - context window optimization (e.g., claude's 200k vs gpt's 128k)
   *   - provider-specific caching (e.g., anthropic prompt caching)
   *   - finetuned behaviors (e.g., system prompt placement, formatting)
   */
  imagine: <TOutput>(
    input: {
      role: { briefs?: Artifact<typeof GitFile>[] };
      prompt: string;
      schema: { output: z.Schema<TOutput> };
    },
    context?: Empty,
  ) => Promise<TOutput>;
}
export class BrainAtom extends DomainEntity<BrainAtom> implements BrainAtom {
  public static unique = ['repo', 'slug'] as const;
}
