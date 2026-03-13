import type { z } from 'zod';

import type { BrainGrain } from './BrainGrain';
import type { BrainPlugToolExecution } from './BrainPlugToolExecution';
import type { BrainPlugToolInvocation } from './BrainPlugToolInvocation';

/**
 * .what = a declaration of a tool that can be invoked by the brain
 * .why = enables callers to plug tools into BrainAtom and BrainRepl for tool use
 *
 * .note
 * - maps to anthropic's tool definition and openai's function definition
 * - TGrain determines whether execute is present:
 *   - 'atom': no execute (caller handles execution)
 *   - 'repl': execute required (repl calls it automatically)
 * - TSlug enables per-slug type preservation in dictionaries
 * - use genBrainPlugToolDeclaration() to create repl tools with type inference
 */
export type BrainPlugToolDefinition<
  TInput = unknown,
  TOutput = unknown,
  TGrain extends BrainGrain = BrainGrain,
  TSlug extends string = string,
> = {
  /**
   * .what = unique identifier for the tool
   * .example = "stripe.customer.lookup", "os.fileops.ls"
   */
  slug: TSlug;

  /**
   * .what = display name for the tool
   * .why = provides human-readable name for UI and logs
   */
  name: string;

  /**
   * .what = human-readable description of what the tool does
   * .why = helps the brain understand when to use this tool
   */
  description: string;

  /**
   * .what = schemas for tool input and output validation
   * .why = enables type-safe tool invocations and executions
   *
   * .note = input converted to JSON Schema for provider APIs
   */
  schema: {
    input: z.Schema<TInput>;
    output: z.Schema<TOutput>;
  };
} & (TGrain extends 'repl'
  ? {
      /**
       * .what = the operation to execute when the tool is invoked
       * .why = enables BrainRepl to execute tools automatically in the agentic loop
       *
       * .note = returns BrainPlugToolExecution with time, signal, and output
       */
      execute: (
        input: { invocation: BrainPlugToolInvocation<TInput> },
        context: unknown,
      ) => Promise<BrainPlugToolExecution<TInput, TOutput>>;
    }
  : unknown);
