/**
 * .what = mock for promptHiddenInput in vault adapter tests
 * .why = vaults prompt for their own secrets via stdin; tests must mock this
 *
 * .usage (module-level jest.mock pattern for ES modules):
 *
 *   import {
 *     genMockPromptHiddenInput,
 *     setMockPromptValues,
 *   } from '@src/.test/infra/mockPromptHiddenInput';
 *
 *   jest.mock('@src/infra/promptHiddenInput', () => genMockPromptHiddenInput());
 *
 *   // in tests:
 *   setMockPromptValues('secret-value');
 *   setMockPromptValues(['value1', 'value2']);
 */

// shared queue for mock values
let mockPromptQueue: string[] = [];

/**
 * .what = sets mock prompt values for subsequent promptHiddenInput calls
 * .why = enables vault adapter tests to inject secret values
 */
export const setMockPromptValues = (values: string | string[]): void => {
  mockPromptQueue = Array.isArray(values) ? [...values] : [values];
};

/**
 * .what = clears the mock prompt queue
 * .why = cleanup between tests
 */
export const clearMockPromptValues = (): void => {
  mockPromptQueue = [];
};

/**
 * .what = generates a mock factory for jest.mock()
 * .why = ES modules require module-level mock before imports
 *
 * .note = use with: jest.mock('@src/infra/promptHiddenInput', () => genMockPromptHiddenInput())
 */
export const genMockPromptHiddenInput = (): {
  promptHiddenInput: jest.Mock;
} => ({
  promptHiddenInput: jest.fn(async () => {
    const value = mockPromptQueue.shift();
    if (value === undefined) {
      throw new Error(
        'mockPromptHiddenInput: queue empty — call setMockPromptValues() before the operation',
      );
    }
    return value;
  }),
});
