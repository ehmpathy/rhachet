import { DomainEntity } from 'domain-objects';
import type { Artifact } from 'rhachet-artifact';
import type { GitFile } from 'rhachet-artifact-git';
import type { Empty, PickOne } from 'type-fns';
import type { z } from 'zod';

import type { AsBrainPromptFor } from './BrainAtom';
import type { BrainEpisode } from './BrainEpisode';
import type { BrainOutput } from './BrainOutput';
import type { BrainPlugs } from './BrainPlugs';
import type { BrainSeries } from './BrainSeries';
import type { BrainSpec } from './BrainSpec';

/**
 * .what = a brain.atom behind a REPL (read-execute-print-loop)
 * .why =
 *   - enables registration of pluggable agentic repls (e.g., claude-code, codex)
 *   - provides a standardized contract for agentic tool-use inference
 *   - enables dynamic swap of agentic systems at runtime
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
   * .what = static specification that the brain supplier guarantees
   * .why = enables callers to compare cost/gain before invocation
   */
  spec: BrainSpec;

  /**
   * .what = readonly analysis operation (research, queries, code review)
   * .why = provides safe, non-mutate agent interactions
   *   with only read access to filesystem and tools
   *
   * .sdk.map =
   *   - claude-agent-sdk: disallowedTools=["Edit","Write","Bash","NotebookEdit"]
   *   - codex-sdk: --sandbox read-only
   *
   * .note = `on.episode` or `on.series` enables continuation from prior state
   * .note = TPlugs enables progressive complexity: no tools → no null checks
   * .note = prompt accepts BrainPlugToolExecution[] when tools are plugged
   */
  ask: <TOutput, TPlugs extends BrainPlugs = BrainPlugs>(
    input: {
      on?: PickOne<{ episode: BrainEpisode; series: BrainSeries }>;
      plugs?: TPlugs;
      role: { briefs?: Artifact<typeof GitFile>[] };
      prompt: AsBrainPromptFor<TPlugs>;
      schema: { output: z.Schema<TOutput> };
    },
    context?: Empty,
  ) => Promise<BrainOutput<TOutput, 'repl', TPlugs>>;

  /**
   * .what = read+write action operation (code changes, file edits)
   * .why = provides full agentic capabilities with write access
   *   for tasks that require to modify the codebase
   *
   * .sdk.map =
   *   - claude-agent-sdk: allowedTools=["Read","Edit","Write","Bash","Glob","Grep"]
   *   - codex-sdk: --sandbox workspace-write
   *
   * .note = `on.episode` or `on.series` enables continuation from prior state
   * .note = TPlugs enables progressive complexity: no tools → no null checks
   * .note = prompt accepts BrainPlugToolExecution[] when tools are plugged
   */
  act: <TOutput, TPlugs extends BrainPlugs = BrainPlugs>(
    input: {
      on?: PickOne<{ episode: BrainEpisode; series: BrainSeries }>;
      plugs?: TPlugs;
      role: { briefs?: Artifact<typeof GitFile>[] };
      prompt: AsBrainPromptFor<TPlugs>;
      schema: { output: z.Schema<TOutput> };
    },
    context?: Empty,
  ) => Promise<BrainOutput<TOutput, 'repl', TPlugs>>;
}
export class BrainRepl extends DomainEntity<BrainRepl> implements BrainRepl {
  public static unique = ['repo', 'slug'] as const;
}
