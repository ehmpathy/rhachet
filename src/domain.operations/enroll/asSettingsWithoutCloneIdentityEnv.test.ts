import type { ClaudeCodeSettings } from '@src/_topublish/rhachet-brains-anthropic/src/hooks/config.dao';

import { asSettingsWithoutCloneIdentityEnv } from './asSettingsWithoutCloneIdentityEnv';

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
  {
    description: 'an env value that is no map is left as found',
    given: { settings: { env: 'not-a-map' } },
    expect: { settings: { env: 'not-a-map' } },
  },
];

describe('asSettingsWithoutCloneIdentityEnv', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      const output = asSettingsWithoutCloneIdentityEnv(thisCase.given);
      expect(output).toEqual(thisCase.expect.settings);
    }),
  );
});
