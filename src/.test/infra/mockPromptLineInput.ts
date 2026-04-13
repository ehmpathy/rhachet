/**
 * .what = mock for promptLineInput in tests with sequential prompts
 * .why = inferKeyrackMechForSet prompts for mech selection via stdin
 *
 * .usage (module-level jest.mock pattern for ES modules):
 *
 *   import {
 *     genMockPromptLineInput,
 *     setMockPromptLineValues,
 *   } from '@src/.test/infra/mockPromptLineInput';
 *
 *   jest.mock('@src/infra/promptLineInput', () => genMockPromptLineInput());
 *
 *   // in tests:
 *   setMockPromptLineValues('1');
 *   setMockPromptLineValues(['1', '2']);
 */

// shared queue for mock values
let mockPromptLineQueue: string[] = [];

/**
 * .what = sets mock prompt values for subsequent promptLineInput calls
 * .why = enables tests to inject choice values
 */
export const setMockPromptLineValues = (values: string | string[]): void => {
  mockPromptLineQueue = Array.isArray(values) ? [...values] : [values];
};

/**
 * .what = clears the mock prompt line queue
 * .why = cleanup between tests
 */
export const clearMockPromptLineValues = (): void => {
  mockPromptLineQueue = [];
};

/**
 * .what = generates a mock factory for jest.mock()
 * .why = ES modules require module-level mock before imports
 *
 * .note = use with: jest.mock('@src/infra/promptLineInput', () => genMockPromptLineInput())
 */
export const genMockPromptLineInput = (): {
  promptLineInput: jest.Mock;
} => ({
  promptLineInput: jest.fn(async () => {
    const value = mockPromptLineQueue.shift();
    if (value === undefined) {
      throw new Error(
        'mockPromptLineInput: queue empty — call setMockPromptLineValues() before the operation',
      );
    }
    return value;
  }),
});
