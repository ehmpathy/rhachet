import { asAwsCredentialsFromEnvLines } from './asAwsCredentialsFromEnvLines';

const TEST_CASES = [
  {
    description: 'reads each KEY=value line of a full reply',
    given: {
      stdout: [
        'AWS_ACCESS_KEY_ID=MOCKACCESSKEYID',
        'AWS_SECRET_ACCESS_KEY=mocksecret',
        'AWS_SESSION_TOKEN=mocktoken',
        'AWS_CREDENTIAL_EXPIRATION=2026-11-14T09:00:00+00:00',
        '',
      ].join('\n'),
    },
    expect: {
      output: {
        AWS_ACCESS_KEY_ID: 'MOCKACCESSKEYID',
        AWS_SECRET_ACCESS_KEY: 'mocksecret',
        AWS_SESSION_TOKEN: 'mocktoken',
        AWS_CREDENTIAL_EXPIRATION: '2026-11-14T09:00:00+00:00',
      },
    },
  },
  {
    description:
      'keeps every = past the first, so a base64 token survives whole',
    given: { stdout: 'AWS_SESSION_TOKEN=abc==\n' },
    expect: { output: { AWS_SESSION_TOKEN: 'abc==' } },
  },
  {
    description: 'skips a line that is no KEY=value pair',
    given: {
      stdout: 'warn: the cli is old\nAWS_ACCESS_KEY_ID=MOCKACCESSKEYID\n',
    },
    expect: { output: { AWS_ACCESS_KEY_ID: 'MOCKACCESSKEYID' } },
  },
  {
    description: 'reads an empty reply as no pairs',
    given: { stdout: '' },
    expect: { output: {} },
  },
];

describe('asAwsCredentialsFromEnvLines', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(
        asAwsCredentialsFromEnvLines({ stdout: thisCase.given.stdout }),
      ).toEqual(thisCase.expect.output);
    }),
  );
});
