import type { Artifact } from 'rhachet-artifact';
import type { GitFile } from 'rhachet-artifact-git';
import type { Empty } from 'type-fns';
import type { z } from 'zod';

import type { BrainOutput } from '@src/domain.objects/BrainOutput';
import type { BrainRepl } from '@src/domain.objects/BrainRepl';
import type { BrainReplPlugs } from '@src/domain.objects/BrainReplPlugs';

/**
 * .what = invoke a brain repl for readonly agentic analysis
 * .why = provides safe, non-mutate agent interactions for research,
 *   code analysis, and information gather tasks
 *
 * .sdk.implementation =
 *   - claude-agent-sdk: query() with disallowedTools=["Edit","Write","Bash"]
 *   - codex-sdk: thread.run() with sandbox=read-only
 */
export const askViaBrainRepl = async <TOutput>(
  input: {
    repl: BrainRepl;
    plugs?: BrainReplPlugs;
    role: { briefs?: Artifact<typeof GitFile>[] };
    prompt: string;
    schema: { output: z.Schema<TOutput> };
  },
  context?: Empty,
): Promise<BrainOutput<TOutput>> => {
  // delegate to the repl's ask implementation
  return input.repl.ask(
    {
      plugs: input.plugs,
      role: input.role,
      prompt: input.prompt,
      schema: input.schema,
    },
    context,
  );
};
