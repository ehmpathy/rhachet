import { query } from '@anthropic-ai/claude-agent-sdk';
import type { Artifact } from 'rhachet-artifact';
import type { GitFile } from 'rhachet-artifact-git';
import type { Empty } from 'type-fns';
import type { z } from 'zod';

import { BrainRepl } from '@src/domain.objects/BrainRepl';
import { castBriefsToPrompt } from '@src/domain.operations/briefs/castBriefsToPrompt';
import { castZodToJsonSchema } from '@src/domain.operations/schema/castZodToJsonSchema';

/**
 * .what = supported claude code repl slugs
 * .why = enables type-safe slug specification with model variants
 */
type ClaudeCodeSlug =
  | 'claude/code'
  | 'claude/code/haiku'
  | 'claude/code/haiku/v4.5'
  | 'claude/code/sonnet'
  | 'claude/code/sonnet/v4'
  | 'claude/code/sonnet/v4.5'
  | 'claude/code/opus'
  | 'claude/code/opus/v4.5';

/**
 * .what = maps slug to anthropic model identifier
 * .why = translates friendly slugs to API model names
 */
const MODEL_BY_SLUG: Record<ClaudeCodeSlug, string | undefined> = {
  'claude/code': undefined, // use SDK default
  'claude/code/haiku': 'claude-haiku-4-5-20251001',
  'claude/code/haiku/v4.5': 'claude-haiku-4-5-20251001',
  'claude/code/sonnet': 'claude-sonnet-4-5-20250929',
  'claude/code/sonnet/v4': 'claude-sonnet-4-20250514',
  'claude/code/sonnet/v4.5': 'claude-sonnet-4-5-20250929',
  'claude/code/opus': 'claude-opus-4-20250514',
  'claude/code/opus/v4.5': 'claude-opus-4-5-20251101',
};

/**
 * .what = tools disallowed for readonly ask operations
 * .why = prevents mutations during research/analysis tasks
 */
const TOOLS_DISALLOWED_FOR_ASK = [
  'Edit',
  'Write',
  'Bash',
  'NotebookEdit',
] as const;

/**
 * .what = tools allowed for read+write act operations
 * .why = enables full agentic capabilities for code changes
 */
const TOOLS_ALLOWED_FOR_ACT = [
  'Read',
  'Edit',
  'Write',
  'Bash',
  'Glob',
  'Grep',
  'Task',
] as const;

/**
 * .what = extracts final result from claude-agent-sdk query async generator
 * .why = query() returns an async iterator, need to consume to get result
 *
 * .note = when outputFormat is used, result may be in structured_output field
 */
const extractResultFromQuery = async (
  queryIterator: ReturnType<typeof query>,
): Promise<unknown> => {
  let result: string | undefined;
  let structuredOutput: unknown | undefined;
  for await (const message of queryIterator) {
    // check for result message with success subtype
    if (message.type === 'result' && message.subtype === 'success') {
      result = message.result;
      structuredOutput = message.structured_output;
    }

    // throw on error subtypes
    if (message.type === 'result' && message.subtype !== 'success') {
      throw new Error(
        `claude-agent-sdk query failed: ${message.subtype}, errors: ${message.errors?.join(', ') ?? 'unknown'}`,
      );
    }
  }

  // prefer structured_output when available (used with outputFormat)
  if (structuredOutput !== undefined) return structuredOutput;

  // fall back to parsing result as JSON
  if (result !== undefined) return JSON.parse(result);

  throw new Error('no result message received from claude-agent-sdk');
};

/**
 * .what = invokes claude-agent-sdk query with specified mode
 * .why = dedupes shared logic between ask (readonly) and act (read+write)
 */
const invokeQuery = async <TOutput>(input: {
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

  // convert zod schema to json schema for native structured output
  const jsonSchema = castZodToJsonSchema({
    schema: input.schema.output,
    target: 'claude',
  });

  // build tool constraints based on mode
  const toolConstraints =
    input.mode === 'ask'
      ? { disallowedTools: [...TOOLS_DISALLOWED_FOR_ASK] }
      : { allowedTools: [...TOOLS_ALLOWED_FOR_ACT] };

  // invoke claude-agent-sdk query
  const queryIterator = query({
    prompt: input.prompt,
    options: {
      systemPrompt,
      model: input.model,
      ...toolConstraints,
      outputFormat: {
        type: 'json_schema',
        schema: jsonSchema as Record<string, unknown>,
      },
    },
  });

  // extract final result from async iterator
  const result = await extractResultFromQuery(queryIterator);

  // parse output via schema for runtime validation
  return input.schema.output.parse(result);
};

/**
 * .what = factory to generate claude code brain repl instances
 * .why = enables model variant selection via slug (e.g., haiku for speed, opus for quality)
 *
 * .example
 *   genBrainRepl({ slug: 'claude/code' }) // default model
 *   genBrainRepl({ slug: 'claude/code/haiku' }) // fast + cheap
 *   genBrainRepl({ slug: 'claude/code/opus/v4.5' }) // highest quality
 */
export const genBrainRepl = (input: { slug: ClaudeCodeSlug }): BrainRepl => {
  const model = MODEL_BY_SLUG[input.slug];

  return new BrainRepl({
    repo: 'anthropic',
    slug: input.slug,
    description: `claude code (${input.slug}) - agentic coding assistant with tool use`,

    /**
     * .what = readonly analysis (research, queries, code review)
     * .why = provides safe, non-mutating agent interactions
     */
    ask: async <TOutput>(
      askInput: {
        role: { briefs?: Artifact<typeof GitFile>[] };
        prompt: string;
        schema: { output: z.Schema<TOutput> };
      },
      _context?: Empty,
    ): Promise<TOutput> => invokeQuery({ mode: 'ask', model, ...askInput }),

    /**
     * .what = read+write actions (code changes, file edits)
     * .why = provides full agentic capabilities with write access
     */
    act: async <TOutput>(
      actInput: {
        role: { briefs?: Artifact<typeof GitFile>[] };
        prompt: string;
        schema: { output: z.Schema<TOutput> };
      },
      _context?: Empty,
    ): Promise<TOutput> => invokeQuery({ mode: 'act', model, ...actInput }),
  });
};
