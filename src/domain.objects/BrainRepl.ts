import { DomainEntity } from 'domain-objects';
import type { Artifact } from 'rhachet-artifact';
import type { GitFile } from 'rhachet-artifact-git';
import type { Empty } from 'type-fns';
import type { z } from 'zod';

import type { BrainReplPlugs } from './BrainReplPlugs';

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
   * .what = readonly analysis operation (research, queries, code review)
   * .why = provides safe, non-mutating agent interactions
   *   with only read access to filesystem and tools
   *
   * .sdk.mapping =
   *   - claude-agent-sdk: disallowedTools=["Edit","Write","Bash","NotebookEdit"]
   *   - codex-sdk: --sandbox read-only
   */
  ask: <TOutput>(
    input: {
      plugs?: BrainReplPlugs;
      role: { briefs?: Artifact<typeof GitFile>[] };
      prompt: string;
      schema: { output: z.Schema<TOutput> };
    },
    context?: Empty,
  ) => Promise<TOutput>;

  /**
   * .what = read+write action operation (code changes, file edits)
   * .why = provides full agentic capabilities with write access
   *   for tasks that require modifying the codebase
   *
   * .sdk.mapping =
   *   - claude-agent-sdk: allowedTools=["Read","Edit","Write","Bash","Glob","Grep"]
   *   - codex-sdk: --sandbox workspace-write
   */
  act: <TOutput>(
    input: {
      plugs?: BrainReplPlugs;
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
