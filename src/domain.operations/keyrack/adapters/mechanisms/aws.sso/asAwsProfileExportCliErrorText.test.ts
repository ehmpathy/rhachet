import { HelpfulError, MalfunctionError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { asAwsProfileExportCliErrorText } from './asAwsProfileExportCliErrorText';

const TEST_CASES: {
  description: string;
  given: { error: unknown };
  expect: { text: string };
}[] = [
  {
    description: "[case1] the op's cli fault, with the cli's own words",
    given: {
      error: new MalfunctionError('aws configure export-credentials failed', {
        profile: 'acme-prod',
        cliError: 'Error from sso: Token has EXPIRED and refresh failed',
        hint: 're-run `rhx keyrack unlock` to refresh the sso session, then retry',
      }),
    },
    expect: { text: 'error from sso: token has expired and refresh failed' },
  },
  {
    description:
      '[case2] a helpful error with no cliError, whose profile and hint say "invalid" and "expired"',
    given: {
      error: new MalfunctionError('aws configure export-credentials hung', {
        profile: 'acme-invalid',
        hint: 'if the session expired, re-run the unlock',
      }),
    },
    expect: { text: '' },
  },
  {
    description: '[case3] a helpful error whose cliError is not a string',
    given: {
      error: new HelpfulError('aws configure export-credentials failed', {
        cliError: 42,
      }),
    },
    expect: { text: '' },
  },
  {
    description: '[case4] a raw error, read by its message',
    given: { error: new Error('Token has Expired') },
    expect: { text: 'token has expired' },
  },
  {
    description: '[case5] a thrown value that is no error',
    given: { error: 'expired' },
    expect: { text: '' },
  },
];

describe('asAwsProfileExportCliErrorText', () => {
  TEST_CASES.map((thisCase) =>
    given(thisCase.description, () => {
      when('[t0] the text is read', () => {
        then("it is only the cli's own words, lowercased", () => {
          expect(asAwsProfileExportCliErrorText(thisCase.given)).toEqual(
            thisCase.expect.text,
          );
        });
      });
    }),
  );
});
