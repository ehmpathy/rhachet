import OpenAI from 'openai';
import type { Artifact } from 'rhachet-artifact';
import type { GitFile } from 'rhachet-artifact-git';
import type { Empty } from 'type-fns';
import { z } from 'zod';

import { BrainAtom } from '@src/domain.objects/BrainAtom';
import { castBriefsToPrompt } from '@src/domain.operations/briefs/castBriefsToPrompt';

/**
 * .what = supported xai atom slugs
 * .why = enables type-safe slug specification with model variants
 */
export type XAIAtomSlug =
  | 'xai/grok-code-fast-1'
  | 'xai/grok-3'
  | 'xai/grok-3-mini'
  | 'xai/grok-4'
  | 'xai/grok-4-fast';

/**
 * .what = model configuration by slug
 * .why = maps slugs to API model names, descriptions, and context sizes
 */
const CONFIG_BY_SLUG: Record<
  XAIAtomSlug,
  { model: string; description: string; context: number }
> = {
  'xai/grok-code-fast-1': {
    model: 'grok-code-fast-1',
    description: 'grok-code-fast-1 - optimized for agentic coding (256K)',
    context: 256_000,
  },
  'xai/grok-3': {
    model: 'grok-3-beta',
    description: 'grok-3 - balanced reasoning (131K)',
    context: 131_000,
  },
  'xai/grok-3-mini': {
    model: 'grok-3-mini-beta',
    description: 'grok-3-mini - fast and cost-effective (131K)',
    context: 131_000,
  },
  'xai/grok-4': {
    model: 'grok-4-07-09',
    description: 'grok-4 - advanced reasoning (256K)',
    context: 256_000,
  },
  'xai/grok-4-fast': {
    model: 'grok-4-fast-reasoning',
    description: 'grok-4-fast - frontier with reasoning (2M)',
    context: 2_000_000,
  },
};

/**
 * .what = factory to generate xai brain atom instances
 * .why = enables model variant selection via slug
 *
 * .note = xai api is openai-compatible with baseURL override
 *
 * .example
 *   genBrainAtom({ slug: 'xai/grok-code-fast-1' })
 *   genBrainAtom({ slug: 'xai/grok-3-mini' }) // fast + cheap
 *   genBrainAtom({ slug: 'xai/grok-4' }) // advanced reasoning
 */
export const genBrainAtom = (input: { slug: XAIAtomSlug }): BrainAtom => {
  const config = CONFIG_BY_SLUG[input.slug];

  return new BrainAtom({
    repo: 'xai',
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

      // get openai client from context or create new one with xai baseURL
      const openai =
        (context?.openai as OpenAI | undefined) ??
        new OpenAI({
          apiKey: process.env.XAI_API_KEY,
          baseURL: 'https://api.x.ai/v1',
        });

      // build messages array
      const messages: OpenAI.ChatCompletionMessageParam[] = [];
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      messages.push({ role: 'user', content: askInput.prompt });

      // convert zod schema to json schema for structured output
      const jsonSchema = z.toJSONSchema(askInput.schema.output);

      // call xai api with strict json_schema response format
      const response = await openai.chat.completions.create({
        model: config.model,
        messages,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'response',
            strict: true,
            schema: jsonSchema,
          },
        },
      });

      // extract content from response
      const content = response.choices[0]?.message?.content ?? '';

      // parse JSON response and validate via schema
      const parsed = JSON.parse(content);
      return askInput.schema.output.parse(parsed);
    },
  });
};
