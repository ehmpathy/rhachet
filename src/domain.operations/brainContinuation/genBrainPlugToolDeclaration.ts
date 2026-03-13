import { BadRequestError } from 'helpful-errors';
import type { z } from 'zod';

import type { BrainPlugToolDefinition } from '@src/domain.objects/BrainPlugToolDefinition';
import type { BrainPlugToolExecution } from '@src/domain.objects/BrainPlugToolExecution';
import type { BrainPlugToolInvocation } from '@src/domain.objects/BrainPlugToolInvocation';

/**
 * .what = factory to create a BrainPlugToolDefinition with type inference from schema
 * .why = enables tool authors to write minimal code with full type safety
 *
 * .note
 * - infers TInput from schema.input
 * - infers TOutput from schema.output
 * - infers TSlug literal type from slug string
 * - wraps execute to return BrainPlugToolExecution with time and signal
 * - classifies errors: BadRequestError → 'error:constraint', else → 'error:malfunction'
 *
 * @example
 * const customerLookupTool = genBrainPlugToolDeclaration({
 *   slug: 'customer-lookup',
 *   name: 'Customer Lookup',
 *   description: 'lookup customer by email',
 *   schema: {
 *     input: z.object({ email: z.string().email() }),
 *     output: z.object({ id: z.string(), name: z.string() }),
 *   },
 *   execute: async ({ invocation }) => {
 *     // invocation.input typed as { email: string }
 *     // return type enforced as { id: string, name: string }
 *     return { id: 'cus_123', name: 'Alice' };
 *   },
 * });
 *
 * // slug type is preserved: typeof customerLookupTool.slug === 'customer-lookup'
 */
export const genBrainPlugToolDeclaration = <
  TInput,
  TOutput,
  const TSlug extends string,
>(input: {
  slug: TSlug;
  name: string;
  description: string;
  schema: {
    input: z.ZodType<TInput>;
    output: z.ZodType<TOutput>;
  };
  execute: (
    input: { invocation: BrainPlugToolInvocation<TInput> },
    context: unknown,
  ) => Promise<TOutput> | TOutput;
}): BrainPlugToolDefinition<TInput, TOutput, 'repl', TSlug> => {
  return {
    slug: input.slug,
    name: input.name,
    description: input.description,
    schema: input.schema,
    execute: async (
      execInput: { invocation: BrainPlugToolInvocation<TInput> },
      context: unknown,
    ): Promise<BrainPlugToolExecution<TInput, TOutput>> => {
      const { invocation } = execInput;
      const timeBefore = Date.now();

      try {
        const output = await input.execute(execInput, context);
        return {
          exid: invocation.exid,
          slug: invocation.slug,
          input: invocation.input,
          signal: 'success',
          output,
          metrics: {
            cost: { time: { milliseconds: Date.now() - timeBefore } },
          },
        };
      } catch (error) {
        const isConstraint = error instanceof BadRequestError;
        return {
          exid: invocation.exid,
          slug: invocation.slug,
          input: invocation.input,
          signal: isConstraint ? 'error:constraint' : 'error:malfunction',
          output: {
            error: error instanceof Error ? error : new Error(String(error)),
          },
          metrics: {
            cost: { time: { milliseconds: Date.now() - timeBefore } },
          },
        };
      }
    },
  };
};
