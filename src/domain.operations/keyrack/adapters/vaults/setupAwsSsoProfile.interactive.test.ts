import { execSync, spawn } from 'child_process';
import { EventEmitter } from 'events';
import fs from 'fs';
import fsp from 'fs/promises';
import { given, then, when } from 'test-fns';

import {
  initiateAwsSsoAuth,
  isAwsCliInstalled,
  listAwsSsoAccounts,
  listAwsSsoRoles,
  setupAwsSsoProfile,
} from './setupAwsSsoProfile';

// mock child_process, fs, and os for controlled tests
jest.mock('child_process', () => ({
  execSync: jest.fn(),
  spawn: jest.fn(),
}));

/**
 * .what = creates a mock child process for spawn tests
 * .why = spawn returns an event emitter with stdout/stderr streams
 */
const createMockChildProcess = (input: {
  exitCode: number;
  stdout?: string;
}) => {
  const child = new EventEmitter() as any;
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();

  // emit close event on next tick so event handlers can be attached first
  process.nextTick(() => {
    if (input.stdout) child.stdout.emit('data', Buffer.from(input.stdout));
    child.emit('close', input.exitCode);
  });

  return child;
};

jest.mock('fs/promises', () => ({
  mkdir: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
  access: jest.fn(),
  rm: jest.fn(),
}));

jest.mock('fs', () => ({
  readdirSync: jest.fn(),
  readFileSync: jest.fn(),
}));

jest.mock('os', () => ({
  homedir: jest.fn(() => '/mock/home'),
  tmpdir: jest.fn(() => '/mock/tmp'),
}));

jest.mock('@src/infra/getTempDir', () => ({
  getTempDir: jest.fn(() => '/mock/tmp'),
}));

const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;
const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;
const mockFspMkdir = fsp.mkdir as jest.MockedFunction<typeof fsp.mkdir>;
const mockFspReadFile = fsp.readFile as jest.MockedFunction<
  typeof fsp.readFile
>;
const mockFspWriteFile = fsp.writeFile as jest.MockedFunction<
  typeof fsp.writeFile
>;
const mockFspRm = fsp.rm as jest.MockedFunction<typeof fsp.rm>;
const mockFsReaddirSync = fs.readdirSync as jest.MockedFunction<
  typeof fs.readdirSync
>;
const mockFsReadFileSync = fs.readFileSync as jest.MockedFunction<
  typeof fs.readFileSync
>;

describe('setupAwsSsoProfile interactive journey', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * integration test: full journey from start to finish
   * tests the complete flow a human would experience
   */
  given('[case1] complete aws sso setup journey', () => {
    beforeEach(() => {
      // default: aws cli is installed
      mockExecSync.mockImplementation((cmd) => {
        if (typeof cmd === 'string' && cmd.includes('aws --version')) {
          return Buffer.from('aws-cli/2.15.0');
        }
        throw new Error(`unexpected command: ${cmd}`);
      });
    });

    when('[t0] aws cli check', () => {
      then('detects aws cli is installed', () => {
        const result = isAwsCliInstalled();
        expect(result).toBe(true);
        expect(mockExecSync).toHaveBeenCalledWith('aws --version', {
          stdio: 'pipe',
        });
      });
    });

    when('[t1] aws cli not installed', () => {
      beforeEach(() => {
        mockExecSync.mockImplementation(() => {
          throw new Error('command not found: aws');
        });
      });

      then('detects aws cli is not installed', () => {
        const result = isAwsCliInstalled();
        expect(result).toBe(false);
      });
    });
  });

  /**
   * integration test: browser auth flow via initiateAwsSsoAuth
   */
  given('[case2] browser auth initiation', () => {
    beforeEach(() => {
      // setup: temp directory operations
      mockFspMkdir.mockResolvedValue(undefined);
      mockFspWriteFile.mockResolvedValue(undefined);
      mockFspRm.mockResolvedValue(undefined);
    });

    when('[t0] initiateAwsSsoAuth called', () => {
      beforeEach(() => {
        // mock spawn for aws sso login - succeeds with device code output
        const ssoOutput = [
          'open the following URL:',
          'https://device.sso.us-east-1.amazonaws.com/',
          'enter the code:',
          'ABCD-EFGH',
          'Successfully logged into Start URL: https://test.awsapps.com/start',
        ].join('\n');
        mockSpawn.mockReturnValue(
          createMockChildProcess({ exitCode: 0, stdout: ssoOutput }) as any,
        );
      });

      then('creates temp config in temp dir and triggers login', async () => {
        await initiateAwsSsoAuth({
          ssoStartUrl: 'https://test.awsapps.com/start',
          ssoRegion: 'us-east-1',
        });

        // verify mkdir was called for temp directory (pattern: /mock/tmp/keyrack-sso-*)
        const mkdirCall = mockFspMkdir.mock.calls[0];
        expect(mkdirCall?.[0]).toMatch(/^\/mock\/tmp\/keyrack-sso-\d+$/);
        expect(mkdirCall?.[1]).toEqual({ recursive: true });

        // verify temp profile was written to temp dir
        const writeCall = mockFspWriteFile.mock.calls[0];
        expect(writeCall?.[0]).toMatch(
          /^\/mock\/tmp\/keyrack-sso-\d+\/config$/,
        );
        const writtenContent = writeCall?.[1] as string;
        expect(writtenContent).toContain('[profile keyrack-auth]');
        expect(writtenContent).toContain(
          'sso_start_url = https://test.awsapps.com/start',
        );
        expect(writtenContent).toContain('sso_region = us-east-1');
        // v1 minimal format - no account_id or role_name needed
        expect(writtenContent).not.toContain('sso_account_id');
        expect(writtenContent).not.toContain('sso_role_name');

        // verify spawn was called with --profile flag and AWS_CONFIG_FILE env var
        const spawnCall = mockSpawn.mock.calls[0];
        expect(spawnCall?.[0]).toEqual('aws');
        expect(spawnCall?.[1]).toEqual([
          'sso',
          'login',
          '--profile',
          'keyrack-auth',
        ]);
        expect(spawnCall?.[2]?.env?.AWS_CONFIG_FILE).toMatch(
          /^\/mock\/tmp\/keyrack-sso-\d+\/config$/,
        );

        // verify temp dir was cleaned up via fs.rm
        const rmCall = mockFspRm.mock.calls[0];
        expect(rmCall?.[0]).toMatch(/^\/mock\/tmp\/keyrack-sso-\d+$/);
        expect(rmCall?.[1]).toEqual({ recursive: true, force: true });
      });
    });

    when('[t1] sso login fails', () => {
      beforeEach(() => {
        // mock spawn to exit with non-zero code (simulates user cancel)
        mockSpawn.mockReturnValue(
          createMockChildProcess({ exitCode: 1 }) as any,
        );
      });

      then('still cleans up temp dir', async () => {
        await expect(
          initiateAwsSsoAuth({
            ssoStartUrl: 'https://test.awsapps.com/start',
            ssoRegion: 'us-east-1',
          }),
        ).rejects.toThrow();

        // verify temp dir was cleaned up even after failure
        const rmCall = mockFspRm.mock.calls[0];
        expect(rmCall?.[0]).toMatch(/^\/mock\/tmp\/keyrack-sso-\d+$/);
        expect(rmCall?.[1]).toEqual({ recursive: true, force: true });
      });
    });

    when('[t2] user home config is not touched', () => {
      beforeEach(() => {
        // mock spawn for aws sso login - succeeds
        mockSpawn.mockReturnValue(
          createMockChildProcess({ exitCode: 0 }) as any,
        );
      });

      then('does not read or write to ~/.aws/config', async () => {
        await initiateAwsSsoAuth({
          ssoStartUrl: 'https://test.awsapps.com/start',
          ssoRegion: 'us-east-1',
        });

        // verify no reads from user home
        expect(mockFspReadFile).not.toHaveBeenCalled();

        // verify all writes are to temp dir, not user home
        for (const call of mockFspWriteFile.mock.calls) {
          expect(call[0]).not.toContain('/mock/home');
          expect(call[0]).toMatch(/^\/mock\/tmp\/keyrack-sso-\d+/);
        }
      });
    });
  });

  /**
   * integration test: account enumeration after browser auth
   */
  given('[case3] account enumeration', () => {
    const validToken = {
      accessToken: 'test-access-token-123',
      expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
    };

    const accountsResponse = {
      accountList: [
        {
          accountId: '123456789012',
          accountName: 'Production',
          emailAddress: 'prod@example.com',
        },
        {
          accountId: '987654321098',
          accountName: 'Development',
          emailAddress: 'dev@example.com',
        },
      ],
    };

    when('[t0] valid token in cache', () => {
      beforeEach(() => {
        mockFsReaddirSync.mockReturnValue(['abc123.json'] as any);
        mockFsReadFileSync.mockReturnValue(JSON.stringify(validToken));
        mockExecSync.mockReturnValue(JSON.stringify(accountsResponse));
      });

      then('returns account list', () => {
        const accounts = listAwsSsoAccounts({ ssoRegion: 'us-east-1' });

        expect(accounts).toHaveLength(2);
        expect(accounts[0]).toEqual({
          accountId: '123456789012',
          accountName: 'Production',
          emailAddress: 'prod@example.com',
        });
        expect(accounts[1]).toEqual({
          accountId: '987654321098',
          accountName: 'Development',
          emailAddress: 'dev@example.com',
        });

        // verify aws cli was called correctly
        expect(mockExecSync).toHaveBeenCalledWith(
          'aws sso list-accounts --access-token "test-access-token-123" --region "us-east-1"',
          { encoding: 'utf-8' },
        );
      });
    });

    when('[t1] token expired', () => {
      const expiredToken = {
        accessToken: 'expired-token',
        expiresAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      };

      beforeEach(() => {
        mockFsReaddirSync.mockReturnValue(['expired.json'] as any);
        mockFsReadFileSync.mockReturnValue(JSON.stringify(expiredToken));
      });

      then('throws error about expired token', () => {
        expect(() => listAwsSsoAccounts({ ssoRegion: 'us-east-1' })).toThrow(
          'no valid sso access token found',
        );
      });
    });

    when('[t2] no cache files', () => {
      beforeEach(() => {
        mockFsReaddirSync.mockImplementation(() => {
          throw new Error('ENOENT: no such file or directory');
        });
      });

      then('throws error about cache not found', () => {
        expect(() => listAwsSsoAccounts({ ssoRegion: 'us-east-1' })).toThrow(
          'could not find sso cache',
        );
      });
    });
  });

  /**
   * integration test: role enumeration for selected account
   */
  given('[case4] role enumeration', () => {
    const validToken = {
      accessToken: 'test-access-token-456',
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    };

    const rolesResponse = {
      roleList: [
        { roleName: 'AdministratorAccess' },
        { roleName: 'ReadOnlyAccess' },
        { roleName: 'PowerUserAccess' },
      ],
    };

    when('[t0] valid token in cache', () => {
      beforeEach(() => {
        mockFsReaddirSync.mockReturnValue(['token.json'] as any);
        mockFsReadFileSync.mockReturnValue(JSON.stringify(validToken));
        mockExecSync.mockReturnValue(JSON.stringify(rolesResponse));
      });

      then('returns role list', () => {
        const roles = listAwsSsoRoles({
          ssoRegion: 'us-east-1',
          accountId: '123456789012',
        });

        expect(roles).toHaveLength(3);
        expect(roles[0]).toEqual({ roleName: 'AdministratorAccess' });
        expect(roles[1]).toEqual({ roleName: 'ReadOnlyAccess' });
        expect(roles[2]).toEqual({ roleName: 'PowerUserAccess' });

        // verify aws cli was called correctly
        expect(mockExecSync).toHaveBeenCalledWith(
          'aws sso list-account-roles --access-token "test-access-token-456" --account-id "123456789012" --region "us-east-1"',
          { encoding: 'utf-8' },
        );
      });
    });

    when('[t1] token expired', () => {
      const expiredToken = {
        accessToken: 'expired-token',
        expiresAt: new Date(Date.now() - 3600000).toISOString(),
      };

      beforeEach(() => {
        mockFsReaddirSync.mockReturnValue(['expired.json'] as any);
        mockFsReadFileSync.mockReturnValue(JSON.stringify(expiredToken));
      });

      then('throws error about expired token', () => {
        expect(() =>
          listAwsSsoRoles({
            ssoRegion: 'us-east-1',
            accountId: '123456789012',
          }),
        ).toThrow('no valid sso access token found');
      });
    });
  });

  /**
   * integration test: profile creation and validation
   */
  given('[case5] profile creation', () => {
    beforeEach(() => {
      mockFspMkdir.mockResolvedValue(undefined);
      mockFspReadFile.mockResolvedValue(''); // empty config
      mockFspWriteFile.mockResolvedValue(undefined);
    });

    when('[t0] full profile setup succeeds', () => {
      beforeEach(() => {
        mockExecSync.mockImplementation((cmd) => {
          if (typeof cmd === 'string') {
            if (cmd.includes('aws --version')) {
              return Buffer.from('aws-cli/2.15.0');
            }
            if (cmd.includes('aws sso login')) {
              return Buffer.from('login successful');
            }
            if (cmd.includes('aws sts get-caller-identity')) {
              return Buffer.from(
                JSON.stringify({
                  UserId: 'AIDASAMPLEUSERID',
                  Account: '123456789012',
                  Arn: 'arn:aws:iam::123456789012:user/testuser',
                }),
              );
            }
          }
          throw new Error(`unexpected command: ${cmd}`);
        });
      });

      then('creates profile and validates', async () => {
        const result = await setupAwsSsoProfile({
          profileName: 'test-profile',
          ssoStartUrl: 'https://test.awsapps.com/start',
          ssoRegion: 'us-east-1',
          ssoAccountId: '123456789012',
          ssoRoleName: 'AdministratorAccess',
        });

        expect(result.profileName).toBe('test-profile');
        expect(result.configPath).toBe('/mock/home/.aws/config');

        // verify profile was written with correct content (v2 format - sso-session block)
        const writeCall = mockFspWriteFile.mock.calls.find((call) =>
          (call[1] as string).includes('[profile test-profile]'),
        );
        const writtenContent = writeCall?.[1] as string;
        // profile section with sso_session reference
        expect(writtenContent).toContain('[profile test-profile]');
        expect(writtenContent).toContain('sso_session = test-profile');
        expect(writtenContent).toContain('sso_account_id = 123456789012');
        expect(writtenContent).toContain('sso_role_name = AdministratorAccess');
        expect(writtenContent).toContain('region = us-east-1');
        // v2 format has sso-session block with sso_start_url and sso_region
        expect(writtenContent).toContain('[sso-session test-profile]');
        expect(writtenContent).toContain(
          'sso_start_url = https://test.awsapps.com/start',
        );
        expect(writtenContent).toContain('sso_region = us-east-1');
        expect(writtenContent).toContain(
          'sso_registration_scopes = sso:account:access',
        );

        // verify sso login was triggered with --profile (portal flow)
        expect(mockExecSync).toHaveBeenCalledWith(
          'aws sso login --profile "test-profile"',
          { stdio: 'pipe' },
        );

        // verify sts get-caller-identity was called
        expect(mockExecSync).toHaveBeenCalledWith(
          'aws sts get-caller-identity --profile "test-profile"',
          { stdio: 'pipe' },
        );
      });
    });

    when('[t1] profile already exists', () => {
      beforeEach(() => {
        mockFspReadFile.mockResolvedValue(
          '[profile test-profile]\nregion = us-west-2\n',
        );
        mockExecSync.mockImplementation((cmd) => {
          if (typeof cmd === 'string' && cmd.includes('aws --version')) {
            return Buffer.from('aws-cli/2.15.0');
          }
          throw new Error(`unexpected command: ${cmd}`);
        });
      });

      then('throws BadRequestError', async () => {
        await expect(
          setupAwsSsoProfile({
            profileName: 'test-profile',
            ssoStartUrl: 'https://test.awsapps.com/start',
            ssoRegion: 'us-east-1',
            ssoAccountId: '123456789012',
            ssoRoleName: 'AdministratorAccess',
          }),
        ).rejects.toThrow("profile 'test-profile' already exists");
      });
    });

    when('[t2] sso login fails', () => {
      beforeEach(() => {
        mockExecSync.mockImplementation((cmd) => {
          if (typeof cmd === 'string') {
            if (cmd.includes('aws --version')) {
              return Buffer.from('aws-cli/2.15.0');
            }
            if (cmd.includes('aws sso login')) {
              throw new Error('sso login failed - browser auth required');
            }
          }
          throw new Error(`unexpected command: ${cmd}`);
        });
      });

      then('throws UnexpectedCodePathError', async () => {
        await expect(
          setupAwsSsoProfile({
            profileName: 'new-profile',
            ssoStartUrl: 'https://test.awsapps.com/start',
            ssoRegion: 'us-east-1',
            ssoAccountId: '123456789012',
            ssoRoleName: 'AdministratorAccess',
          }),
        ).rejects.toThrow('aws sso login failed');
      });
    });

    when('[t3] sts get-caller-identity fails', () => {
      beforeEach(() => {
        mockExecSync.mockImplementation((cmd) => {
          if (typeof cmd === 'string') {
            if (cmd.includes('aws --version')) {
              return Buffer.from('aws-cli/2.15.0');
            }
            if (cmd.includes('aws sso login')) {
              return Buffer.from('login successful');
            }
            if (cmd.includes('aws sts get-caller-identity')) {
              throw new Error('ExpiredTokenException');
            }
          }
          throw new Error(`unexpected command: ${cmd}`);
        });
      });

      then('throws UnexpectedCodePathError about validation', async () => {
        await expect(
          setupAwsSsoProfile({
            profileName: 'new-profile',
            ssoStartUrl: 'https://test.awsapps.com/start',
            ssoRegion: 'us-east-1',
            ssoAccountId: '123456789012',
            ssoRoleName: 'AdministratorAccess',
          }),
        ).rejects.toThrow('aws sts get-caller-identity failed');
      });
    });
  });

  /**
   * test: complete journey simulation
   * tests all steps in sequence as a human would experience them
   */
  given('[case6] complete journey simulation', () => {
    const validToken = {
      accessToken: 'journey-token-789',
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    };

    const accountsResponse = {
      accountList: [
        {
          accountId: '111111111111',
          accountName: 'Production',
          emailAddress: 'prod@company.com',
        },
        {
          accountId: '222222222222',
          accountName: 'Preprod',
          emailAddress: 'preprod@company.com',
        },
      ],
    };

    const rolesResponse = {
      roleList: [
        { roleName: 'AdministratorAccess' },
        { roleName: 'DeveloperAccess' },
      ],
    };

    when('[t0] complete flow from cli check to profile validation', () => {
      then('executes all 5 steps in sequence', async () => {
        // fs mocks
        mockFspMkdir.mockResolvedValue(undefined);
        mockFspReadFile.mockResolvedValue('');
        mockFspWriteFile.mockResolvedValue(undefined);
        mockFspRm.mockResolvedValue(undefined);
        mockFsReaddirSync.mockReturnValue(['cache.json'] as any);
        mockFsReadFileSync.mockReturnValue(JSON.stringify(validToken));

        // spawn mock for initiateAwsSsoAuth (step 2)
        mockSpawn.mockReturnValue(
          createMockChildProcess({ exitCode: 0 }) as any,
        );

        // exec mocks - track call order via flags
        let listAccountsCalled = false;
        let listRolesCalled = false;

        mockExecSync.mockImplementation((cmd) => {
          if (typeof cmd !== 'string') throw new Error('cmd must be string');

          // step 1: aws cli version check
          if (cmd.includes('aws --version')) {
            return Buffer.from('aws-cli/2.15.0');
          }

          // step 3: list accounts
          if (cmd.includes('aws sso list-accounts')) {
            listAccountsCalled = true;
            return JSON.stringify(accountsResponse);
          }

          // step 4: list roles (only after accounts)
          if (cmd.includes('aws sso list-account-roles')) {
            if (!listAccountsCalled) {
              throw new Error(
                'list-accounts should be called before list-roles',
              );
            }
            listRolesCalled = true;
            return JSON.stringify(rolesResponse);
          }

          // step 5: sso login for final profile (portal flow with --profile)
          if (cmd.includes('aws sso login --profile "company.prod"')) {
            if (!listRolesCalled) {
              throw new Error(
                'list-roles should be called before final sso login',
              );
            }
            return Buffer.from('final login successful');
          }

          // step 6: validate with sts
          if (
            cmd.includes('aws sts get-caller-identity --profile "company.prod"')
          ) {
            return Buffer.from(
              JSON.stringify({
                UserId: 'AIDASAMPLEUSERID',
                Account: '111111111111',
                Arn: 'arn:aws:iam::111111111111:user/admin',
              }),
            );
          }

          throw new Error(`unexpected command in journey: ${cmd}`);
        });

        // step 1: aws cli is detected
        const installed = isAwsCliInstalled();
        expect(installed).toBe(true);

        // step 2: browser auth is initiated (uses spawn, temp dir, captures output)
        await initiateAwsSsoAuth({
          ssoStartUrl: 'https://company.awsapps.com/start',
          ssoRegion: 'us-east-1',
        });
        const spawnCall = mockSpawn.mock.calls[0];
        expect(spawnCall?.[0]).toEqual('aws');
        expect(spawnCall?.[1]).toEqual([
          'sso',
          'login',
          '--profile',
          'keyrack-auth',
        ]);

        // step 3: accounts are listed
        const accounts = listAwsSsoAccounts({ ssoRegion: 'us-east-1' });
        expect(accounts).toHaveLength(2);
        expect(accounts[0]?.accountName).toBe('Production');
        expect(accounts[1]?.accountName).toBe('Preprod');

        // step 4: roles are listed for selected account
        const roles = listAwsSsoRoles({
          ssoRegion: 'us-east-1',
          accountId: '111111111111',
        });
        expect(roles).toHaveLength(2);
        expect(roles[0]?.roleName).toBe('AdministratorAccess');
        expect(roles[1]?.roleName).toBe('DeveloperAccess');

        // step 5: profile is created and validated
        const result = await setupAwsSsoProfile({
          profileName: 'company.prod',
          ssoStartUrl: 'https://company.awsapps.com/start',
          ssoRegion: 'us-east-1',
          ssoAccountId: '111111111111',
          ssoRoleName: 'AdministratorAccess',
        });

        expect(result.profileName).toBe('company.prod');
        expect(result.configPath).toBe('/mock/home/.aws/config');

        // verify the profile config was written correctly (v2 format - sso-session block)
        const writeCall = mockFspWriteFile.mock.calls.find((call) =>
          (call[1] as string).includes('[profile company.prod]'),
        );
        const writtenContent = writeCall?.[1] as string;
        // profile section with sso_session reference
        expect(writtenContent).toContain('[profile company.prod]');
        expect(writtenContent).toContain('sso_session = company.prod');
        expect(writtenContent).toContain('sso_account_id = 111111111111');
        expect(writtenContent).toContain('sso_role_name = AdministratorAccess');
        expect(writtenContent).toContain('region = us-east-1');
        // v2 format has sso-session block with sso_start_url and sso_region
        expect(writtenContent).toContain('[sso-session company.prod]');
        expect(writtenContent).toContain(
          'sso_start_url = https://company.awsapps.com/start',
        );
        expect(writtenContent).toContain('sso_region = us-east-1');
        expect(writtenContent).toContain(
          'sso_registration_scopes = sso:account:access',
        );
      });
    });
  });

  /**
   * integration test: journey failure points
   * tests each step where the journey can fail
   */
  given('[case7] journey failure points', () => {
    when('[t0] failure at aws cli check', () => {
      beforeEach(() => {
        mockExecSync.mockImplementation(() => {
          throw new Error('command not found: aws');
        });
      });

      then('journey stops at cli check', () => {
        const installed = isAwsCliInstalled();
        expect(installed).toBe(false);
        // human would see: "aws cli is not installed"
      });
    });

    when('[t1] failure at browser auth', () => {
      beforeEach(() => {
        mockFspMkdir.mockResolvedValue(undefined);
        mockFspWriteFile.mockResolvedValue(undefined);
        mockFspRm.mockResolvedValue(undefined);
        // mock spawn to exit with non-zero code (simulates user cancel)
        mockSpawn.mockReturnValue(
          createMockChildProcess({ exitCode: 1 }) as any,
        );
      });

      then('throws error from sso login', async () => {
        await expect(
          initiateAwsSsoAuth({
            ssoStartUrl: 'https://test.awsapps.com/start',
            ssoRegion: 'us-east-1',
          }),
        ).rejects.toThrow();
      });
    });

    when('[t2] failure at account enumeration (no cache)', () => {
      beforeEach(() => {
        mockFsReaddirSync.mockImplementation(() => {
          throw new Error('ENOENT');
        });
      });

      then('throws error about cache', () => {
        expect(() => listAwsSsoAccounts({ ssoRegion: 'us-east-1' })).toThrow(
          'could not find sso cache',
        );
      });
    });

    when('[t3] failure at role enumeration (token expired)', () => {
      const expiredToken = {
        accessToken: 'expired',
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      };

      beforeEach(() => {
        mockFsReaddirSync.mockReturnValue(['cache.json'] as any);
        mockFsReadFileSync.mockReturnValue(JSON.stringify(expiredToken));
      });

      then('throws error about expired token', () => {
        expect(() =>
          listAwsSsoRoles({ ssoRegion: 'us-east-1', accountId: '123' }),
        ).toThrow('no valid sso access token found');
      });
    });

    when('[t4] failure at profile validation (sts fails)', () => {
      beforeEach(() => {
        mockFspReadFile.mockResolvedValue('');
        mockFspMkdir.mockResolvedValue(undefined);
        mockFspWriteFile.mockResolvedValue(undefined);
        mockExecSync.mockImplementation((cmd) => {
          if (typeof cmd === 'string') {
            if (cmd.includes('aws --version')) {
              return Buffer.from('aws-cli/2.15.0');
            }
            if (cmd.includes('aws sso login')) {
              return Buffer.from('ok');
            }
            if (cmd.includes('aws sts get-caller-identity')) {
              throw new Error('ExpiredTokenException: token has expired');
            }
          }
          throw new Error(`unexpected: ${cmd}`);
        });
      });

      then('throws error about validation failure', async () => {
        await expect(
          setupAwsSsoProfile({
            profileName: 'test',
            ssoStartUrl: 'https://test.awsapps.com/start',
            ssoRegion: 'us-east-1',
            ssoAccountId: '123',
            ssoRoleName: 'Admin',
          }),
        ).rejects.toThrow('aws sts get-caller-identity failed');
      });
    });
  });
});
