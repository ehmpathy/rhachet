import type { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

/**
 * .what = convert a zod schema to JSON schema for native SDK enforcement
 * .why = enables native structured output support in SDKs, reducing
 *   token waste on validation retries
 *
 * .note = different SDKs require different conversion options:
 *   - claude-agent-sdk: { $refStrategy: 'root' }
 *   - codex-sdk: { target: 'openAi' }
 */
export const castZodToJsonSchema = (input: {
  schema: z.ZodSchema;
  target: 'claude' | 'openai';
}): object => {
  // convert based on target SDK
  if (input.target === 'claude') {
    return zodToJsonSchema(input.schema, { $refStrategy: 'root' });
  }

  // openai target
  return zodToJsonSchema(input.schema, { target: 'openAi' });
};
