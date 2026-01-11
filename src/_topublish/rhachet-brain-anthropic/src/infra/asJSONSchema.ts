import type { z } from 'zod';

/**
 * .what = converts zod schema to JSON schema for claude-agent-sdk
 * .why = claude-agent-sdk doesn't expect $schema property; strip it for compatibility
 */
export const asJSONSchema = (input: {
  schema: z.ZodSchema;
}): Record<string, unknown> => {
  // convert zod schema to json schema
  const { z } = require('zod');
  const jsonSchemaRaw = z.toJSONSchema(input.schema);

  // remove $schema property as claude-agent-sdk doesn't expect it
  const { $schema: _, ...jsonSchema } = jsonSchemaRaw as Record<
    string,
    unknown
  >;

  return jsonSchema;
};
