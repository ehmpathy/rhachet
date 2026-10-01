import { given, then, when } from 'test-fns';

import {
  asBrainCliSpawnEnv,
  BRAIN_CLI_SPINUP_ENV_DEFAULTS,
} from './asBrainCliSpawnEnv';

describe('asBrainCliSpawnEnv', () => {
  given('[case1] a caller env and a brain dir', () => {
    when('[t0] the spawn env is built', () => {
      const env = asBrainCliSpawnEnv({
        env: { PATH: '/usr/bin', CLAUDE_CONFIG_DIR: '/home/h/.claude' },
        brainDir: '/repo/.agent/.actors/actor.via.hash=abc12345/brain/.claude',
      });

      then('CLAUDE_CONFIG_DIR is the brain dir', () => {
        expect(env['CLAUDE_CONFIG_DIR']).toEqual(
          '/repo/.agent/.actors/actor.via.hash=abc12345/brain/.claude',
        );
      });

      then("the caller's other env is kept", () => {
        expect(env['PATH']).toEqual('/usr/bin');
      });

      then('the login store is the shared ~/.claude, via an empty var', () => {
        // '' points claude-code's credential file and its refresh locks at ~/.claude
        expect(env['CLAUDE_SECURESTORAGE_CONFIG_DIR']).toEqual('');
      });
    });
  });

  given('[case5] a caller env that sets the secure-storage dir', () => {
    when('[t0] the spawn env is built', () => {
      const env = asBrainCliSpawnEnv({
        env: {
          PATH: '/usr/bin',
          CLAUDE_SECURESTORAGE_CONFIG_DIR: '/some/other/dir',
        },
        brainDir: '/repo/.agent/.actors/actor.via.hash=abc12345/brain/.claude',
      });

      then('rhachet overrides it, so no clone splits the store', () => {
        expect(env['CLAUDE_SECURESTORAGE_CONFIG_DIR']).toEqual('');
      });
    });
  });

  given('[case2] a caller env from inside a claude session', () => {
    when('[t0] the spawn env is built', () => {
      const env = asBrainCliSpawnEnv({
        env: {
          PATH: '/usr/bin',
          ANTHROPIC_API_KEY: 'sk-test',
          CLAUDECODE: '1',
          CLAUDE_CODE_CHILD_SESSION: '1',
          CLAUDE_CODE_SESSION_ID: 'parent-session',
          CLAUDE_CODE_ENTRYPOINT: 'cli',
          CLAUDE_CODE_SESSION_ATTENDED: '1',
          CLAUDE_CODE_MESSAGING_TOKEN: 'tok',
          CLAUDE_CODE_MESSAGING_SOCKET: '/run/parent.sock',
          CLAUDE_CODE_EXECPATH: '/usr/bin/claude',
          CLAUDE_PID: '4242',
        },
        brainDir: '/repo/.agent/.actors/actor.via.hash=abc12345/brain/.claude',
      });

      then('the CLAUDE_CODE_CHILD_SESSION marker is dropped', () => {
        // inherited, it turns off transcript persistence; say and get go blind
        expect(env).not.toHaveProperty('CLAUDE_CODE_CHILD_SESSION');
      });

      then('every parent-session marker is dropped', () => {
        expect(Object.keys(env).sort()).toEqual(
          [
            'ANTHROPIC_API_KEY',
            'CLAUDE_CONFIG_DIR',
            'CLAUDE_SECURESTORAGE_CONFIG_DIR',
            'PATH',
            ...Object.keys(BRAIN_CLI_SPINUP_ENV_DEFAULTS),
          ].sort(),
        );
      });

      then('the auth and path env are kept', () => {
        expect(env['ANTHROPIC_API_KEY']).toEqual('sk-test');
        expect(env['PATH']).toEqual('/usr/bin');
      });
    });
  });

  given('[case3] a caller env with no spinup keys', () => {
    when('[t0] the spawn env is built', () => {
      const env = asBrainCliSpawnEnv({
        env: { PATH: '/usr/bin' },
        brainDir: '/repo/.agent/.actors/actor.via.hash=abc12345/brain/.claude',
      });

      then('the clone skips connectors and non-essential startup work', () => {
        expect(env).toMatchObject({
          ENABLE_CLAUDEAI_MCP_SERVERS: 'false',
          CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
          DISABLE_AUTOUPDATER: '1',
          DISABLE_TELEMETRY: '1',
          DISABLE_ERROR_REPORTING: '1',
        });
      });
    });
  });

  given('[case4] a caller env that sets a spinup key', () => {
    when('[t0] the spawn env is built', () => {
      const env = asBrainCliSpawnEnv({
        env: { PATH: '/usr/bin', ENABLE_CLAUDEAI_MCP_SERVERS: 'true' },
        brainDir: '/repo/.agent/.actors/actor.via.hash=abc12345/brain/.claude',
      });

      then("the caller's value wins over the default", () => {
        expect(env['ENABLE_CLAUDEAI_MCP_SERVERS']).toEqual('true');
      });

      then('the other defaults still apply', () => {
        expect(env['DISABLE_TELEMETRY']).toEqual('1');
      });
    });
  });
});
