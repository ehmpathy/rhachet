import Anthropic from '@anthropic-ai/sdk';
import type { Artifact } from 'rhachet-artifact';
import type { GitFile } from 'rhachet-artifact-git';
import type { Empty } from 'type-fns';
import type { z } from 'zod';

import { BrainAtom } from '@src/domain.objects/BrainAtom';
import { castBriefsToPrompt } from '@src/domain.operations/briefs/castBriefsToPrompt';

/**
 * .what = brain atom for claude opus 4.5
 * .why = provides anthropic's most capable model for advanced reasoning tasks
 */
export const brainAtomClaudeOpus = new BrainAtom({
  repo: 'anthropic',
  slug: 'claude-opus-4.5',
  description:
    'claude opus 4.5 - most capable claude model for complex reasoning, analysis, and creative tasks',
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
      model: 'claude-opus-4-5-20251101',
      max_tokens: 16384,
      system: systemPrompt,
      messages: [{ role: 'user', content: input.prompt }],
    });

    // extract text content from response
    const textBlock = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === 'text',
    );
    const content = textBlock?.text ?? '';

    // parse output via schema
    return input.schema.output.parse({ content });
  },
});
