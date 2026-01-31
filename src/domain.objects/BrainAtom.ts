import { DomainEntity } from 'domain-objects';
import type { Artifact } from 'rhachet-artifact';
import type { GitFile } from 'rhachet-artifact-git';
import type { Empty } from 'type-fns';
import type { z } from 'zod';

import type { BrainAtomPlugs } from './BrainAtomPlugs';
import type { BrainEpisode } from './BrainEpisode';
import type { BrainOutput } from './BrainOutput';
import type { BrainSpec } from './BrainSpec';

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
   * .what = static specification that the brain supplier guarantees
   * .why = enables callers to compare cost/gain before invocation
   */
  spec: BrainSpec;

  /**
   * .what = the ask operation contract (renamed from imagine)
   * .why = standardizes how all atoms are invoked, regardless of provider
   *
   * .note = `on.episode` enables continuation from a prior episode
   */
  ask: <TOutput>(
    input: {
      on?: { episode: BrainEpisode };
      plugs?: BrainAtomPlugs;
      role: { briefs?: Artifact<typeof GitFile>[] };
      prompt: string;
      schema: { output: z.Schema<TOutput> };
    },
    context?: Empty,
  ) => Promise<BrainOutput<TOutput, 'atom'>>;
}
export class BrainAtom extends DomainEntity<BrainAtom> implements BrainAtom {
  public static unique = ['repo', 'slug'] as const;
}
