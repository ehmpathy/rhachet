import OpenAI from 'openai';
import type { Artifact } from 'rhachet-artifact';
import type { GitFile } from 'rhachet-artifact-git';
import type { Empty } from 'type-fns';
import type { z } from 'zod';

import { BrainAtom } from '@src/domain.objects/BrainAtom';
import { castBriefsToPrompt } from '@src/domain.operations/briefs/castBriefsToPrompt';

/**
 * .what = supported openai atom slugs
 * .why = enables type-safe slug specification with model variants
 */
type OpenAIAtomSlug =
  | 'openai/gpt-4o'
  | 'openai/gpt-4o-mini'
  | 'openai/gpt-4-turbo'
  | 'openai/o1'
  | 'openai/o1-mini'
  | 'openai/o1-preview';

/**
 * .what = model configuration by slug
 * .why = maps slugs to API model names and descriptions
 */
const CONFIG_BY_SLUG: Record<
  OpenAIAtomSlug,
  { model: string; description: string }
> = {
  'openai/gpt-4o': {
    model: 'gpt-4o',
    description: 'gpt-4o - multimodal model for reasoning and vision',
  },
  'openai/gpt-4o-mini': {
    model: 'gpt-4o-mini',
    description: 'gpt-4o-mini - fast and cost-effective multimodal model',
  },
  'openai/gpt-4-turbo': {
    model: 'gpt-4-turbo',
    description: 'gpt-4-turbo - high capability with vision support',
  },
  'openai/o1': {
    model: 'o1',
    description: 'o1 - advanced reasoning model for complex problems',
  },
  'openai/o1-mini': {
    model: 'o1-mini',
    description: 'o1-mini - fast reasoning model for coding and math',
  },
  'openai/o1-preview': {
    model: 'o1-preview',
    description: 'o1-preview - preview of advanced reasoning capabilities',
  },
};

/**
 * .what = factory to generate openai brain atom instances
 * .why = enables model variant selection via slug
 *
 * .example
 *   genBrainAtom({ slug: 'openai/gpt-4o' })
 *   genBrainAtom({ slug: 'openai/gpt-4o-mini' }) // fast + cheap
 *   genBrainAtom({ slug: 'openai/o1' }) // advanced reasoning
 */
export const genBrainAtom = (input: { slug: OpenAIAtomSlug }): BrainAtom => {
  const config = CONFIG_BY_SLUG[input.slug];

  return new BrainAtom({
    repo: 'openai',
    slug: input.slug,
    description: config.description,

    /**
     * .what = stateless inference (no tool use)
     * .why = provides direct model access for reasoning tasks
     */
    ask: async <TOutput>(
      askInput: {
        role: { briefs?: Artifact<typeof GitFile>[] };
        prompt: string;
        schema: { output: z.Schema<TOutput> };
      },
      context?: Empty,
    ): Promise<TOutput> => {
      // compose system prompt from briefs
      const systemPrompt = askInput.role.briefs
        ? await castBriefsToPrompt({ briefs: askInput.role.briefs })
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
      messages.push({ role: 'user', content: askInput.prompt });

      // call openai api
      const response = await openai.chat.completions.create({
        model: config.model,
        messages,
      });

      // extract content from response
      const content = response.choices[0]?.message?.content ?? '';

      // parse output via schema
      return askInput.schema.output.parse({ content });
    },
  });
};
