import { BrainPlugToolInvocation } from '@src/domain.objects/BrainPlugToolInvocation';

/**
 * .what = generates mocked BrainPlugToolInvocation for tests
 * .why = provides consistent mock tool invocation data for test fixtures
 */
export const genMockedBrainPlugToolInvocation = <TInput = unknown>(input?: {
  exid?: string;
  slug?: string;
  input?: TInput;
}): BrainPlugToolInvocation<TInput> =>
  new BrainPlugToolInvocation<TInput>({
    exid: input?.exid ?? '__mock_exid__',
    slug: input?.slug ?? '__mock_tool__',
    input: (input?.input ?? {}) as TInput,
  });
