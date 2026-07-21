/**
 * .what = derives the process exit code from a caught error
 * .why = keeps the cli error-handler as narrative; some helpful-errors carry a
 *   structured `.code.exit` (e.g. ConstraintError = 2), else default to 1
 */
export const getExitCodeFromError = (input: { error: Error }): number => {
  const { error } = input;
  return 'code' in error &&
    typeof error.code === 'object' &&
    error.code !== null &&
    'exit' in error.code &&
    typeof error.code.exit === 'number'
    ? error.code.exit
    : 1;
};
