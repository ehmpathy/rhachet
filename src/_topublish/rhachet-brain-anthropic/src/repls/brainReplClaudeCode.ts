import Anthropic from '@anthropic-ai/sdk';
import type { Artifact } from 'rhachet-artifact';
import type { GitFile } from 'rhachet-artifact-git';
import type { Empty } from 'type-fns';
import type { z } from 'zod';

import { BrainRepl } from '@src/domain.objects/BrainRepl';
import { castBriefsToPrompt } from '@src/domain.operations/briefs/castBriefsToPrompt';

/**
 * .what = brain repl for claude code
 * .why = provides anthropic's agentic coding assistant for tool-using tasks
 */
export const brainReplClaudeCode = new BrainRepl({
  repo: 'anthropic',
  slug: 'claude-code',
  description:
    'claude code - agentic coding assistant with tool use for software engineering tasks',
  imagine: async <TOutput>(
    input: {
      role: { briefs?: Artifact<typeof GitFile>[] };
      prompt: string;
      schema: { output: z.Schema<TOutput> };
    },
    context?: Empty,
  ): Promise<TOutput> => {
    // compose system prompt from briefs
    const systemPrompt = input.role.briefs
      ? await castBriefsToPrompt({ briefs: input.role.briefs })
      : undefined;

    // get anthropic client from context or create new one
    const anthropic =
      (context?.anthropic as Anthropic | undefined) ??
      new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // call anthropic api (max_tokens required by api)
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16384,
      system: systemPrompt,
      messages: [{ role: 'user', content: input.prompt }],
    });

    // extract text content from response (skip thinking blocks)
    const textBlocks = response.content.filter(
      (block): block is Anthropic.TextBlock => block.type === 'text',
    );
    const content = textBlocks.map((block) => block.text).join('\n');

    // parse output via schema
    return input.schema.output.parse({ content });
  },
});
