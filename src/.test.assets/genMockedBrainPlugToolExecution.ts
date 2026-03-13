import type { BrainPlugToolExecution } from '@src/domain.objects/BrainPlugToolExecution';

/**
 * .what = generates mocked BrainPlugToolExecution for tests
 * .why = provides consistent mock tool execution data for test fixtures
 */
export const genMockedBrainPlugToolExecution = <
  TInput = unknown,
  TOutput = unknown,
>(
  input?:
    | {
        exid?: string;
        slug?: string;
        input?: TInput;
        signal?: 'success';
        output?: TOutput;
        timeMs?: number;
      }
    | {
        exid?: string;
        slug?: string;
        input?: TInput;
        signal: 'error:constraint' | 'error:malfunction';
        error?: Error;
        timeMs?: number;
      },
): BrainPlugToolExecution<TInput, TOutput> => {
  const base = {
    exid: input?.exid ?? '__mock_exid__',
    slug: input?.slug ?? '__mock_tool__',
    input: (input?.input ?? {}) as TInput,
    metrics: {
      cost: {
        time: { milliseconds: input?.timeMs ?? 150 },
      },
    },
  };

  if (input?.signal === 'error:constraint' || input?.signal === 'error:malfunction') {
    return {
      ...base,
      signal: input.signal,
      output: { error: 'error' in input && input.error ? input.error : new Error('mock error') },
    };
  }

  return {
    ...base,
    signal: 'success',
    output: ('output' in (input ?? {}) ? (input as any).output : {}) as TOutput,
  };
};
