import { isTimeoutFailure } from './isTimeoutFailure';

/**
 * .what = the repo-relative paths of the test files whose failure reads as a timeout
 * .why = a starved red hands its reader the scoped re-run; these are the files it names
 */
export const asFilesTimedOut = (input: {
  testResults: Array<{ testFilePath: string; failureMessage?: string | null }>;
  repoRoot: string;
}): string[] =>
  input.testResults
    .filter((file) => isTimeoutFailure({ message: file.failureMessage ?? '' }))
    .map((file) => file.testFilePath.replace(`${input.repoRoot}/`, ''));
