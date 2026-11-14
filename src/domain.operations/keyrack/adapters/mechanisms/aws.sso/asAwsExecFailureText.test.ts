import { HelpfulError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { asAwsExecFailureText } from './asAwsExecFailureText';

const TEST_CASES: {
  description: string;
  given: { error: unknown };
  expect: { text: string };
}[] = [
  {
    description: '[case1] an exec error that carries the cli stderr',
    given: {
      error: Object.assign(
        new Error('Command failed: exec aws configure export-credentials'),
        { stderr: '\nError from sso: Token has expired and refresh failed\n' },
      ),
    },
    expect: { text: 'Error from sso: Token has expired and refresh failed' },
  },
  {
    description: '[case2] an exec error whose stderr is blank',
    given: {
      error: Object.assign(new Error('Command failed: exec aws'), {
        stderr: '  \n',
      }),
    },
    expect: { text: 'Command failed: exec aws' },
  },
  {
    description: '[case3] a helpful error with no stderr',
    given: { error: new HelpfulError('the cli could not start') },
    expect: { text: 'the cli could not start' },
  },
  {
    description: '[case4] a raw error with no stderr',
    given: { error: new Error('spawn aws ENOENT') },
    expect: { text: 'spawn aws ENOENT' },
  },
  {
    description: '[case5] a thrown value that is no error',
    given: { error: 'killed' },
    expect: { text: 'killed' },
  },
];

describe('asAwsExecFailureText', () => {
  TEST_CASES.map((thisCase) =>
    given(thisCase.description, () => {
      when('[t0] the text is read', () => {
        then('it is what the cli said, trimmed', () => {
          expect(asAwsExecFailureText(thisCase.given)).toEqual(
            thisCase.expect.text,
          );
        });
      });
    }),
  );
});
