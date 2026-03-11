import { DomainLiteral } from 'domain-objects';

/**
 * .what = a request from the brain to execute a tool
 * .why = enables callers to receive and process tool calls from the brain
 *
 * .note = maps to anthropic's tool_use block and openai's tool_calls entry
 */
export interface BrainPlugToolInvocation<TInput = unknown> {
  /**
   * .what = provider-assigned external ID for correlation
   * .why = enables the caller to correlate tool results with tool calls
   *
   * .note = required for tool result continuation in next exchange
   */
  exid: string;

  /**
   * .what = unique identifier for the tool
   * .example = "stripe.customer.lookup", "os.fileops.ls"
   */
  slug: string;

  /**
   * .what = parsed arguments for the tool
   * .why = enables type-safe tool execution
   *
   * .note = parsed from provider's format (anthropic: object, openai: JSON string)
   */
  input: TInput;
}

export class BrainPlugToolInvocation<TInput = unknown>
  extends DomainLiteral<BrainPlugToolInvocation<TInput>>
  implements BrainPlugToolInvocation<TInput> {}
