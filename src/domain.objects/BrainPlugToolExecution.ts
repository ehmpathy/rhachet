import type { IsoDuration } from 'iso-time';

/**
 * .what = the result of a tool execution, ready to feed back into the brain
 * .why = enables typed tool result continuation for brain atoms
 *
 * .note = maps to anthropic's tool_result block and openai's tool message
 * .note = discriminated union: signal narrows output type
 *   - signal: 'success' → output: TOutput
 *   - signal: 'error:*' → output: { error: Error }
 */
export type BrainPlugToolExecution<TInput = unknown, TOutput = unknown> =
  | {
      /**
       * .what = provider-assigned external ID for correlation
       * .why = links this result back to the original invocation
       */
      exid: string;

      /**
       * .what = unique identifier for the tool
       * .why = enables validation that execution matches expected tool
       */
      slug: string;

      /**
       * .what = the input the tool was called with
       * .why = enables round-trip type safety
       */
      input: TInput;

      /**
       * .what = outcome signal for the execution
       * .why = enables the brain to reason about success vs failure modes
       */
      signal: 'success';

      /**
       * .what = what the tool returned
       * .why = the payload to feed back to the brain
       */
      output: TOutput;

      /**
       * .what = observability metrics for the execution
       * .why = enables cost observation and performance analysis
       */
      metrics: {
        cost: {
          time: IsoDuration;
        };
      };
    }
  | {
      exid: string;
      slug: string;
      input: TInput;
      signal: 'error:constraint' | 'error:malfunction';
      output: { error: Error };
      metrics: {
        cost: {
          time: IsoDuration;
        };
      };
    };
