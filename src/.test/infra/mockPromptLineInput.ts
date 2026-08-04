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

// prior stdin.isTTY, captured the first time a test overrides it, so restore is exact.
// a `boolean | undefined` slot plus an overridden flag distinguishes "no override yet" from
// "the prior value was genuinely undefined" — so restore never guesses.
let priorStdinIsTty: boolean | undefined;
let stdinIsTtyOverridden = false;

/**
 * .what = sets mock prompt values for subsequent promptLineInput calls
 * .why = enables tests to inject choice values
 *
 * .note = a mocked line prompt stands in for an interactive human, so stdin must present as an
 *   answerable terminal. inferKeyrackMechForSet's no-TTY guard fails loud when stdin is not a
 *   terminal (an unattended set must never hang); without this signal that guard would fire
 *   before the mocked prompt, so the injected answers would never be read. the override is
 *   captured here (not at module load) and restored by clearMockPromptLineValues, so the
 *   mutation never leaks past the test that opted into it (rule.forbid.behavior-hazards).
 */
export const setMockPromptLineValues = (values: string | string[]): void => {
  mockPromptLineQueue = Array.isArray(values) ? [...values] : [values];
  if (!stdinIsTtyOverridden) {
    priorStdinIsTty = process.stdin.isTTY;
    stdinIsTtyOverridden = true;
  }
  process.stdin.isTTY = true;
};

/**
 * .what = clears the mock prompt line queue and restores stdin.isTTY
 * .why = cleanup between tests; restore the captured stdin.isTTY so the terminal signal never
 *   leaks into another test that depends on the real state (rule.forbid.behavior-hazards)
 */
export const clearMockPromptLineValues = (): void => {
  mockPromptLineQueue = [];
  if (stdinIsTtyOverridden) {
    process.stdin.isTTY = priorStdinIsTty as boolean;
    stdinIsTtyOverridden = false;
  }
};

/**
 * .what = generates a mock factory for jest.mock()
 * .why = ES modules require module-level mock before imports
 *
 * .note = use with: jest.mock('@src/infra/promptLineInput', () => genMockPromptLineInput())
 */
export const genMockPromptLineInput = (): {
  promptLineInput: jest.Mock;
} => {
  // note: the stdin.isTTY override that lets the no-TTY guard pass is applied by
  // setMockPromptLineValues (and undone by clearMockPromptLineValues), NOT here at module load,
  // so the terminal signal never leaks past a test that opted into it.
  return {
    promptLineInput: jest.fn(async () => {
      const value = mockPromptLineQueue.shift();
      if (value === undefined) {
        throw new Error(
          'mockPromptLineInput: queue empty — call setMockPromptLineValues() before the operation',
        );
      }
      return value;
    }),
  };
};
