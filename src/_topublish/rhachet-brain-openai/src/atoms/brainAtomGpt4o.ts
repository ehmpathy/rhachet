import OpenAI from 'openai';
import type { Artifact } from 'rhachet-artifact';
import type { GitFile } from 'rhachet-artifact-git';
import type { Empty } from 'type-fns';
import type { z } from 'zod';

import { BrainAtom } from '@src/domain.objects/BrainAtom';
import { castBriefsToPrompt } from '@src/domain.operations/briefs/castBriefsToPrompt';

/**
 * .what = brain atom for gpt-4o
 * .why = provides openai's multimodal model for reasoning and analysis
 */
export const brainAtomGpt4o = new BrainAtom({
  repo: 'openai',
  slug: 'gpt-4o',
  description:
    'gpt-4o - multimodal model for reasoning, vision, and language tasks',
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

    // get openai client from context or create new one
    const openai =
      (context?.openai as OpenAI | undefined) ??
      new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // build messages array
    const messages: OpenAI.ChatCompletionMessageParam[] = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: input.prompt });

    // call openai api
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
    });

    // extract content from response
    const content = response.choices[0]?.message?.content ?? '';

    // parse output via schema
    return input.schema.output.parse({ content });
  },
});
