import { given, then, when } from 'test-fns';

import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { withTempHome } from '../../../../.test/infra/withTempHome';

// mock child_process.exec before import
jest.mock('node:child_process', () => {
  const originalModule = jest.requireActual('node:child_process');
  return {
    ...originalModule,
    exec: jest.fn((cmd: string, callback: Function) => {
      // default: commands succeed
      callback(null, { stdout: '{}', stderr: '' });
    }),
  };
});

import { exec } from 'node:child_process';
import { vaultAdapterAwsIamSso } from './vaultAdapterAwsIamSso';

const execMock = exec as jest.MockedFunction<typeof exec>;

describe('vaultAdapterAwsIamSso', () => {
  const tempHome = withTempHome({ name: 'vaultAdapterAwsIamSso' });

  beforeAll(() => tempHome.setup());
  afterAll(() => tempHome.teardown());

  beforeEach(() => {
    // clean up store before each test
    const storePath = join(
      tempHome.path,
      '.rhachet',
      'keyrack.aws-iam-sso.json',
    );
    rmSync(storePath, { force: true });
    // reset mock
    execMock.mockClear();
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

  given('[case5] sso unlock flow', () => {
    beforeEach(async () => {
      await vaultAdapterAwsIamSso.set({
        slug: 'acme.prod.AWS_PROFILE',
        value: 'acme-prod',
      });
      execMock.mockClear();
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

        const loginCalls = execMock.mock.calls.filter(
          ([cmd]) => typeof cmd === 'string' && cmd.includes('aws sso login'),
        );
        expect(loginCalls).toHaveLength(0);
      });
    });

    when('[t1] unlock called with expired session', () => {
      let callCount = 0;

      beforeEach(() => {
        callCount = 0;
        execMock.mockImplementation((cmd: string, callback: any) => {
          callCount++;
          // first call (sts) fails, second call (sso login) succeeds
          if (cmd.includes('sts get-caller-identity')) {
            callback(new Error('SSO session expired'), null);
          } else if (cmd.includes('sso login')) {
            callback(null, { stdout: '', stderr: '' });
          }
          return {} as any;
        });
      });

      then('triggers aws sso login', async () => {
        await vaultAdapterAwsIamSso.unlock({});

        const loginCalls = execMock.mock.calls.filter(
          ([cmd]) => typeof cmd === 'string' && cmd.includes('aws sso login'),
        );
        expect(loginCalls).toHaveLength(1);
        const loginCall = loginCalls[0];
        expect(loginCall).toBeDefined();
        expect(loginCall![0]).toContain('--profile "acme-prod"');
      });
    });

    when('[t2] unlock called but aws sso login fails', () => {
      beforeEach(() => {
        execMock.mockImplementation((cmd: string, callback: any) => {
          // all calls fail
          callback(new Error('aws command failed'), null);
          return {} as any;
        });
      });

      then('throws error', async () => {
        await expect(vaultAdapterAwsIamSso.unlock({})).rejects.toThrow(
          'aws sso login failed',
        );
      });
    });
  });

  given('[case6] multiple profiles validation', () => {
    beforeEach(async () => {
      await vaultAdapterAwsIamSso.set({
        slug: 'acme.prod.AWS_PROFILE',
        value: 'acme-prod',
      });
      await vaultAdapterAwsIamSso.set({
        slug: 'acme.test.AWS_PROFILE',
        value: 'acme-test',
      });
      execMock.mockClear();
    });

    when('[t0] isUnlocked with one valid one expired', () => {
      let callCount = 0;

      beforeEach(() => {
        callCount = 0;
        execMock.mockImplementation((cmd: string, callback: any) => {
          callCount++;
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
        execMock.mockImplementation((cmd: string, callback: any) => {
          // sts for acme-prod succeeds, sts for acme-test fails, login succeeds
          if (cmd.includes('sts') && cmd.includes('acme-prod')) {
            callback(null, { stdout: '{}', stderr: '' });
          } else if (cmd.includes('sts') && cmd.includes('acme-test')) {
            callback(new Error('expired'), null);
          } else if (cmd.includes('sso login')) {
            callback(null, { stdout: '', stderr: '' });
          }
          return {} as any;
        });
      });

      then('only triggers login for expired profile', async () => {
        await vaultAdapterAwsIamSso.unlock({});

        const loginCalls = execMock.mock.calls.filter(
          ([cmd]) => typeof cmd === 'string' && cmd.includes('aws sso login'),
        );
        expect(loginCalls).toHaveLength(1);
        const loginCall = loginCalls[0];
        expect(loginCall).toBeDefined();
        expect(loginCall![0]).toContain('acme-test');
        expect(loginCall![0]).not.toContain('acme-prod');
      });
    });
  });
});
