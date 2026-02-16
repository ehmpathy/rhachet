import { execSync } from 'child_process';
import fsSync from 'fs';
import fs from 'fs/promises';
import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';
import path from 'path';
import { given, then, when } from 'test-fns';

import {
  doesAwsProfileExist,
  getAwsSsoProfileConfig,
  initiateAwsSsoAuth,
  isAwsCliInstalled,
  listAwsSsoAccounts,
  listAwsSsoRoles,
  listAwsSsoStartUrls,
  setupAwsSsoProfile,
} from './setupAwsSsoProfile';

// mock child_process
jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));

// mock fs/promises
jest.mock('fs/promises', () => ({
  mkdir: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
  rm: jest.fn(),
}));

// mock fs (sync)
jest.mock('fs', () => ({
  readdirSync: jest.fn(),
  readFileSync: jest.fn(),
}));

// use local .temp directory (gitignored) - set XDG_RUNTIME_DIR for getTempDir()
const testTempDir = path.resolve(__dirname, '.temp', 'setupAwsSsoProfile');
process.env['XDG_RUNTIME_DIR'] = testTempDir;

// mock os.homedir only - getTempDir() reads XDG_RUNTIME_DIR env var
jest.mock('os', () => ({
  ...jest.requireActual('os'),
  homedir: jest.fn(() => '/mock/home'),
}));

const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;
const mockMkdir = fs.mkdir as jest.MockedFunction<typeof fs.mkdir>;
const mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;
const mockWriteFile = fs.writeFile as jest.MockedFunction<typeof fs.writeFile>;
const mockReaddirSync = fsSync.readdirSync as jest.MockedFunction<
  typeof fsSync.readdirSync
>;
const mockReadFileSync = fsSync.readFileSync as jest.MockedFunction<
  typeof fsSync.readFileSync
>;

describe('setupAwsSsoProfile', () => {
  beforeAll(() => {
    // create test temp dir if it doesn't exist (use real fs, not mocked)
    const realFs = jest.requireActual('fs') as typeof import('fs');
    realFs.mkdirSync(testTempDir, { recursive: true });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * isAwsCliInstalled
   */
  describe('isAwsCliInstalled', () => {
    given('[case1] aws cli is installed', () => {
      when('[t0] called', () => {
        then('returns true', () => {
          mockExecSync.mockReturnValueOnce(Buffer.from('aws-cli/2.0.0'));
          const result = isAwsCliInstalled();
          expect(result).toBe(true);
          expect(mockExecSync).toHaveBeenCalledWith('aws --version', {
            stdio: 'pipe',
          });
        });
      });
    });

    given('[case2] aws cli is not installed', () => {
      when('[t0] called', () => {
        then('returns false', () => {
          mockExecSync.mockImplementationOnce(() => {
            throw new Error('command not found');
          });
          const result = isAwsCliInstalled();
          expect(result).toBe(false);
        });
      });
    });
  });

  /**
   * doesAwsProfileExist
   */
  describe('doesAwsProfileExist', () => {
    given('[case1] config file does not exist', () => {
      when('[t0] called', () => {
        then('returns false', async () => {
          mockReadFile.mockRejectedValueOnce(new Error('ENOENT'));
          const result = await doesAwsProfileExist({ profileName: 'any' });
          expect(result).toBe(false);
        });
      });
    });

    given('[case2] config file is empty', () => {
      when('[t0] called', () => {
        then('returns false', async () => {
          mockReadFile.mockResolvedValueOnce('');
          const result = await doesAwsProfileExist({ profileName: 'test' });
          expect(result).toBe(false);
        });
      });
    });

    given('[case3] profile exists as sso profile', () => {
      when('[t0] called', () => {
        then('returns true', async () => {
          mockReadFile.mockResolvedValueOnce(`
[profile ehmpathy.dev]
sso_start_url = https://ehmpathy.awsapps.com/start
sso_region = us-east-1
sso_account_id = 123456789012
sso_role_name = AdminRole
          `);
          const result = await doesAwsProfileExist({
            profileName: 'ehmpathy.dev',
          });
          expect(result).toBe(true);
        });
      });
    });

    given('[case4] profile exists as non-sso profile', () => {
      when('[t0] called', () => {
        then('returns true', async () => {
          mockReadFile.mockResolvedValueOnce(`
[profile iam-user]
aws_access_key_id = AKIA...
aws_secret_access_key = secret
          `);
          const result = await doesAwsProfileExist({ profileName: 'iam-user' });
          expect(result).toBe(true);
        });
      });
    });

    given('[case5] different profile exists', () => {
      when('[t0] called for non-existent profile', () => {
        then('returns false', async () => {
          mockReadFile.mockResolvedValueOnce(`
[profile other-profile]
region = us-west-2
          `);
          const result = await doesAwsProfileExist({ profileName: 'test' });
          expect(result).toBe(false);
        });
      });
    });
  });

  /**
   * getAwsSsoProfileConfig
   */
  describe('getAwsSsoProfileConfig', () => {
    given('[case1] config file does not exist', () => {
      when('[t0] called', () => {
        then('returns null', async () => {
          mockReadFile.mockRejectedValueOnce(new Error('ENOENT'));
          const result = await getAwsSsoProfileConfig({ profileName: 'any' });
          expect(result).toBeNull();
        });
      });
    });

    given('[case2] profile does not exist', () => {
      when('[t0] called', () => {
        then('returns null', async () => {
          mockReadFile.mockResolvedValueOnce(`
[profile other-profile]
region = us-west-2
          `);
          const result = await getAwsSsoProfileConfig({ profileName: 'test' });
          expect(result).toBeNull();
        });
      });
    });

    given('[case3] profile exists but is not sso', () => {
      when('[t0] called', () => {
        then('returns null', async () => {
          mockReadFile.mockResolvedValueOnce(`
[profile iam-user]
aws_access_key_id = AKIA...
aws_secret_access_key = secret
region = us-east-1
          `);
          const result = await getAwsSsoProfileConfig({
            profileName: 'iam-user',
          });
          expect(result).toBeNull();
        });
      });
    });

    given('[case4] profile exists and is sso', () => {
      when('[t0] called', () => {
        then('returns sso config', async () => {
          mockReadFile.mockResolvedValueOnce(`
[profile ehmpathy.dev]
sso_session = ehmpathy.dev
sso_account_id = 123456789012
sso_role_name = AdminRole
region = us-west-2
[sso-session ehmpathy.dev]
sso_start_url = https://ehmpathy.awsapps.com/start
sso_region = us-east-1
sso_registration_scopes = sso:account:access
          `);
          const result = await getAwsSsoProfileConfig({
            profileName: 'ehmpathy.dev',
          });
          expect(result).toEqual({
            ssoStartUrl: 'https://ehmpathy.awsapps.com/start',
            ssoRegion: 'us-east-1',
            ssoAccountId: '123456789012',
            ssoRoleName: 'AdminRole',
            region: 'us-west-2',
          });
        });
      });
    });

    given('[case5] multiple profiles in config', () => {
      when('[t0] called for specific profile', () => {
        then('returns correct profile config', async () => {
          mockReadFile.mockResolvedValueOnce(`
[profile ehmpathy.dev]
sso_session = ehmpathy.dev
sso_account_id = 111111111111
sso_role_name = DevRole
region = us-east-1
[sso-session ehmpathy.dev]
sso_start_url = https://ehmpathy.awsapps.com/start
sso_region = us-east-1
sso_registration_scopes = sso:account:access

[profile ehmpathy.prod]
sso_session = ehmpathy.prod
sso_account_id = 222222222222
sso_role_name = AdminRole
region = us-west-2
[sso-session ehmpathy.prod]
sso_start_url = https://ehmpathy.awsapps.com/start
sso_region = us-east-1
sso_registration_scopes = sso:account:access
          `);
          const result = await getAwsSsoProfileConfig({
            profileName: 'ehmpathy.prod',
          });
          expect(result).toEqual({
            ssoStartUrl: 'https://ehmpathy.awsapps.com/start',
            ssoRegion: 'us-east-1',
            ssoAccountId: '222222222222',
            ssoRoleName: 'AdminRole',
            region: 'us-west-2',
          });
        });
      });
    });

    given('[case6] profile is last in config', () => {
      when('[t0] called', () => {
        then('parses correctly when no subsequent profile', async () => {
          mockReadFile.mockResolvedValueOnce(`
[profile first]
region = us-east-1

[profile ehmpathy.dev]
sso_session = ehmpathy.dev
sso_account_id = 123456789012
sso_role_name = AdminRole
region = us-west-2
[sso-session ehmpathy.dev]
sso_start_url = https://ehmpathy.awsapps.com/start
sso_region = us-east-1
sso_registration_scopes = sso:account:access`);
          const result = await getAwsSsoProfileConfig({
            profileName: 'ehmpathy.dev',
          });
          expect(result).toEqual({
            ssoStartUrl: 'https://ehmpathy.awsapps.com/start',
            ssoRegion: 'us-east-1',
            ssoAccountId: '123456789012',
            ssoRoleName: 'AdminRole',
            region: 'us-west-2',
          });
        });
      });
    });
  });

  /**
   * setupAwsSsoProfile
   */
  describe('setupAwsSsoProfile', () => {
    given('[case1] aws cli not installed', () => {
      when('[t0] setup attempted', () => {
        then('throws BadRequestError', async () => {
          mockExecSync.mockImplementationOnce(() => {
            throw new Error('command not found');
          });

          await expect(
            setupAwsSsoProfile({
              profileName: 'test-profile',
              ssoStartUrl: 'https://acme.awsapps.com/start',
              ssoRegion: 'us-east-1',
              ssoAccountId: '123456789012',
              ssoRoleName: 'AdminRole',
            }),
          ).rejects.toThrow(BadRequestError);
        });

        then('error message mentions aws cli', async () => {
          mockExecSync.mockImplementationOnce(() => {
            throw new Error('command not found');
          });

          await expect(
            setupAwsSsoProfile({
              profileName: 'test-profile',
              ssoStartUrl: 'https://acme.awsapps.com/start',
              ssoRegion: 'us-east-1',
              ssoAccountId: '123456789012',
              ssoRoleName: 'AdminRole',
            }),
          ).rejects.toThrow(/aws cli is required/);
        });
      });
    });

    given('[case2] profile already exists', () => {
      when('[t0] setup attempted', () => {
        then('throws BadRequestError', async () => {
          // aws cli check passes
          mockExecSync.mockReturnValueOnce(Buffer.from('aws-cli/2.0.0'));
          // mkdir succeeds
          mockMkdir.mockResolvedValueOnce(undefined);
          // config file exists with the profile
          mockReadFile.mockResolvedValueOnce(
            '[profile test-profile]\nsso_start_url = https://other.com',
          );

          await expect(
            setupAwsSsoProfile({
              profileName: 'test-profile',
              ssoStartUrl: 'https://acme.awsapps.com/start',
              ssoRegion: 'us-east-1',
              ssoAccountId: '123456789012',
              ssoRoleName: 'AdminRole',
            }),
          ).rejects.toThrow(BadRequestError);
        });

        then('error message mentions profile exists', async () => {
          mockExecSync.mockReturnValueOnce(Buffer.from('aws-cli/2.0.0'));
          mockMkdir.mockResolvedValueOnce(undefined);
          mockReadFile.mockResolvedValueOnce(
            '[profile test-profile]\nsso_start_url = https://other.com',
          );

          await expect(
            setupAwsSsoProfile({
              profileName: 'test-profile',
              ssoStartUrl: 'https://acme.awsapps.com/start',
              ssoRegion: 'us-east-1',
              ssoAccountId: '123456789012',
              ssoRoleName: 'AdminRole',
            }),
          ).rejects.toThrow(/already exists/);
        });
      });
    });

    given('[case3] sso login fails', () => {
      when('[t0] setup attempted', () => {
        then('throws UnexpectedCodePathError', async () => {
          // aws cli check passes
          mockExecSync.mockReturnValueOnce(Buffer.from('aws-cli/2.0.0'));
          // mkdir succeeds
          mockMkdir.mockResolvedValueOnce(undefined);
          // config file doesn't exist
          mockReadFile.mockRejectedValueOnce(new Error('ENOENT'));
          // writeFile succeeds
          mockWriteFile.mockResolvedValueOnce(undefined);
          // sso login fails
          mockExecSync.mockImplementationOnce(() => {
            throw new Error('sso login failed');
          });

          await expect(
            setupAwsSsoProfile({
              profileName: 'test-profile',
              ssoStartUrl: 'https://acme.awsapps.com/start',
              ssoRegion: 'us-east-1',
              ssoAccountId: '123456789012',
              ssoRoleName: 'AdminRole',
            }),
          ).rejects.toThrow(UnexpectedCodePathError);
        });

        then('error message mentions sso login failed', async () => {
          mockExecSync.mockReturnValueOnce(Buffer.from('aws-cli/2.0.0'));
          mockMkdir.mockResolvedValueOnce(undefined);
          mockReadFile.mockRejectedValueOnce(new Error('ENOENT'));
          mockWriteFile.mockResolvedValueOnce(undefined);
          mockExecSync.mockImplementationOnce(() => {
            throw new Error('sso login failed');
          });

          await expect(
            setupAwsSsoProfile({
              profileName: 'test-profile',
              ssoStartUrl: 'https://acme.awsapps.com/start',
              ssoRegion: 'us-east-1',
              ssoAccountId: '123456789012',
              ssoRoleName: 'AdminRole',
            }),
          ).rejects.toThrow(/aws sso login failed/);
        });
      });
    });

    given('[case4] sts get-caller-identity fails', () => {
      when('[t0] setup attempted', () => {
        then('throws UnexpectedCodePathError', async () => {
          // aws cli check passes
          mockExecSync.mockReturnValueOnce(Buffer.from('aws-cli/2.0.0'));
          // mkdir succeeds
          mockMkdir.mockResolvedValueOnce(undefined);
          // config file doesn't exist
          mockReadFile.mockRejectedValueOnce(new Error('ENOENT'));
          // writeFile succeeds
          mockWriteFile.mockResolvedValueOnce(undefined);
          // sso login succeeds
          mockExecSync.mockReturnValueOnce(Buffer.from(''));
          // sts get-caller-identity fails
          mockExecSync.mockImplementationOnce(() => {
            throw new Error('sts failed');
          });

          await expect(
            setupAwsSsoProfile({
              profileName: 'test-profile',
              ssoStartUrl: 'https://acme.awsapps.com/start',
              ssoRegion: 'us-east-1',
              ssoAccountId: '123456789012',
              ssoRoleName: 'AdminRole',
            }),
          ).rejects.toThrow(UnexpectedCodePathError);
        });

        then('error message mentions sts failed', async () => {
          mockExecSync.mockReturnValueOnce(Buffer.from('aws-cli/2.0.0'));
          mockMkdir.mockResolvedValueOnce(undefined);
          mockReadFile.mockRejectedValueOnce(new Error('ENOENT'));
          mockWriteFile.mockResolvedValueOnce(undefined);
          mockExecSync.mockReturnValueOnce(Buffer.from(''));
          mockExecSync.mockImplementationOnce(() => {
            throw new Error('sts failed');
          });

          await expect(
            setupAwsSsoProfile({
              profileName: 'test-profile',
              ssoStartUrl: 'https://acme.awsapps.com/start',
              ssoRegion: 'us-east-1',
              ssoAccountId: '123456789012',
              ssoRoleName: 'AdminRole',
            }),
          ).rejects.toThrow(/get-caller-identity failed/);
        });
      });
    });

    given('[case5] success path with empty config', () => {
      when('[t0] setup attempted', () => {
        then('writes profile to config', async () => {
          mockExecSync.mockReturnValueOnce(Buffer.from('aws-cli/2.0.0'));
          mockMkdir.mockResolvedValueOnce(undefined);
          mockReadFile.mockRejectedValueOnce(new Error('ENOENT'));
          mockWriteFile.mockResolvedValueOnce(undefined);
          mockExecSync.mockReturnValueOnce(Buffer.from('')); // sso login
          mockExecSync.mockReturnValueOnce(Buffer.from('')); // sts

          const result = await setupAwsSsoProfile({
            profileName: 'test-profile',
            ssoStartUrl: 'https://acme.awsapps.com/start',
            ssoRegion: 'us-east-1',
            ssoAccountId: '123456789012',
            ssoRoleName: 'AdminRole',
          });

          expect(result.profileName).toEqual('test-profile');
          expect(result.configPath).toEqual('/mock/home/.aws/config');

          // verify writeFile was called with correct content
          const writeCall = mockWriteFile.mock.calls[0];
          const writtenContent = writeCall?.[1] as string;
          expect(writtenContent).toContain('[profile test-profile]');
          expect(writtenContent).toContain(
            'sso_start_url = https://acme.awsapps.com/start',
          );
          expect(writtenContent).toContain('sso_region = us-east-1');
          expect(writtenContent).toContain('sso_account_id = 123456789012');
          expect(writtenContent).toContain('sso_role_name = AdminRole');
        });
      });
    });

    given('[case6] success path with prior config', () => {
      when('[t0] setup attempted', () => {
        then('appends profile to config', async () => {
          mockExecSync.mockReturnValueOnce(Buffer.from('aws-cli/2.0.0'));
          mockMkdir.mockResolvedValueOnce(undefined);
          mockReadFile.mockResolvedValueOnce(
            '[profile other-profile]\nregion = us-west-2',
          );
          mockWriteFile.mockResolvedValueOnce(undefined);
          mockExecSync.mockReturnValueOnce(Buffer.from('')); // sso login
          mockExecSync.mockReturnValueOnce(Buffer.from('')); // sts

          await setupAwsSsoProfile({
            profileName: 'test-profile',
            ssoStartUrl: 'https://acme.awsapps.com/start',
            ssoRegion: 'us-east-1',
            ssoAccountId: '123456789012',
            ssoRoleName: 'AdminRole',
          });

          // verify prior config is preserved
          const writeCall = mockWriteFile.mock.calls[0];
          const writtenContent = writeCall?.[1] as string;
          expect(writtenContent).toContain('[profile other-profile]');
          expect(writtenContent).toContain('[profile test-profile]');
        });
      });
    });

    given('[case7] custom default region', () => {
      when('[t0] setup with defaultRegion', () => {
        then('uses custom region', async () => {
          mockExecSync.mockReturnValueOnce(Buffer.from('aws-cli/2.0.0'));
          mockMkdir.mockResolvedValueOnce(undefined);
          mockReadFile.mockRejectedValueOnce(new Error('ENOENT'));
          mockWriteFile.mockResolvedValueOnce(undefined);
          mockExecSync.mockReturnValueOnce(Buffer.from('')); // sso login
          mockExecSync.mockReturnValueOnce(Buffer.from('')); // sts

          await setupAwsSsoProfile({
            profileName: 'test-profile',
            ssoStartUrl: 'https://acme.awsapps.com/start',
            ssoRegion: 'us-east-1',
            ssoAccountId: '123456789012',
            ssoRoleName: 'AdminRole',
            defaultRegion: 'eu-west-1',
          });

          const writeCall = mockWriteFile.mock.calls[0];
          const writtenContent = writeCall?.[1] as string;
          expect(writtenContent).toContain('region = eu-west-1');
        });
      });
    });
  });

  /**
   * initiateAwsSsoAuth
   */
  describe('initiateAwsSsoAuth', () => {
    // regex to match temp dir paths (testTempDir is a real path from genTempDir)
    const tempDirPattern = new RegExp(
      `^${testTempDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/keyrack-sso-\\d+$`,
    );
    const tempConfigPattern = new RegExp(
      `^${testTempDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/keyrack-sso-\\d+/config$`,
    );

    given('[case1] temp config is created', () => {
      when('[t0] auth initiated', () => {
        then(
          'creates temp profile in temp dir and triggers login',
          async () => {
            mockMkdir.mockResolvedValueOnce(undefined);
            mockWriteFile.mockResolvedValue(undefined);
            // execSync for sso login succeeds
            mockExecSync.mockReturnValueOnce('');

            await initiateAwsSsoAuth({
              ssoStartUrl: 'https://acme.awsapps.com/start',
              ssoRegion: 'us-east-1',
            });

            // verify temp dir was created in os.tmpdir()
            const mkdirCall = mockMkdir.mock.calls[0];
            expect(mkdirCall?.[0]).toMatch(tempDirPattern);

            // verify temp profile was written with keyrack-auth profile name
            const writeCall = mockWriteFile.mock.calls[0];
            const writtenPath = writeCall?.[0] as string;
            const writtenContent = writeCall?.[1] as string;
            expect(writtenPath).toMatch(tempConfigPattern);
            expect(writtenContent).toContain('[profile keyrack-auth]');
            expect(writtenContent).toContain(
              'sso_start_url = https://acme.awsapps.com/start',
            );
            expect(writtenContent).toContain('sso_region = us-east-1');

            // verify sso login was called with AWS_CONFIG_FILE env var
            const ssoLoginCall = mockExecSync.mock.calls.find(
              (call) =>
                typeof call[0] === 'string' &&
                call[0].includes('aws sso login --profile'),
            );
            expect(ssoLoginCall).toBeDefined();
            expect(ssoLoginCall?.[0]).toContain('--profile "keyrack-auth"');
            expect(ssoLoginCall?.[1]).toMatchObject({
              env: expect.objectContaining({
                AWS_CONFIG_FILE: expect.stringMatching(tempConfigPattern),
              }),
              stdio: ['inherit', 'pipe', 'pipe'],
            });
          },
        );
      });
    });

    given('[case2] sso login succeeds', () => {
      when('[t0] auth initiated', () => {
        then('completes without error', async () => {
          mockMkdir.mockResolvedValueOnce(undefined);
          mockWriteFile.mockResolvedValue(undefined);
          // execSync for sso login succeeds
          mockExecSync.mockReturnValueOnce('');

          // should complete without error
          await expect(
            initiateAwsSsoAuth({
              ssoStartUrl: 'https://acme.awsapps.com/start',
              ssoRegion: 'us-east-1',
            }),
          ).resolves.toBeUndefined();
        });
      });
    });

    given('[case3] sso login fails', () => {
      when('[t0] auth initiated', () => {
        then('rejects with error', async () => {
          mockMkdir.mockResolvedValueOnce(undefined);
          mockWriteFile.mockResolvedValue(undefined);
          // execSync for sso login fails
          mockExecSync.mockImplementationOnce(() => {
            throw new Error('sso login failed');
          });

          await expect(
            initiateAwsSsoAuth({
              ssoStartUrl: 'https://acme.awsapps.com/start',
              ssoRegion: 'us-east-1',
            }),
          ).rejects.toThrow();
        });
      });
    });
  });

  /**
   * listAwsSsoAccounts
   */
  describe('listAwsSsoAccounts', () => {
    given('[case1] sso cache directory not found', () => {
      when('[t0] accounts listed', () => {
        then('throws UnexpectedCodePathError', () => {
          mockReaddirSync.mockImplementationOnce(() => {
            throw new Error('ENOENT');
          });

          expect(() => listAwsSsoAccounts({ ssoRegion: 'us-east-1' })).toThrow(
            UnexpectedCodePathError,
          );
        });

        then('error mentions sso cache', () => {
          mockReaddirSync.mockImplementationOnce(() => {
            throw new Error('ENOENT');
          });

          expect(() => listAwsSsoAccounts({ ssoRegion: 'us-east-1' })).toThrow(
            /could not find sso cache/,
          );
        });
      });
    });

    given('[case2] no valid token in cache', () => {
      when('[t0] all tokens expired', () => {
        then('throws UnexpectedCodePathError', () => {
          mockReaddirSync.mockReturnValueOnce(['token.json'] as any);
          mockReadFileSync.mockReturnValueOnce(
            JSON.stringify({
              accessToken: 'expired-token',
              expiresAt: '2020-01-01T00:00:00Z', // expired
            }),
          );

          expect(() => listAwsSsoAccounts({ ssoRegion: 'us-east-1' })).toThrow(
            UnexpectedCodePathError,
          );
        });

        then('error mentions no valid token', () => {
          mockReaddirSync.mockReturnValueOnce(['token.json'] as any);
          mockReadFileSync.mockReturnValueOnce(
            JSON.stringify({
              accessToken: 'expired-token',
              expiresAt: '2020-01-01T00:00:00Z',
            }),
          );

          expect(() => listAwsSsoAccounts({ ssoRegion: 'us-east-1' })).toThrow(
            /no valid sso access token found/,
          );
        });
      });
    });

    given('[case3] valid token found', () => {
      when('[t0] accounts listed successfully', () => {
        then('returns account list', () => {
          const futureDate = new Date(Date.now() + 3600000).toISOString();
          mockReaddirSync.mockReturnValueOnce(['token.json'] as any);
          mockReadFileSync.mockReturnValueOnce(
            JSON.stringify({
              accessToken: 'valid-token',
              expiresAt: futureDate,
            }),
          );
          mockExecSync.mockReturnValueOnce(
            JSON.stringify({
              accountList: [
                {
                  accountId: '111111111111',
                  accountName: 'dev',
                  emailAddress: 'dev@acme.com',
                },
                {
                  accountId: '222222222222',
                  accountName: 'prod',
                  emailAddress: 'prod@acme.com',
                },
              ],
            }),
          );

          const result = listAwsSsoAccounts({ ssoRegion: 'us-east-1' });

          expect(result).toEqual([
            {
              accountId: '111111111111',
              accountName: 'dev',
              emailAddress: 'dev@acme.com',
            },
            {
              accountId: '222222222222',
              accountName: 'prod',
              emailAddress: 'prod@acme.com',
            },
          ]);
        });
      });
    });

    given('[case4] cache contains non-json files', () => {
      when('[t0] files filtered correctly', () => {
        then('only processes .json files', () => {
          const futureDate = new Date(Date.now() + 3600000).toISOString();
          mockReaddirSync.mockReturnValueOnce([
            'readme.txt',
            'token.json',
          ] as any);
          mockReadFileSync.mockReturnValueOnce(
            JSON.stringify({
              accessToken: 'valid-token',
              expiresAt: futureDate,
            }),
          );
          mockExecSync.mockReturnValueOnce(
            JSON.stringify({
              accountList: [
                {
                  accountId: '111111111111',
                  accountName: 'dev',
                  emailAddress: 'dev@acme.com',
                },
              ],
            }),
          );

          const result = listAwsSsoAccounts({ ssoRegion: 'us-east-1' });
          expect(result).toHaveLength(1);
        });
      });
    });
  });

  /**
   * listAwsSsoRoles
   */
  describe('listAwsSsoRoles', () => {
    given('[case1] sso cache directory not found', () => {
      when('[t0] roles listed', () => {
        then('throws UnexpectedCodePathError', () => {
          mockReaddirSync.mockImplementationOnce(() => {
            throw new Error('ENOENT');
          });

          expect(() =>
            listAwsSsoRoles({ ssoRegion: 'us-east-1', accountId: '123' }),
          ).toThrow(UnexpectedCodePathError);
        });
      });
    });

    given('[case2] no valid token in cache', () => {
      when('[t0] all tokens expired', () => {
        then('throws UnexpectedCodePathError', () => {
          mockReaddirSync.mockReturnValueOnce(['token.json'] as any);
          mockReadFileSync.mockReturnValueOnce(
            JSON.stringify({
              accessToken: 'expired-token',
              expiresAt: '2020-01-01T00:00:00Z',
            }),
          );

          expect(() =>
            listAwsSsoRoles({ ssoRegion: 'us-east-1', accountId: '123' }),
          ).toThrow(/no valid sso access token found/);
        });
      });
    });

    given('[case3] valid token found', () => {
      when('[t0] roles listed successfully', () => {
        then('returns role list', () => {
          const futureDate = new Date(Date.now() + 3600000).toISOString();
          mockReaddirSync.mockReturnValueOnce(['token.json'] as any);
          mockReadFileSync.mockReturnValueOnce(
            JSON.stringify({
              accessToken: 'valid-token',
              expiresAt: futureDate,
            }),
          );
          mockExecSync.mockReturnValueOnce(
            JSON.stringify({
              roleList: [{ roleName: 'AdminRole' }, { roleName: 'ReadOnly' }],
            }),
          );

          const result = listAwsSsoRoles({
            ssoRegion: 'us-east-1',
            accountId: '123456789012',
          });

          expect(result).toEqual([
            { roleName: 'AdminRole' },
            { roleName: 'ReadOnly' },
          ]);
        });

        then('calls aws cli with correct params', () => {
          const futureDate = new Date(Date.now() + 3600000).toISOString();
          mockReaddirSync.mockReturnValueOnce(['token.json'] as any);
          mockReadFileSync.mockReturnValueOnce(
            JSON.stringify({
              accessToken: 'valid-token',
              expiresAt: futureDate,
            }),
          );
          mockExecSync.mockReturnValueOnce(
            JSON.stringify({
              roleList: [{ roleName: 'AdminRole' }],
            }),
          );

          listAwsSsoRoles({
            ssoRegion: 'us-east-1',
            accountId: '123456789012',
          });

          const execCall = mockExecSync.mock.calls[0];
          const command = execCall?.[0] as string;
          expect(command).toContain('--account-id "123456789012"');
          expect(command).toContain('--region "us-east-1"');
        });
      });
    });
  });

  /**
   * listAwsSsoStartUrls
   */
  describe('listAwsSsoStartUrls', () => {
    given('[case1] config file does not exist', () => {
      when('[t0] urls listed', () => {
        then('returns empty array', async () => {
          mockReadFile.mockRejectedValueOnce(new Error('ENOENT'));

          const result = await listAwsSsoStartUrls();
          expect(result).toEqual([]);
        });
      });
    });

    given('[case2] config file is empty', () => {
      when('[t0] urls listed', () => {
        then('returns empty array', async () => {
          mockReadFile.mockResolvedValueOnce('');

          const result = await listAwsSsoStartUrls();
          expect(result).toEqual([]);
        });
      });
    });

    given('[case3] config has one sso profile', () => {
      when('[t0] urls listed', () => {
        then('returns one url', async () => {
          mockReadFile.mockResolvedValueOnce(`
[profile ehmpathy.dev]
sso_session = ehmpathy.dev
sso_account_id = 123456789012
sso_role_name = AdminRole
region = us-east-1
[sso-session ehmpathy.dev]
sso_start_url = https://ehmpathy.awsapps.com/start
sso_region = us-east-1
sso_registration_scopes = sso:account:access
          `);

          const result = await listAwsSsoStartUrls();
          expect(result).toEqual([
            {
              ssoStartUrl: 'https://ehmpathy.awsapps.com/start',
              ssoRegion: 'us-east-1',
            },
          ]);
        });
      });
    });

    given('[case4] config has multiple sso profiles with same url', () => {
      when('[t0] urls listed', () => {
        then('dedupes by url', async () => {
          mockReadFile.mockResolvedValueOnce(`
[profile ehmpathy.dev]
sso_session = ehmpathy
sso_account_id = 123456789012
sso_role_name = AdminRole
region = us-east-1

[profile ehmpathy.prod]
sso_session = ehmpathy
sso_account_id = 999999999999
sso_role_name = ReadOnly
region = us-east-1

[sso-session ehmpathy]
sso_start_url = https://ehmpathy.awsapps.com/start
sso_region = us-east-1
sso_registration_scopes = sso:account:access
          `);

          const result = await listAwsSsoStartUrls();
          expect(result).toHaveLength(1);
          expect(result[0]!.ssoStartUrl).toEqual(
            'https://ehmpathy.awsapps.com/start',
          );
        });
      });
    });

    given(
      '[case5] config has multiple sso profiles with different urls',
      () => {
        when('[t0] urls listed', () => {
          then('returns all unique urls', async () => {
            mockReadFile.mockResolvedValueOnce(`
[profile ehmpathy.dev]
sso_session = ehmpathy
sso_account_id = 123456789012
sso_role_name = AdminRole
region = us-east-1

[profile acme.dev]
sso_session = acme
sso_account_id = 111111111111
sso_role_name = Developer
region = us-west-2

[sso-session ehmpathy]
sso_start_url = https://ehmpathy.awsapps.com/start
sso_region = us-east-1
sso_registration_scopes = sso:account:access

[sso-session acme]
sso_start_url = https://acme.awsapps.com/start
sso_region = us-west-2
sso_registration_scopes = sso:account:access
          `);

            const result = await listAwsSsoStartUrls();
            expect(result).toHaveLength(2);
            expect(result).toContainEqual({
              ssoStartUrl: 'https://ehmpathy.awsapps.com/start',
              ssoRegion: 'us-east-1',
            });
            expect(result).toContainEqual({
              ssoStartUrl: 'https://acme.awsapps.com/start',
              ssoRegion: 'us-west-2',
            });
          });
        });
      },
    );

    given('[case6] config has non-sso profiles mixed in', () => {
      when('[t0] urls listed', () => {
        then('only returns sso profiles', async () => {
          mockReadFile.mockResolvedValueOnce(`
[profile iam-user]
aws_access_key_id = AKIA...
aws_secret_access_key = secret

[profile ehmpathy.dev]
sso_session = ehmpathy.dev
sso_account_id = 123456789012
sso_role_name = AdminRole
region = us-east-1

[profile assume-role]
role_arn = arn:aws:iam::123:role/foo
source_profile = iam-user

[sso-session ehmpathy.dev]
sso_start_url = https://ehmpathy.awsapps.com/start
sso_region = us-east-1
sso_registration_scopes = sso:account:access
          `);

          const result = await listAwsSsoStartUrls();
          expect(result).toHaveLength(1);
          expect(result[0]!.ssoStartUrl).toEqual(
            'https://ehmpathy.awsapps.com/start',
          );
        });
      });
    });
  });
});
