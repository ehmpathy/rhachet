import { given, then, when } from 'test-fns';

import { asFilesTimedOut } from './asFilesTimedOut';

describe('asFilesTimedOut', () => {
  given('[case1] the results of a run with one timeout, one assertion red, and one green', () => {
    when('[t0] the timed-out files are read', () => {
      then('only the timeout is named, relative to the repo root', () => {
        expect(
          asFilesTimedOut({
            repoRoot: '/repo',
            testResults: [
              {
                testFilePath: '/repo/blackbox/cli/enroll.acceptance.test.ts',
                failureMessage: 'thrown: "Exceeded timeout of 90000 ms for a test."',
              },
              {
                testFilePath: '/repo/blackbox/cli/init.acceptance.test.ts',
                failureMessage: 'expect(received).toEqual(expected)',
              },
              { testFilePath: '/repo/blackbox/cli/list.acceptance.test.ts', failureMessage: null },
            ],
          }),
        ).toEqual(['blackbox/cli/enroll.acceptance.test.ts']);
      });
    });
  });
});
