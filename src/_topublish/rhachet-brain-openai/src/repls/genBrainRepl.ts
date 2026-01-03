import { Codex } from '@openai/codex-sdk';
import type { Artifact } from 'rhachet-artifact';
import type { GitFile } from 'rhachet-artifact-git';
import type { Empty } from 'type-fns';
import { withRetry, withTimeout } from 'wrapper-fns';
import type { z } from 'zod';

import { BrainRepl } from '@src/domain.objects/BrainRepl';
import { castBriefsToPrompt } from '@src/domain.operations/briefs/castBriefsToPrompt';
import { castZodToJsonSchema } from '@src/domain.operations/schema/castZodToJsonSchema';

/**
 * .what = supported openai codex repl slugs
 * .why = enables type-safe slug specification with model variants
 */
type CodexSlug =
  | 'openai/codex'
  | 'openai/codex/max'
  | 'openai/codex/mini'
  | 'openai/codex/5.2';

/**
 * .what = model configuration by slug
 * .why = maps slugs to API model names and descriptions
 */
const CONFIG_BY_SLUG: Record<
  CodexSlug,
  { model: string | undefined; description: string }
> = {
  'openai/codex': {
    model: undefined, // use SDK default (gpt-5.1-codex-max)
    description: 'codex - agentic coding assistant (default model)',
  },
  'openai/codex/max': {
    model: 'gpt-5.1-codex-max',
    description: 'codex max - optimized for long-horizon agentic coding',
  },
  'openai/codex/mini': {
    model: 'gpt-5.1-codex-mini',
    description: 'codex mini - fast and cost-effective',
  },
  'openai/codex/5.2': {
    model: 'gpt-5.2-codex',
    description: 'codex 5.2 - most advanced agentic coding model',
  },
};

/**
 * .what = composes full prompt with optional system context
 * .why = codex-sdk ThreadOptions doesn't have systemPrompt, must prepend to user prompt
 */
const composePromptWithSystem = (
  userPrompt: string,
  systemPrompt: string | undefined,
): string => {
  if (!systemPrompt) return userPrompt;
  return `${systemPrompt}\n\n---\n\n${userPrompt}`;
};

/**
 * .what = invokes codex sdk with specified sandbox mode
 * .why = dedupes shared logic between ask (read-only) and act (workspace-write)
 */
const invokeCodex = async <TOutput>(input: {
  mode: 'ask' | 'act';
  model: string | undefined;
  role: { briefs?: Artifact<typeof GitFile>[] };
  prompt: string;
  schema: { output: z.Schema<TOutput> };
}): Promise<TOutput> => {
  // compose system prompt from briefs
  const systemPrompt = input.role.briefs
    ? await castBriefsToPrompt({ briefs: input.role.briefs })
    : undefined;

  // convert zod schema to json schema for native enforcement
  const outputSchema = castZodToJsonSchema({
    schema: input.schema.output,
    target: 'openai',
  });

  // create codex client
  const codex = new Codex({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // start thread with sandbox mode based on operation type
  const sandboxMode = input.mode === 'ask' ? 'read-only' : 'workspace-write';
  const thread = codex.startThread({
    model: input.model,
    sandboxMode,
  });

  // compose full prompt and run with timeout + retry for resilience
  const fullPrompt = composePromptWithSystem(input.prompt, systemPrompt);
  const response = await withRetry(
    withTimeout(async () => thread.run(fullPrompt, { outputSchema }), {
      threshold: { seconds: 60 },
    }),
  )();

  // parse output via schema for runtime validation
  return input.schema.output.parse(JSON.parse(response.finalResponse));
};

/**
 * .what = factory to generate openai codex brain repl instances
 * .why = enables model variant selection via slug
 *
 * .example
 *   genBrainRepl({ slug: 'openai/codex' }) // default model
 *   genBrainRepl({ slug: 'openai/codex/mini' }) // fast + cheap
 *   genBrainRepl({ slug: 'openai/codex/5.2' }) // most advanced
 */
export const genBrainRepl = (input: { slug: CodexSlug }): BrainRepl => {
  const config = CONFIG_BY_SLUG[input.slug];

  // extract model slug without the repo prefix (e.g., 'openai/codex' -> 'codex')
  const modelSlug = input.slug.replace(/^openai\//, '');

  return new BrainRepl({
    repo: 'openai',
    slug: modelSlug,
    description: config.description,

    /**
     * .what = readonly analysis (research, queries, code review)
     * .why = provides safe, non-mutating agent interactions via read-only sandbox
     */
    ask: async <TOutput>(
      askInput: {
        role: { briefs?: Artifact<typeof GitFile>[] };
        prompt: string;
        schema: { output: z.Schema<TOutput> };
      },
      _context?: Empty,
    ): Promise<TOutput> =>
      invokeCodex({ mode: 'ask', model: config.model, ...askInput }),

    /**
     * .what = read+write actions (code changes, file edits)
     * .why = provides full agentic capabilities via workspace-write sandbox
     */
    act: async <TOutput>(
      actInput: {
        role: { briefs?: Artifact<typeof GitFile>[] };
        prompt: string;
        schema: { output: z.Schema<TOutput> };
      },
      _context?: Empty,
    ): Promise<TOutput> =>
      invokeCodex({ mode: 'act', model: config.model, ...actInput }),
  });
};
