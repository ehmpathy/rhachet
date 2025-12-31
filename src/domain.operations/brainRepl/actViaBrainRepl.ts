import type { Artifact } from 'rhachet-artifact';
import type { GitFile } from 'rhachet-artifact-git';
import type { Empty } from 'type-fns';
import type { z } from 'zod';

import type { BrainRepl } from '@src/domain.objects/BrainRepl';
import type { BrainReplPlugs } from '@src/domain.objects/BrainReplPlugs';

/**
 * .what = invoke a brain repl for read+write agentic actions
 * .why = provides full agentic capabilities for code changes,
 *   file edits, and command execution tasks
 *
 * .sdk.implementation =
 *   - claude-agent-sdk: query() with allowedTools=["Read","Edit","Write","Bash",...]
 *   - codex-sdk: thread.run() with sandbox=workspace-write
 */
export const actViaBrainRepl = async <TOutput>(
  input: {
    repl: BrainRepl;
    plugs?: BrainReplPlugs;
    role: { briefs?: Artifact<typeof GitFile>[] };
    prompt: string;
    schema: { output: z.Schema<TOutput> };
  },
  context?: Empty,
): Promise<TOutput> => {
  // delegate to the repl's act implementation
  return input.repl.act(
    {
      plugs: input.plugs,
      role: input.role,
      prompt: input.prompt,
      schema: input.schema,
    },
    context,
  );
};
