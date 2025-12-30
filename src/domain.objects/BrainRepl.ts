import { DomainEntity } from 'domain-objects';
import type { Artifact } from 'rhachet-artifact';
import type { GitFile } from 'rhachet-artifact-git';
import type { Empty } from 'type-fns';
import type { z } from 'zod';

/**
 * .what = a brain.atom operating behind a REPL (read-execute-print-loop)
 * .why =
 *   - enables registration of pluggable agentic repls (e.g., claude-code, codex)
 *   - provides a standardized contract for agentic tool-using inference
 *   - enables dynamic swapping of agentic systems at runtime
 *
 * .note = repls differ from atoms in that they execute iterative agentic loops
 *   with tool use, rather than single-turn inference
 */
export interface BrainRepl {
  /**
   * .what = identifier for the plugin package that provides this repl
   * .example = "anthropic", "openai"
   */
  repo: string;

  /**
   * .what = unique identifier for this specific repl within the repo
   * .example = "claude-code", "codex"
   */
  slug: string;

  /**
   * .what = human-readable description of this repl's capabilities
   * .why = helps developers understand what this repl is best suited for
   */
  description: string;

  /**
   * .what = the imagination operation contract
   * .why = standardizes how all repls are invoked, regardless of provider
   *
   * .note = plugin is responsible for handling role.briefs appropriately.
   *   this design maximizes leverage of each brain's unique capabilities:
   *   - context window optimization (e.g., claude-code's extended context)
   *   - provider-specific caching (e.g., session persistence, tool caching)
   *   - finetuned behaviors (e.g., agentic loop tuning, tool configurations)
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
export class BrainRepl extends DomainEntity<BrainRepl> implements BrainRepl {
  public static unique = ['repo', 'slug'] as const;
}
