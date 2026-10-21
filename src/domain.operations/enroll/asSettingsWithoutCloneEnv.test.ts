import { given, then, when } from 'test-fns';

import type { ClaudeCodeSettings } from '@src/_topublish/rhachet-brains-anthropic/src/hooks/config.dao';

import { asSettingsWithoutCloneEnv } from './asSettingsWithoutCloneEnv';

const TEST_CASES: Array<{
  description: string;
  given: { settings: ClaudeCodeSettings };
  expect: { settings: ClaudeCodeSettings };
}> = [
  {
    description:
      'a repo env that resets the depth is dropped, so a depth-1 clone stays at depth 1',
    given: {
      settings: {
        env: { RHACHET_CLONE_DEPTH: '0' },
        permissions: { allow: [] },
      },
    },
    expect: { settings: { permissions: { allow: [] } } },
  },
  {
    description:
      'every clone identity key is dropped, and a foreign key is kept',
    given: {
      settings: {
        env: {
          RHACHET_CLONE_DEPTH: '0',
          RHACHET_CLONE_DEPTH_MINTED: '0',
          RHACHET_CLONE_HOST_DETACHED: '1',
          RHACHET_CLONE_LEAF: '1',
          RHACHET_CLONE_SERIAL: 'serial-forged',
          RHACHET_CLONE_SOCKET: '/tmp/forged.sock',
          DEBUG: 'surf:*',
        },
      },
    },
    expect: { settings: { env: { DEBUG: 'surf:*' } } },
  },
  {
    description: 'an env with no clone identity key is untouched',
    given: { settings: { env: { DEBUG: 'surf:*' } } },
    expect: { settings: { env: { DEBUG: 'surf:*' } } },
  },
  {
    description: 'a settings file with no env map is untouched',
    given: { settings: { permissions: { allow: ['Bash(ls)'] } } },
    expect: { settings: { permissions: { allow: ['Bash(ls)'] } } },
  },
];

describe('asSettingsWithoutCloneEnv', () => {
  given('[case1] a settings file whose env is a map', () => {
    when('[t0] the clone keys are stripped', () => {
      TEST_CASES.map((thisCase) =>
        then(thisCase.description, () => {
          const output = asSettingsWithoutCloneEnv(thisCase.given);
          expect(output).toEqual(thisCase.expect.settings);
        }),
      );
    });
  });

  // claude reads `env` only as a map, so an env in another shape sets no var; it is left as found
  given('[case2] a settings file whose env is not a map', () => {
    when('[t0] the clone keys are stripped', () => {
      [
        { kind: 'string', env: 'not-a-map' },
        { kind: 'array', env: ['RHACHET_CLONE_DEPTH=0'] },
      ].map((thisCase) =>
        then(
          `an env value that is no map (${thisCase.kind}) is left as found`,
          () => {
            const settings: ClaudeCodeSettings = { env: thisCase.env };
            expect(asSettingsWithoutCloneEnv({ settings })).toEqual(settings);
          },
        ),
      );
    });
  });
});
