import { given, then, when } from 'test-fns';

import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { withTempHome } from '../../../../.test/infra/withTempHome';

/**
 * .what = writes a mock aws config file with sso-session
 * .why = tests need sso_session reference for unlock flow
 */
const writeMockAwsConfig = (
  homePath: string,
  config: { profiles: Array<{ name: string; ssoSession: string | null }> },
): void => {
  const awsDir = join(homePath, '.aws');
  mkdirSync(awsDir, { recursive: true });

  // collect unique sso-sessions
  const sessions = new Set<string>();
  for (const profile of config.profiles) {
    if (profile.ssoSession) sessions.add(profile.ssoSession);
  }

  // build config content
  let content = '';

  // write sso-session sections first
  for (const session of sessions) {
    content += `[sso-session ${session}]\n`;
    content += `sso_start_url = https://acme.awsapps.com/start\n`;
    content += `sso_region = us-east-1\n\n`;
  }

  // write profile sections
  for (const profile of config.profiles) {
    content += `[profile ${profile.name}]\n`;
    if (profile.ssoSession) {
      content += `sso_session = ${profile.ssoSession}\n`;
    } else {
      // legacy config (no sso_session)
      content += `sso_start_url = https://acme.awsapps.com/start\n`;
      content += `sso_region = us-east-1\n`;
    }
    content += `sso_account_id = 123456789012\n`;
    content += `sso_role_name = AdminRole\n`;
    content += `region = us-east-1\n\n`;
  }

  writeFileSync(join(awsDir, 'config'), content, 'utf8');
};

// mock child_process.exec and spawn before import
jest.mock('node:child_process', () => {
  const originalModule = jest.requireActual('node:child_process');
  const { EventEmitter } = require('node:events');

  return {
    ...originalModule,
    exec: jest.fn((cmd: string, callback: Function) => {
      // default: commands succeed
      callback(null, { stdout: '{}', stderr: '' });
    }),
    spawn: jest.fn(() => {
      // default: spawn succeeds
      const emitter = new EventEmitter();
      process.nextTick(() => emitter.emit('close', 0));
      return emitter;
    }),
  };
});

import { exec, spawn } from 'node:child_process';
import { vaultAdapterAwsIamSso } from './vaultAdapterAwsIamSso';

const execMock = exec as jest.MockedFunction<typeof exec>;
const spawnMock = spawn as jest.MockedFunction<typeof spawn>;

describe('vaultAdapterAwsIamSso', () => {
  const tempHome = withTempHome({ name: 'vaultAdapterAwsIamSso' });

  beforeAll(() => tempHome.setup());
  afterAll(() => tempHome.teardown());

  beforeEach(() => {
    // clean up store and aws config before each test
    const storePath = join(
      tempHome.path,
      '.rhachet',
      'keyrack.aws-iam-sso.json',
    );
    rmSync(storePath, { force: true });
    rmSync(join(tempHome.path, '.aws'), { force: true, recursive: true });
    // reset mocks
    execMock.mockClear();
    spawnMock.mockClear();
  });

  given('[case1] empty store', () => {
    when('[t0] isUnlocked called', () => {
      then('returns true (no profiles = unlocked)', async () => {
        const result = await vaultAdapterAwsIamSso.isUnlocked();
        expect(result).toBe(true);
      });

      then('does not call aws cli', async () => {
        await vaultAdapterAwsIamSso.isUnlocked();
        expect(execMock).not.toHaveBeenCalled();
      });
    });

    when('[t1] get called for nonexistent slug', () => {
      then('returns null', async () => {
        const result = await vaultAdapterAwsIamSso.get({
          slug: 'acme.test.AWS_PROFILE',
        });
        expect(result).toBeNull();
      });
    });

    when('[t2] set called with new slug', () => {
      then('creates store file', async () => {
        await vaultAdapterAwsIamSso.set({
          slug: 'acme.test.AWS_PROFILE',
          value: 'acme-test',
        });

        const storePath = join(
          tempHome.path,
          '.rhachet',
          'keyrack.aws-iam-sso.json',
        );
        expect(existsSync(storePath)).toBe(true);
      });

      then('stores profile name', async () => {
        await vaultAdapterAwsIamSso.set({
          slug: 'acme.test.AWS_PROFILE',
          value: 'acme-test',
        });

        const result = await vaultAdapterAwsIamSso.get({
          slug: 'acme.test.AWS_PROFILE',
        });
        expect(result).toEqual('acme-test');
      });
    });

    when('[t3] unlock called', () => {
      then('completes without error (no profiles to validate)', async () => {
        await expect(vaultAdapterAwsIamSso.unlock({})).resolves.toBeUndefined();
      });
    });
  });

  given('[case2] store has profiles', () => {
    beforeEach(async () => {
      await vaultAdapterAwsIamSso.set({
        slug: 'acme.prod.AWS_PROFILE',
        value: 'acme-prod',
      });
      await vaultAdapterAwsIamSso.set({
        slug: 'acme.test.AWS_PROFILE',
        value: 'acme-test',
      });
    });

    when('[t0] get called for stored slug', () => {
      then('returns profile name', async () => {
        const result = await vaultAdapterAwsIamSso.get({
          slug: 'acme.prod.AWS_PROFILE',
        });
        expect(result).toEqual('acme-prod');
      });
    });

    when('[t1] set called to update profile', () => {
      then('updates profile name', async () => {
        await vaultAdapterAwsIamSso.set({
          slug: 'acme.prod.AWS_PROFILE',
          value: 'acme-prod-new',
        });

        const result = await vaultAdapterAwsIamSso.get({
          slug: 'acme.prod.AWS_PROFILE',
        });
        expect(result).toEqual('acme-prod-new');
      });

      then('does not affect other profiles', async () => {
        await vaultAdapterAwsIamSso.set({
          slug: 'acme.prod.AWS_PROFILE',
          value: 'acme-prod-new',
        });

        const resultTest = await vaultAdapterAwsIamSso.get({
          slug: 'acme.test.AWS_PROFILE',
        });
        expect(resultTest).toEqual('acme-test');
      });
    });

    when('[t2] del called for stored slug', () => {
      then('removes profile', async () => {
        await vaultAdapterAwsIamSso.del({ slug: 'acme.prod.AWS_PROFILE' });

        const result = await vaultAdapterAwsIamSso.get({
          slug: 'acme.prod.AWS_PROFILE',
        });
        expect(result).toBeNull();
      });

      then('does not affect other profiles', async () => {
        await vaultAdapterAwsIamSso.del({ slug: 'acme.prod.AWS_PROFILE' });

        const resultTest = await vaultAdapterAwsIamSso.get({
          slug: 'acme.test.AWS_PROFILE',
        });
        expect(resultTest).toEqual('acme-test');
      });
    });
  });

  given('[case3] store file format', () => {
    beforeEach(async () => {
      await vaultAdapterAwsIamSso.set({
        slug: 'acme.prod.AWS_PROFILE',
        value: 'acme-prod',
      });
    });

    when('[t0] store file read directly', () => {
      then('has valid json with entry format', async () => {
        const storePath = join(
          tempHome.path,
          '.rhachet',
          'keyrack.aws-iam-sso.json',
        );
        const content = readFileSync(storePath, 'utf8');
        const parsed = JSON.parse(content);

        expect(parsed['acme.prod.AWS_PROFILE']).toMatchObject({
          profileName: 'acme-prod',
        });
        expect(parsed['acme.prod.AWS_PROFILE'].createdAt).toBeDefined();
        expect(parsed['acme.prod.AWS_PROFILE'].updatedAt).toBeDefined();
      });

      then('is formatted with indentation', async () => {
        const storePath = join(
          tempHome.path,
          '.rhachet',
          'keyrack.aws-iam-sso.json',
        );
        const content = readFileSync(storePath, 'utf8');

        // check for newlines (formatted json)
        expect(content).toContain('\n');
      });
    });
  });

  given('[case4] sso session validation', () => {
    beforeEach(async () => {
      await vaultAdapterAwsIamSso.set({
        slug: 'acme.prod.AWS_PROFILE',
        value: 'acme-prod',
      });
      execMock.mockClear();
    });

    when('[t0] isUnlocked called with valid sessions', () => {
      beforeEach(() => {
        // mock successful sts call
        execMock.mockImplementation((cmd: string, callback: any) => {
          callback(null, { stdout: '{"Account":"123456789012"}', stderr: '' });
          return {} as any;
        });
      });

      then('returns true', async () => {
        const result = await vaultAdapterAwsIamSso.isUnlocked();
        expect(result).toBe(true);
      });

      then('calls aws sts get-caller-identity for each profile', async () => {
        await vaultAdapterAwsIamSso.isUnlocked();
        expect(execMock).toHaveBeenCalledWith(
          expect.stringMatching(
            /aws sts get-caller-identity --profile "acme-prod"/,
          ),
          expect.any(Function),
        );
      });
    });

    when('[t1] isUnlocked called with expired session', () => {
      beforeEach(() => {
        // mock failed sts call
        execMock.mockImplementation((cmd: string, callback: any) => {
          callback(new Error('SSO session expired'), null);
          return {} as any;
        });
      });

      then('returns false', async () => {
        const result = await vaultAdapterAwsIamSso.isUnlocked();
        expect(result).toBe(false);
      });
    });
  });

  given('[case5] sso unlock flow with sso-session config', () => {
    beforeEach(async () => {
      // write aws config with sso-session reference
      writeMockAwsConfig(tempHome.path, {
        profiles: [{ name: 'acme-prod', ssoSession: 'acme-sso' }],
      });
      await vaultAdapterAwsIamSso.set({
        slug: 'acme.prod.AWS_PROFILE',
        value: 'acme-prod',
      });
      execMock.mockClear();
      spawnMock.mockClear();
    });

    when('[t0] unlock called with valid sessions', () => {
      beforeEach(() => {
        // mock successful sts call
        execMock.mockImplementation((cmd: string, callback: any) => {
          callback(null, { stdout: '{"Account":"123456789012"}', stderr: '' });
          return {} as any;
        });
      });

      then('does not trigger aws sso login', async () => {
        await vaultAdapterAwsIamSso.unlock({});

        // spawn is used for sso login, should not be called
        expect(spawnMock).not.toHaveBeenCalled();
      });
    });

    when('[t1] unlock called with expired session', () => {
      beforeEach(() => {
        // sts call fails (session expired)
        execMock.mockImplementation((cmd: string, callback: any) => {
          callback(new Error('SSO session expired'), null);
          return {} as any;
        });

        // spawn for sso login succeeds
        const { EventEmitter } = require('node:events');
        spawnMock.mockImplementation(() => {
          const emitter = new EventEmitter();
          process.nextTick(() => emitter.emit('close', 0));
          return emitter;
        });
      });

      then(
        'triggers aws sso login with --profile flag (portal flow)',
        async () => {
          await vaultAdapterAwsIamSso.unlock({});

          expect(spawnMock).toHaveBeenCalledTimes(1);
          const [cmd, args] = spawnMock.mock.calls[0] as [
            string,
            string[],
            unknown,
          ];
          expect(cmd).toEqual('aws');
          expect(args).toContain('sso');
          expect(args).toContain('login');
          expect(args).toContain('--profile');
          expect(args).toContain('acme-prod');
          // must NOT use --sso-session or --use-device-code
          expect(args).not.toContain('--sso-session');
          expect(args).not.toContain('--use-device-code');
        },
      );
    });

    when('[t2] unlock called but aws sso login fails', () => {
      beforeEach(() => {
        // sts call fails (session expired)
        execMock.mockImplementation((cmd: string, callback: any) => {
          callback(new Error('SSO session expired'), null);
          return {} as any;
        });

        // spawn for sso login fails
        const { EventEmitter } = require('node:events');
        spawnMock.mockImplementation(() => {
          const emitter = new EventEmitter();
          process.nextTick(() => emitter.emit('close', 1)); // non-zero exit
          return emitter;
        });
      });

      then('throws error', async () => {
        await expect(vaultAdapterAwsIamSso.unlock({})).rejects.toThrow(
          'aws sso login failed',
        );
      });
    });
  });

  given('[case5b] sso unlock flow with legacy config (no sso-session)', () => {
    beforeEach(async () => {
      // write aws config WITHOUT sso-session reference (legacy config)
      writeMockAwsConfig(tempHome.path, {
        profiles: [{ name: 'acme-legacy', ssoSession: null }],
      });
      await vaultAdapterAwsIamSso.set({
        slug: 'acme.prod.AWS_PROFILE',
        value: 'acme-legacy',
      });
      execMock.mockClear();
      spawnMock.mockClear();
    });

    when('[t0] unlock called with expired session', () => {
      beforeEach(() => {
        // sts call fails (session expired)
        execMock.mockImplementation((cmd: string, callback: any) => {
          callback(new Error('SSO session expired'), null);
          return {} as any;
        });

        // spawn for sso login succeeds
        const { EventEmitter } = require('node:events');
        spawnMock.mockImplementation(() => {
          const emitter = new EventEmitter();
          process.nextTick(() => emitter.emit('close', 0));
          return emitter;
        });
      });

      then(
        'triggers login with --profile (works with any config format)',
        async () => {
          await vaultAdapterAwsIamSso.unlock({});

          // portal flow works with legacy config too
          expect(spawnMock).toHaveBeenCalledTimes(1);
          const [cmd, args] = spawnMock.mock.calls[0] as [
            string,
            string[],
            unknown,
          ];
          expect(cmd).toEqual('aws');
          expect(args).toContain('--profile');
          expect(args).toContain('acme-legacy');
        },
      );
    });
  });

  given('[case6] multiple profiles validation', () => {
    beforeEach(async () => {
      // write aws config with sso-session references for both profiles
      writeMockAwsConfig(tempHome.path, {
        profiles: [
          { name: 'acme-prod', ssoSession: 'acme-sso' },
          { name: 'acme-test', ssoSession: 'acme-sso' }, // same sso-session
        ],
      });
      await vaultAdapterAwsIamSso.set({
        slug: 'acme.prod.AWS_PROFILE',
        value: 'acme-prod',
      });
      await vaultAdapterAwsIamSso.set({
        slug: 'acme.test.AWS_PROFILE',
        value: 'acme-test',
      });
      execMock.mockClear();
      spawnMock.mockClear();
    });

    when('[t0] isUnlocked with one valid one expired', () => {
      beforeEach(() => {
        execMock.mockImplementation((cmd: string, callback: any) => {
          // first profile valid, second expired
          if (cmd.includes('acme-prod')) {
            callback(null, { stdout: '{}', stderr: '' });
          } else {
            callback(new Error('expired'), null);
          }
          return {} as any;
        });
      });

      then('returns false', async () => {
        const result = await vaultAdapterAwsIamSso.isUnlocked();
        expect(result).toBe(false);
      });
    });

    when('[t1] unlock with one valid one expired', () => {
      beforeEach(() => {
        // sts for acme-prod succeeds, sts for acme-test fails
        execMock.mockImplementation((cmd: string, callback: any) => {
          if (cmd.includes('sts') && cmd.includes('acme-prod')) {
            callback(null, { stdout: '{}', stderr: '' });
          } else if (cmd.includes('sts') && cmd.includes('acme-test')) {
            callback(new Error('expired'), null);
          }
          return {} as any;
        });

        // spawn for sso login succeeds
        const { EventEmitter } = require('node:events');
        spawnMock.mockImplementation(() => {
          const emitter = new EventEmitter();
          process.nextTick(() => emitter.emit('close', 0));
          return emitter;
        });
      });

      then(
        'triggers login for expired profile with --profile flag',
        async () => {
          await vaultAdapterAwsIamSso.unlock({});

          // should spawn for acme-test profile (the expired one)
          expect(spawnMock).toHaveBeenCalledTimes(1);
          const [cmd, args] = spawnMock.mock.calls[0] as [
            string,
            string[],
            unknown,
          ];
          expect(cmd).toEqual('aws');
          expect(args).toContain('--profile');
          expect(args).toContain('acme-test');
          // must NOT use --sso-session or --use-device-code
          expect(args).not.toContain('--sso-session');
          expect(args).not.toContain('--use-device-code');
        },
      );
    });

    when('[t2] unlock with two profiles same sso-session both expired', () => {
      beforeEach(() => {
        // both profiles fail sts
        execMock.mockImplementation((cmd: string, callback: any) => {
          callback(new Error('expired'), null);
          return {} as any;
        });

        // spawn for sso login succeeds
        const { EventEmitter } = require('node:events');
        spawnMock.mockImplementation(() => {
          const emitter = new EventEmitter();
          process.nextTick(() => emitter.emit('close', 0));
          return emitter;
        });
      });

      then('triggers login for each expired profile', async () => {
        await vaultAdapterAwsIamSso.unlock({});

        // should spawn for each profile (2 profiles, 2 logins)
        // note: in practice, aws cli caches the session after first login
        // so second login is fast, but we still call it per profile
        expect(spawnMock).toHaveBeenCalledTimes(2);

        // check first call is for acme-prod
        const [cmd1, args1] = spawnMock.mock.calls[0] as [
          string,
          string[],
          unknown,
        ];
        expect(args1).toContain('--profile');
        expect(args1).toContain('acme-prod');

        // check second call is for acme-test
        const [cmd2, args2] = spawnMock.mock.calls[1] as [
          string,
          string[],
          unknown,
        ];
        expect(args2).toContain('--profile');
        expect(args2).toContain('acme-test');
      });
    });
  });

  given('[case7] relock flow', () => {
    when('[t0] relock called for nonexistent slug', () => {
      beforeEach(() => {
        execMock.mockClear();
      });

      then('completes without error', async () => {
        await expect(
          vaultAdapterAwsIamSso.relock!({
            slug: 'acme.nonexistent.AWS_PROFILE',
          }),
        ).resolves.toBeUndefined();
      });

      then('does not call aws sso logout', async () => {
        await vaultAdapterAwsIamSso.relock!({
          slug: 'acme.nonexistent.AWS_PROFILE',
        });
        expect(execMock).not.toHaveBeenCalled();
      });
    });

    when('[t1] relock called for stored slug', () => {
      beforeEach(async () => {
        await vaultAdapterAwsIamSso.set({
          slug: 'acme.prod.AWS_PROFILE',
          value: 'acme-prod',
        });
        execMock.mockClear();
        execMock.mockImplementation((cmd: string, callback: any) => {
          callback(null, { stdout: '', stderr: '' });
          return {} as any;
        });
      });

      then('calls aws sso logout with profile', async () => {
        await vaultAdapterAwsIamSso.relock!({ slug: 'acme.prod.AWS_PROFILE' });

        expect(execMock).toHaveBeenCalledWith(
          expect.stringMatching(/aws sso logout --profile "acme-prod"/),
          expect.any(Function),
        );
      });

      then('does not remove profile from store', async () => {
        await vaultAdapterAwsIamSso.relock!({ slug: 'acme.prod.AWS_PROFILE' });

        // profile should still exist
        const result = await vaultAdapterAwsIamSso.get({
          slug: 'acme.prod.AWS_PROFILE',
        });
        expect(result).toEqual('acme-prod');
      });
    });

    when('[t2] relock called but aws sso logout fails', () => {
      beforeEach(async () => {
        await vaultAdapterAwsIamSso.set({
          slug: 'acme.prod.AWS_PROFILE',
          value: 'acme-prod',
        });
        execMock.mockClear();
        execMock.mockImplementation((cmd: string, callback: any) => {
          callback(new Error('Already logged out'), null);
          return {} as any;
        });
      });

      then('completes without error (logout failure is ok)', async () => {
        await expect(
          vaultAdapterAwsIamSso.relock!({ slug: 'acme.prod.AWS_PROFILE' }),
        ).resolves.toBeUndefined();
      });
    });
  });
});
