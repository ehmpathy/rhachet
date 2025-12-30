import OpenAI from 'openai';
import type { Artifact } from 'rhachet-artifact';
import type { GitFile } from 'rhachet-artifact-git';
import type { Empty } from 'type-fns';
import type { z } from 'zod';

import { BrainRepl } from '@src/domain.objects/BrainRepl';
import { castBriefsToPrompt } from '@src/domain.operations/briefs/castBriefsToPrompt';

/**
 * .what = brain repl for openai codex
 * .why = provides openai's agentic coding assistant for tool-using tasks
 *
 * .note = uses o4-mini with high reasoning effort for agentic tasks
 */
export const brainReplCodex = new BrainRepl({
  repo: 'openai',
  slug: 'codex',
  description:
    'codex - agentic coding assistant with tool use for software engineering tasks',
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

    // call openai api with o4-mini
    const response = await openai.chat.completions.create({
      model: 'o4-mini',
      messages,
    });

    // extract content from response
    const content = response.choices[0]?.message?.content ?? '';

    // parse output via schema
    return input.schema.output.parse({ content });
  },
});
