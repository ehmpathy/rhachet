import { DomainLiteral } from 'domain-objects';
import type { z } from 'zod';

/**
 * .what = a declaration of a tool that can be invoked by the brain
 * .why = enables callers to plug tools into BrainAtom for tool use
 *
 * .note = maps to anthropic's tool definition and openai's function definition
 */
export interface BrainPlugToolDefinition {
  /**
   * .what = unique identifier for the tool
   * .example = "stripe.customer.lookup", "os.fileops.ls"
   */
  slug: string;

  /**
   * .what = human-readable description of what the tool does
   * .why = helps the brain understand when to use this tool
   */
  description: string;

  /**
   * .what = schema for tool input validation
   * .why = enables type-safe tool invocations
   *
   * .note = converted to JSON Schema for provider APIs
   */
  schema: {
    input: z.Schema<unknown>;
  };
}

export class BrainPlugToolDefinition
  extends DomainLiteral<BrainPlugToolDefinition>
  implements BrainPlugToolDefinition {}
