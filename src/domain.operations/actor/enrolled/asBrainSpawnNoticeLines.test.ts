import { given, then, useBeforeAll, when } from 'test-fns';

import { asBrainSpawnNoticeLines } from './asBrainSpawnNoticeLines';

const BRAIN_AUTH_PATH = '/home/human/.claude/.credentials.json';
const GROVE_PRESENT = {
  isPresent: true,
  source: '/home/human/.claude/settings.json',
};
const GROVE_ABSENT = {
  isPresent: false,
  source: '/home/human/.claude/settings.json',
};

const TEST_CASES: {
  description: string;
  env: NodeJS.ProcessEnv;
  isBrainAuthAbsent: boolean;
  grove: { isPresent: boolean; source: string };
  expected: { absent: boolean; apiBilled: boolean; groveAbsent: boolean };
}[] = [
  {
    description: 'a login, no env credential, a grove: naught to say',
    env: {},
    isBrainAuthAbsent: false,
    grove: GROVE_PRESENT,
    expected: { absent: false, apiBilled: false, groveAbsent: false },
  },
  {
    description: 'no login, no env credential: the /login hint',
    env: {},
    isBrainAuthAbsent: true,
    grove: GROVE_PRESENT,
    expected: { absent: true, apiBilled: false, groveAbsent: false },
  },
  {
    description:
      'no login, an api key: the api-billed notice alone, no /login hint',
    env: { ANTHROPIC_API_KEY: 'sk-ant-api-fake' },
    isBrainAuthAbsent: true,
    grove: GROVE_PRESENT,
    expected: { absent: false, apiBilled: true, groveAbsent: false },
  },
  {
    description:
      'no login, an auth token: the api-billed notice alone, no /login hint',
    env: { ANTHROPIC_AUTH_TOKEN: 'sk-ant-auth-fake' },
    isBrainAuthAbsent: true,
    grove: GROVE_PRESENT,
    expected: { absent: false, apiBilled: true, groveAbsent: false },
  },
  {
    description:
      'no login, an oauth token: naught, since the token authenticates the clone',
    env: { CLAUDE_CODE_OAUTH_TOKEN: 'sk-ant-oat-fake' },
    isBrainAuthAbsent: true,
    grove: GROVE_PRESENT,
    expected: { absent: false, apiBilled: false, groveAbsent: false },
  },
  {
    description:
      'a login and an api key: the api-billed notice, since the key outranks the login',
    env: { ANTHROPIC_API_KEY: 'sk-ant-api-fake' },
    isBrainAuthAbsent: false,
    grove: GROVE_PRESENT,
    expected: { absent: false, apiBilled: true, groveAbsent: false },
  },
  {
    description:
      'no login, no env credential, no grove: the /login hint, then the grove line',
    env: {},
    isBrainAuthAbsent: true,
    grove: GROVE_ABSENT,
    expected: { absent: true, apiBilled: false, groveAbsent: true },
  },
  {
    description:
      'a login, an api key, no grove: the api-billed notice, then the grove line',
    env: { ANTHROPIC_API_KEY: 'sk-ant-api-fake' },
    isBrainAuthAbsent: false,
    grove: GROVE_ABSENT,
    expected: { absent: false, apiBilled: true, groveAbsent: true },
  },
];

describe('asBrainSpawnNoticeLines', () => {
  TEST_CASES.map((thisCase, index) =>
    given(`[case${index + 1}] ${thisCase.description}`, () => {
      when('[t0] the spawn notices are rendered', () => {
        // .note = useBeforeAll hands back a proxy over a Record, so the lines ride a field
        const result = useBeforeAll(async () => ({
          lines: asBrainSpawnNoticeLines({
            env: thisCase.env,
            brainAuthPath: BRAIN_AUTH_PATH,
            isBrainAuthAbsent: thisCase.isBrainAuthAbsent,
            grove: thisCase.grove,
          }),
        }));

        then(
          'it prints exactly the notices the precedence allows, in order',
          () => {
            expect(result.lines).toMatchSnapshot();
          },
        );

        then(
          `it ${thisCase.expected.absent ? 'prints' : 'omits'} the no-login hint`,
          () => {
            expect(
              result.lines.some((line) => line.startsWith('ℹ no claude login')),
            ).toEqual(thisCase.expected.absent);
          },
        );

        then(
          `it ${thisCase.expected.apiBilled ? 'prints' : 'omits'} the api-billed notice`,
          () => {
            expect(
              result.lines.some((line) =>
                line.includes('bills the anthropic api'),
              ),
            ).toEqual(thisCase.expected.apiBilled);
          },
        );

        then(
          `it ${thisCase.expected.groveAbsent ? 'prints' : 'omits'} the grove line`,
          () => {
            expect(
              result.lines.some((line) => line.startsWith('ℹ no grove')),
            ).toEqual(thisCase.expected.groveAbsent);
          },
        );

        then('it never prints a credential value', () => {
          expect(result.lines.join('\n')).not.toContain('fake');
        });
      });
    }),
  );
});
