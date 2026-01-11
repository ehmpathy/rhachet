import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import type { Artifact } from 'rhachet-artifact';
import type { GitFile } from 'rhachet-artifact-git';
import type { Empty } from 'type-fns';
import type { z } from 'zod';

import { BrainAtom } from '@src/domain.objects/BrainAtom';
import { castBriefsToPrompt } from '@src/domain.operations/briefs/castBriefsToPrompt';

/**
 * .what = supported claude atom slugs
 * .why = enables type-safe slug specification with model variants
 */
type ClaudeAtomSlug =
  | 'claude/haiku'
  | 'claude/haiku/v3.5'
  | 'claude/haiku/v4.5'
  | 'claude/sonnet'
  | 'claude/sonnet/v4'
  | 'claude/sonnet/v4.5'
  | 'claude/opus'
  | 'claude/opus/v4'
  | 'claude/opus/v4.5';

/**
 * .what = model configuration by slug
 * .why = maps slugs to API model names and descriptions
 */
const CONFIG_BY_SLUG: Record<
  ClaudeAtomSlug,
  { model: string; description: string }
> = {
  'claude/haiku': {
    model: 'claude-haiku-4-5-20251001',
    description: 'claude haiku 4.5 - fastest and most cost-effective',
  },
  'claude/haiku/v3.5': {
    model: 'claude-3-5-haiku-20241022',
    description: 'claude haiku 3.5 - fast and cost-effective',
  },
  'claude/haiku/v4.5': {
    model: 'claude-haiku-4-5-20251001',
    description: 'claude haiku 4.5 - fastest and most cost-effective',
  },
  'claude/sonnet': {
    model: 'claude-sonnet-4-5-20250929',
    description: 'claude sonnet 4.5 - balanced performance and capability',
  },
  'claude/sonnet/v4': {
    model: 'claude-sonnet-4-20250514',
    description: 'claude sonnet 4 - balanced performance and capability',
  },
  'claude/sonnet/v4.5': {
    model: 'claude-sonnet-4-5-20250929',
    description: 'claude sonnet 4.5 - balanced performance and capability',
  },
  'claude/opus': {
    model: 'claude-opus-4-5-20251101',
    description: 'claude opus 4.5 - most capable for complex reasoning',
  },
  'claude/opus/v4': {
    model: 'claude-opus-4-20250514',
    description: 'claude opus 4 - highly capable for complex reasoning',
  },
  'claude/opus/v4.5': {
    model: 'claude-opus-4-5-20251101',
    description: 'claude opus 4.5 - most capable for complex reasoning',
  },
};

/**
 * .what = factory to generate claude brain atom instances
 * .why = enables model variant selection via slug (e.g., haiku for speed, opus for quality)
 *
 * .example
 *   genBrainAtom({ slug: 'claude/haiku' }) // fast + cheap
 *   genBrainAtom({ slug: 'claude/sonnet' }) // balanced
 *   genBrainAtom({ slug: 'claude/opus/v4.5' }) // highest quality
 */
export const genBrainAtom = (input: { slug: ClaudeAtomSlug }): BrainAtom => {
  const config = CONFIG_BY_SLUG[input.slug];

  return new BrainAtom({
    repo: 'anthropic',
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

      // get anthropic client from context or create new one
      const anthropic =
        (context?.anthropic as Anthropic | undefined) ??
        new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

      // call anthropic api with native structured output (constrained decoding)
      const response = await anthropic.beta.messages.create({
        model: config.model,
        max_tokens: 16384,
        betas: ['structured-outputs-2025-11-13'],
        system: systemPrompt,
        messages: [{ role: 'user', content: askInput.prompt }],
        output_format: betaZodOutputFormat(askInput.schema.output),
      });

      // extract structured output from response text
      const textBlock = response.content.find(
        (block): block is Anthropic.TextBlock => block.type === 'text',
      );
      const output = textBlock?.text ? JSON.parse(textBlock.text) : {};

      // validate via schema
      return askInput.schema.output.parse(output);
    },
  });
};
