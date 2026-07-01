import { given, then, when } from 'test-fns';

/**
 * unit tests — mocks child_process for adapter logic
 * real aws calls tested in vaultAdapterAwsConfig.integration.test.ts
 */

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

// mock fs functions for checkProfileExists and clearAwsSsoCacheForDomain
jest.mock('node:fs', () => {
  const originalModule = jest.requireActual('node:fs');
  return {
    ...originalModule,
    existsSync: jest.fn((path: string) => {
      // default: ~/.aws/config exists, sso cache dir exists
      if (path.includes('.aws/config')) return true;
      if (path.includes('.aws/sso/cache')) return true;
      return originalModule.existsSync(path);
    }),
    readFileSync: jest.fn((path: string, enc: string) => {
      // default: return config with acme-prod profile
      if (path.includes('.aws/config')) {
        return `[profile acme-prod]
sso_start_url = https://example.awsapps.com/start
sso_region = us-east-1
sso_account_id = 123456789012
sso_role_name = MyRole
region = us-east-1
`;
      }
      // mock cache file content for clearAwsSsoCacheForDomain
      if (path.includes('.aws/sso/cache') && path.endsWith('.json')) {
        return JSON.stringify({
          startUrl: 'https://example.awsapps.com/start',
          expiresAt: '2026-04-30T23:59:59Z',
        });
      }
      return originalModule.readFileSync(path, enc);
    }),
    readdirSync: jest.fn((path: string) => {
      // mock sso cache directory contents
      if (path.includes('.aws/sso/cache')) {
        return ['cached-token.json'];
      }
      return originalModule.readdirSync(path);
    }),
    unlinkSync: jest.fn(),
  };
});

// mock fs/promises for getAwsSsoProfileConfig (used by relock flow)
jest.mock('fs/promises', () => ({
  readFile: jest.fn(async (path: string) => {
    // default: return config with acme-prod profile
    if (path.includes('.aws/config')) {
      return `[profile acme-prod]
sso_start_url = https://example.awsapps.com/start
sso_region = us-east-1
sso_account_id = 123456789012
sso_role_name = MyRole
region = us-east-1
`;
    }
    throw new Error('file not found');
  }),
  writeFile: jest.fn(),
  mkdir: jest.fn(),
}));

// mock getAllAwsSsoCacheEntries for SSO token validation
jest.mock('./getAllAwsSsoCacheEntries', () => ({
  getAllAwsSsoCacheEntries: jest.fn(() => []),
}));

// mock @aws-sdk/credential-provider-sso for SSO validation
const mockFromSSO = jest.fn();
jest.mock('@aws-sdk/credential-provider-sso', () => ({
  fromSSO: jest.fn(() => mockFromSSO),
}));

import { fromSSO } from '@aws-sdk/credential-provider-sso';

import { exec, spawn } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { getAllAwsSsoCacheEntries } from './getAllAwsSsoCacheEntries';
import { vaultAdapterAwsConfig } from './vaultAdapterAwsConfig';

// .note = the outer fromSSO factory mock — cast per the extant execMock/spawnMock pattern
//         so tests can assert the init args (e.g. ignoreCache) it was called with
const fromSSOMock = fromSSO as jest.MockedFunction<typeof fromSSO>;

const existsSyncMock = existsSync as jest.MockedFunction<typeof existsSync>;
const readFileSyncMock = readFileSync as jest.MockedFunction<
  typeof readFileSync
>;
const unlinkSyncMock = unlinkSync as jest.MockedFunction<typeof unlinkSync>;

const execMock = exec as jest.MockedFunction<typeof exec>;
const spawnMock = spawn as jest.MockedFunction<typeof spawn>;
const getAllAwsSsoCacheEntriesMock =
  getAllAwsSsoCacheEntries as jest.MockedFunction<
    typeof getAllAwsSsoCacheEntries
  >;

/**
 * .what = create error with exit code to match child_process.exec behavior
 * .why = exec errors include `code` property for exit code
 */
const genExecError = (
  message: string,
  code: number = 1,
): Error & { code: number } => {
  const error = new Error(message) as Error & { code: number };
  error.code = code;
  return error;
};

describe('vaultAdapterAwsConfig', () => {
  beforeEach(() => {
    execMock.mockClear();
    spawnMock.mockClear();
    unlinkSyncMock.mockClear();
    getAllAwsSsoCacheEntriesMock.mockClear();
    mockFromSSO.mockClear();
    fromSSOMock.mockClear();
    // default: no SSO cache entries (non-SSO profiles or empty cache)
    getAllAwsSsoCacheEntriesMock.mockReturnValue([]);
  });

  /**
   * ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
   * ┃ CRITICAL CONTRACT: aws.config.get returns PROFILE NAME, not credentials      ┃
   * ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
   * ┃                                                                              ┃
   * ┃ .why = user sets `AWS_PROFILE=$(rhx keyrack get --key AWS_PROFILE)`          ┃
   * ┃        AWS SDK loads actual credentials from the profile at runtime          ┃
   * ┃                                                                              ┃
   * ┃ .invariant = key.secret === profile name (e.g., "acme-prod")                 ┃
   * ┃ .invariant = key.secret NEVER contains credentials or JSON                   ┃
   * ┃                                                                              ┃
   * ┃ .note = mech.deliverForGet validates SSO session is active                   ┃
   * ┃ .note = credentials are NOT exposed via keyrack — AWS SDK handles them       ┃
   * ┃                                                                              ┃
   * ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
   */
  given('[case0] CONTRACT: get returns profile name as secret', () => {
    beforeEach(() => {
      // mock aws configure export-credentials output
      // this proves credentials are available (session active) but NOT returned
      execMock.mockImplementation((cmd: string, callback: any) => {
        callback(null, {
          stdout: [
            'AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE',
            'AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
            'AWS_SESSION_TOKEN=FwoGZXIvYXdzEBYaDK...',
            'AWS_CREDENTIAL_EXPIRATION=2026-04-14T12:00:00Z',
          ].join('\n'),
          stderr: '',
        });
        return {} as any;
      });
    });

    when('[t0] get is called with profile name', () => {
      then('secret IS the profile name', async () => {
        const result = await vaultAdapterAwsConfig.get({
          slug: 'acme.prod.AWS_PROFILE',
          exid: 'acme-prod',
        });
        expect(result!.key.secret).toEqual('acme-prod');
      });

      then('secret is NOT credentials', async () => {
        const result = await vaultAdapterAwsConfig.get({
          slug: 'acme.prod.AWS_PROFILE',
          exid: 'acme-prod',
        });
        expect(result!.key.secret).not.toContain('AKIA');
        expect(result!.key.secret).not.toContain('AWS_ACCESS_KEY_ID');
      });

      then('secret is NOT JSON', async () => {
        const result = await vaultAdapterAwsConfig.get({
          slug: 'acme.prod.AWS_PROFILE',
          exid: 'acme-prod',
        });
        expect(result!.key.secret).not.toContain('{');
        expect(result!.key.secret).not.toContain('}');
      });

      then('secret can be used directly as AWS_PROFILE env var', async () => {
        const result = await vaultAdapterAwsConfig.get({
          slug: 'acme.prod.AWS_PROFILE',
          exid: 'acme-prod',
        });
        // simulate: AWS_PROFILE=$(rhx keyrack get --key AWS_PROFILE)
        const awsProfile = result!.key.secret;
        expect(awsProfile).toEqual('acme-prod');
        // AWS SDK loads credentials from this profile at runtime
      });
    });
  });

  given('[case1] no exid provided', () => {
    when('[t0] isUnlocked called without exid', () => {
      then('returns true (no profile = unlocked)', async () => {
        const result = await vaultAdapterAwsConfig.isUnlocked();
        expect(result).toBe(true);
      });

      then('does not call aws cli', async () => {
        await vaultAdapterAwsConfig.isUnlocked();
        expect(execMock).not.toHaveBeenCalled();
      });
    });

    when('[t1] get called without exid', () => {
      then('returns null', async () => {
        const result = await vaultAdapterAwsConfig.get({
          slug: 'acme.test.AWS_PROFILE',
        });
        expect(result).toBeNull();
      });
    });

    when('[t2] unlock called without exid', () => {
      then('completes without error', async () => {
        await expect(
          vaultAdapterAwsConfig.unlock({ identity: null }),
        ).resolves.toBeUndefined();
      });

      then('does not call aws cli', async () => {
        await vaultAdapterAwsConfig.unlock({ identity: null });
        expect(execMock).not.toHaveBeenCalled();
        expect(spawnMock).not.toHaveBeenCalled();
      });
    });

    when('[t3] relock called without exid', () => {
      then('completes without error', async () => {
        await expect(
          vaultAdapterAwsConfig.relock!({ slug: 'acme.test.AWS_PROFILE' }),
        ).resolves.toBeUndefined();
      });

      then('does not call aws sso logout', async () => {
        await vaultAdapterAwsConfig.relock!({
          slug: 'acme.test.AWS_PROFILE',
        });
        expect(execMock).not.toHaveBeenCalled();
      });
    });
  });

  given('[case2] exid provided', () => {
    when('[t0] get called with exid', () => {
      beforeEach(() => {
        // mock aws configure export-credentials output (mech.deliverForGet calls this)
        execMock.mockImplementation((cmd: string, callback: any) => {
          callback(null, {
            stdout: [
              'AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE',
              'AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
              'AWS_SESSION_TOKEN=FwoGZXIvYXdzEBYaDK...',
              'AWS_CREDENTIAL_EXPIRATION=2026-04-14T12:00:00Z',
            ].join('\n'),
            stderr: '',
          });
          return {} as any;
        });
      });

      /**
       * .what = aws.config.get returns profile name as secret
       * .why = key is a reference to a verified-live profile; AWS SDK loads creds at runtime
       *
       * .note = mech.deliverForGet validates session is active (credentials available)
       * .note = credentials are NOT returned — only the profile name reference
       */
      then('returns KeyrackKeyGrant with profile name as secret', async () => {
        const result = await vaultAdapterAwsConfig.get({
          slug: 'acme.prod.AWS_PROFILE',
          exid: 'acme-prod',
        });
        expect(result).not.toBeNull();
        expect(result!.slug).toEqual('acme.prod.AWS_PROFILE');
        expect(result!.source.vault).toEqual('aws.config');
        expect(result!.source.mech).toEqual('EPHEMERAL_VIA_AWS_SSO');

        // secret is profile name — a reference to a verified-live profile
        expect(result!.key.secret).toEqual('acme-prod');
        expect(result!.key.secret).not.toContain('AKIA'); // must NOT contain access key
        expect(result!.key.secret).not.toContain('{'); // must NOT be JSON

        expect(result!.expiresAt).toEqual('2026-04-14T12:00:00Z');
      });
    });

    when('[t0.5] get called with exid and explicit mech', () => {
      beforeEach(() => {
        // mock aws configure export-credentials output (mech.deliverForGet calls this)
        execMock.mockImplementation((cmd: string, callback: any) => {
          callback(null, {
            stdout: [
              'AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE',
              'AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
              'AWS_SESSION_TOKEN=FwoGZXIvYXdzEBYaDK...',
              'AWS_CREDENTIAL_EXPIRATION=2026-04-14T12:00:00Z',
            ].join('\n'),
            stderr: '',
          });
          return {} as any;
        });
      });

      then('returns KeyrackKeyGrant with mech from input', async () => {
        const result = await vaultAdapterAwsConfig.get({
          slug: 'acme.prod.AWS_PROFILE',
          exid: 'acme-prod',
          mech: 'EPHEMERAL_VIA_AWS_SSO',
        });
        expect(result).not.toBeNull();
        expect(result!.source.mech).toEqual('EPHEMERAL_VIA_AWS_SSO');
      });
    });

    when('[t1] isUnlocked with valid sso session', () => {
      beforeEach(() => {
        // mock fromSSO to succeed (validates with AWS SSO servers)
        // .note = fromSSO is the primary validator — cache cannot be trusted
        mockFromSSO.mockResolvedValue({
          accessKeyId: 'AKIA...',
          secretAccessKey: 'secret',
          sessionToken: 'token',
        });
        // mock export-credentials (STS refresh) and sts get-caller-identity (username)
        execMock.mockImplementation((cmd: string, callback: any) => {
          if (cmd.includes('aws configure export-credentials')) {
            callback(null, {
              stdout: [
                'AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE',
                'AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
                'AWS_SESSION_TOKEN=FwoGZXIvYXdzEBYaDK...',
                'AWS_CREDENTIAL_EXPIRATION=2026-04-14T12:00:00Z',
              ].join('\n'),
              stderr: '',
            });
          } else if (cmd.includes('aws sts get-caller-identity')) {
            callback(null, {
              stdout:
                '{"Account":"123456789012","Arn":"arn:aws:sts::123456789012:assumed-role/MyRole/alice@acme.com"}',
              stderr: '',
            });
          }
          return {} as any;
        });
      });

      then('returns true', async () => {
        const result = await vaultAdapterAwsConfig.isUnlocked({
          exid: 'acme-prod',
          meta: { awsSsoUsername: 'alice@acme.com' },
        });
        expect(result).toBe(true);
      });

      then('validates via SDK then extracts username via sts', async () => {
        await vaultAdapterAwsConfig.isUnlocked({
          exid: 'acme-prod',
          meta: { awsSsoUsername: 'alice@acme.com' },
        });
        // first: validate SSO via SDK (source of truth)
        expect(mockFromSSO).toHaveBeenCalled();
        // second: extract username via sts
        expect(execMock).toHaveBeenCalledWith(
          expect.stringContaining('aws sts get-caller-identity'),
          expect.any(Function),
        );
      });

      then(
        'calls fromSSO with ignoreCache to defeat the stale config cache',
        async () => {
          // .why = the @smithy config loader caches ~/.aws/config contents in a
          //        process-lifetime map; a profile written earlier this same run
          //        would otherwise be invisible to fromSSO → "Profile X not found".
          //        ignoreCache forces a fresh disk read so validation sees ground-truth.
          await vaultAdapterAwsConfig.isUnlocked({
            exid: 'acme-prod',
            meta: { awsSsoUsername: 'alice@acme.com' },
          });
          expect(fromSSOMock).toHaveBeenCalledWith({
            profile: 'acme-prod',
            ignoreCache: true,
          });
        },
      );
    });

    when('[t2] isUnlocked with expired sso session', () => {
      beforeEach(() => {
        // mock fromSSO to fail with CredentialsProviderError (SSO expired or revoked)
        // .note = SDK validates with AWS SSO servers — catches remote revocation
        const credentialsError = new Error(
          'The SSO session associated with this profile has expired',
        );
        credentialsError.name = 'CredentialsProviderError';
        mockFromSSO.mockRejectedValue(credentialsError);
      });

      then('returns false', async () => {
        const result = await vaultAdapterAwsConfig.isUnlocked({
          exid: 'acme-prod',
        });
        expect(result).toBe(false);
      });
    });

    when('[t3] isUnlocked with no cached SSO token', () => {
      beforeEach(() => {
        // mock fromSSO to fail — no cached token
        // .note = SDK validates with AWS SSO servers — no cache means no session
        const credentialsError = new Error(
          'The SSO session token was not found or is invalid',
        );
        credentialsError.name = 'CredentialsProviderError';
        mockFromSSO.mockRejectedValue(credentialsError);
      });

      then('returns false', async () => {
        const result = await vaultAdapterAwsConfig.isUnlocked({
          exid: 'acme-prod',
        });
        expect(result).toBe(false);
      });
    });

    when('[t4] isUnlocked with absent awsSsoUsername in meta', () => {
      beforeEach(() => {
        // session is valid but meta.awsSsoUsername is absent
        mockFromSSO.mockResolvedValue({
          accessKeyId: 'AKIA...',
          secretAccessKey: 'secret',
          sessionToken: 'token',
        });
      });

      then('returns false (needs re-set)', async () => {
        const result = await vaultAdapterAwsConfig.isUnlocked({
          exid: 'acme-prod',
          // meta.awsSsoUsername intentionally absent
        });
        expect(result).toBe(false);
      });

      then('does not call validateSsoSession (short-circuit)', async () => {
        await vaultAdapterAwsConfig.isUnlocked({
          exid: 'acme-prod',
        });
        // should not call SDK since we short-circuit on absent meta
        expect(mockFromSSO).not.toHaveBeenCalled();
      });
    });

    when('[t5] isUnlocked with username mismatch', () => {
      beforeEach(() => {
        // valid session but for different user
        mockFromSSO.mockResolvedValue({
          accessKeyId: 'AKIA...',
          secretAccessKey: 'secret',
          sessionToken: 'token',
        });
        execMock.mockImplementation((cmd: string, callback: any) => {
          if (cmd.includes('aws configure export-credentials')) {
            callback(null, {
              stdout: [
                'AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE',
                'AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
                'AWS_SESSION_TOKEN=FwoGZXIvYXdzEBYaDK...',
                'AWS_CREDENTIAL_EXPIRATION=2026-04-14T12:00:00Z',
              ].join('\n'),
              stderr: '',
            });
          } else if (cmd.includes('aws sts get-caller-identity')) {
            // returns bob but we expect alice
            callback(null, {
              stdout:
                '{"Account":"123456789012","Arn":"arn:aws:sts::123456789012:assumed-role/MyRole/bob@acme.com"}',
              stderr: '',
            });
          }
          return {} as any;
        });
      });

      then('returns false (wrong user)', async () => {
        const result = await vaultAdapterAwsConfig.isUnlocked({
          exid: 'acme-prod',
          meta: { awsSsoUsername: 'alice@acme.com' }, // expects alice
        });
        expect(result).toBe(false);
      });
    });
  });

  given('[case3] unlock flow with exid', () => {
    when('[t0] unlock called with valid session', () => {
      beforeEach(() => {
        // mock fromSSO to succeed (validates with AWS SSO servers)
        // .note = fromSSO is the primary validator — cache cannot be trusted
        mockFromSSO.mockResolvedValue({
          accessKeyId: 'AKIA...',
          secretAccessKey: 'secret',
          sessionToken: 'token',
        });
        // mock export-credentials (STS refresh) and sts get-caller-identity (username)
        execMock.mockImplementation((cmd: string, callback: any) => {
          if (cmd.includes('aws configure export-credentials')) {
            callback(null, {
              stdout: [
                'AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE',
                'AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
                'AWS_SESSION_TOKEN=FwoGZXIvYXdzEBYaDK...',
                'AWS_CREDENTIAL_EXPIRATION=2026-04-14T12:00:00Z',
              ].join('\n'),
              stderr: '',
            });
          } else if (cmd.includes('aws sts get-caller-identity')) {
            callback(null, {
              stdout:
                '{"Account":"123456789012","Arn":"arn:aws:sts::123456789012:assumed-role/MyRole/alice@acme.com"}',
              stderr: '',
            });
          }
          return {} as any;
        });
      });

      then('does not trigger aws sso login', async () => {
        await vaultAdapterAwsConfig.unlock({
          identity: null,
          exid: 'acme-prod',
          meta: { awsSsoUsername: 'alice@acme.com' },
        });
        expect(spawnMock).not.toHaveBeenCalled();
      });

      then('outputs valid session reuse message (snapshot)', async () => {
        const consoleLogs: string[] = [];
        const originalLog = console.log;
        console.log = (...args: unknown[]) => consoleLogs.push(args.join(' '));

        try {
          await vaultAdapterAwsConfig.unlock({
            identity: null,
            exid: 'acme-prod',
            meta: { awsSsoUsername: 'alice@acme.com' },
            silent: false,
          });
        } finally {
          console.log = originalLog;
        }

        // wrap with root context for treestruct completeness in snapshot
        // .note = [unit] prefix clarifies this is a unit test of internal adapter, not CLI
        const output =
          '🔓 [unit] vaultAdapterAwsConfig.unlock\n' + consoleLogs.join('\n');
        expect(output).toContain('with sso prior?');
        expect(output).toContain('access confirmed');
        expect(output).toContain('will reuse');
        expect(output).toMatchSnapshot();
      });
    });

    when('[t1] unlock called with expired session', () => {
      beforeEach(() => {
        // track login state — after login succeeds, SSO validation should pass
        let loginCompleted = false;

        // mock fromSSO: reject before login, resolve after login
        // .note = SDK validates with AWS SSO servers — triggers login when expired
        const credentialsError = new Error(
          'The SSO session associated with this profile has expired',
        );
        credentialsError.name = 'CredentialsProviderError';
        mockFromSSO.mockImplementation(() => {
          if (loginCompleted) {
            return Promise.resolve({
              accessKeyId: 'AKIA...',
              secretAccessKey: 'secret',
              sessionToken: 'token',
            });
          }
          return Promise.reject(credentialsError);
        });

        // mock SSO cache with access token (for previewAwsSsoCacheForDomain)
        getAllAwsSsoCacheEntriesMock.mockReturnValue([
          {
            file: 'cached-token.json',
            filePath: '/home/test/.aws/sso/cache/cached-token.json',
            startUrl: 'https://example.awsapps.com/start',
            accessToken: 'expired-access-token',
            region: 'us-east-1',
            expiresAt: '2026-04-30T23:59:59Z',
          },
        ]);

        // mock export-credentials for post-login STS refresh
        const futureExpiration = new Date(
          Date.now() + 30 * 60 * 1000,
        ).toISOString();
        execMock.mockImplementation((cmd: string, callback: any) => {
          if (cmd.includes('aws configure export-credentials')) {
            // called AFTER sso login to force STS refresh
            callback(null, {
              stdout: `AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=secret
AWS_SESSION_TOKEN=token
AWS_CREDENTIAL_EXPIRATION=${futureExpiration}`,
              stderr: '',
            });
          } else if (cmd.includes('aws sts get-caller-identity')) {
            callback(null, {
              stdout:
                '{"Account":"123456789012","Arn":"arn:aws:sts::123456789012:assumed-role/MyRole/alice@acme.com"}',
              stderr: '',
            });
          }
          return {} as any;
        });

        const { EventEmitter } = require('node:events');
        spawnMock.mockImplementation(() => {
          const emitter = new EventEmitter();
          process.nextTick(() => {
            loginCompleted = true; // mark login complete before emitting close
            emitter.emit('close', 0);
          });
          return emitter;
        });
      });

      then(
        'triggers aws sso login with --profile flag (portal flow)',
        async () => {
          await vaultAdapterAwsConfig.unlock({
            identity: null,
            exid: 'acme-prod',
            meta: { awsSsoUsername: 'alice@acme.com' },
          });

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
        },
      );

      then(
        'does not clear cache (only username mismatch triggers clear)',
        async () => {
          await vaultAdapterAwsConfig.unlock({
            identity: null,
            exid: 'acme-prod',
            meta: { awsSsoUsername: 'alice@acme.com' },
            silent: true,
          });

          // expired session → no cache clear needed (just re-login)
          // cache clear only happens on username MISMATCH (valid session, wrong user)
          expect(unlinkSyncMock).not.toHaveBeenCalled();
        },
      );

      then(
        'outputs expired session with conflicted cache message (snapshot)',
        async () => {
          const consoleLogs: string[] = [];
          const originalLog = console.log;
          console.log = (...args: unknown[]) =>
            consoleLogs.push(args.join(' '));

          try {
            await vaultAdapterAwsConfig.unlock({
              identity: null,
              exid: 'acme-prod',
              meta: { awsSsoUsername: 'alice@acme.com' },
              silent: false,
            });
          } finally {
            console.log = originalLog;
          }

          // wrap with root context for treestruct completeness in snapshot
          const output = '🔓 vault.unlock\n' + consoleLogs.join('\n');
          expect(output).toContain('with sso prior?');
          expect(output).toContain('clear, no prior session');
          expect(output).toMatchSnapshot();
        },
      );
    });

    when('[t1.5] unlock called with expired session and no prior cache', () => {
      beforeEach(() => {
        // track login state — after login succeeds, SSO validation should pass
        let loginCompleted = false;

        // mock fromSSO: reject before login, resolve after login
        const credentialsError = new Error(
          'The SSO session associated with this profile has expired',
        );
        credentialsError.name = 'CredentialsProviderError';
        mockFromSSO.mockImplementation(() => {
          if (loginCompleted) {
            return Promise.resolve({
              accessKeyId: 'AKIA...',
              secretAccessKey: 'secret',
              sessionToken: 'token',
            });
          }
          return Promise.reject(credentialsError);
        });

        // no SSO cache entries (empty cache)
        getAllAwsSsoCacheEntriesMock.mockReturnValue([]);

        // mock export-credentials for post-login STS refresh
        const futureExpiration = new Date(
          Date.now() + 30 * 60 * 1000,
        ).toISOString();
        execMock.mockImplementation((cmd: string, callback: any) => {
          if (cmd.includes('aws configure export-credentials')) {
            callback(null, {
              stdout: `AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=secret
AWS_SESSION_TOKEN=token
AWS_CREDENTIAL_EXPIRATION=${futureExpiration}`,
              stderr: '',
            });
          } else if (cmd.includes('aws sts get-caller-identity')) {
            callback(null, {
              stdout:
                '{"Account":"123456789012","Arn":"arn:aws:sts::123456789012:assumed-role/MyRole/alice@acme.com"}',
              stderr: '',
            });
          }
          return {} as any;
        });

        const { EventEmitter } = require('node:events');
        spawnMock.mockImplementation(() => {
          const emitter = new EventEmitter();
          process.nextTick(() => {
            loginCompleted = true; // mark login complete before emitting close
            emitter.emit('close', 0);
          });
          return emitter;
        });
      });

      then('outputs no prior session message (snapshot)', async () => {
        const consoleLogs: string[] = [];
        const originalLog = console.log;
        console.log = (...args: unknown[]) => consoleLogs.push(args.join(' '));

        try {
          await vaultAdapterAwsConfig.unlock({
            identity: null,
            exid: 'acme-prod',
            meta: { awsSsoUsername: 'alice@acme.com' },
            silent: false,
          });
        } finally {
          console.log = originalLog;
        }

        // wrap with root context for treestruct completeness in snapshot
        // .note = [unit] prefix clarifies this is a unit test of internal adapter, not CLI
        const output =
          '🔓 [unit] vaultAdapterAwsConfig.unlock\n' + consoleLogs.join('\n');
        expect(output).toContain('with sso prior?');
        expect(output).toContain('clear, no prior session');
        expect(output).toMatchSnapshot();
      });
    });

    when('[t2] unlock called but aws sso login fails', () => {
      beforeEach(() => {
        // mock fromSSO to fail (triggers login)
        const credentialsError = new Error(
          'The SSO session associated with this profile has expired',
        );
        credentialsError.name = 'CredentialsProviderError';
        mockFromSSO.mockRejectedValue(credentialsError);

        const { EventEmitter } = require('node:events');
        spawnMock.mockImplementation(() => {
          const emitter = new EventEmitter();
          process.nextTick(() => emitter.emit('close', 1));
          return emitter;
        });
      });

      then('throws error', async () => {
        await expect(
          vaultAdapterAwsConfig.unlock({
            identity: null,
            exid: 'acme-prod',
            meta: { awsSsoUsername: 'alice@acme.com' },
          }),
        ).rejects.toThrow('aws sso login failed');
      });
    });

    when('[t3] unlock called with absent awsSsoUsername in meta', () => {
      then('throws ConstraintError (needs re-set)', async () => {
        await expect(
          vaultAdapterAwsConfig.unlock({
            identity: null,
            exid: 'acme-prod',
            // meta.awsSsoUsername intentionally absent
          }),
        ).rejects.toThrow('key lacks awsSsoUsername metadata; re-set the key');
      });

      then('error includes hint for re-set (snapshot)', async () => {
        const consoleLogs: string[] = [];
        const originalLog = console.log;
        console.log = (...args: unknown[]) => consoleLogs.push(args.join(' '));

        try {
          await vaultAdapterAwsConfig.unlock({
            identity: null,
            exid: 'acme-prod',
            silent: false,
            // meta.awsSsoUsername intentionally absent
          });
        } catch {
          // error expected
        } finally {
          console.log = originalLog;
        }

        // wrap with root context for treestruct completeness in snapshot
        // .note = [unit] prefix clarifies this is a unit test of internal adapter, not CLI
        const output =
          '🔓 [unit] vaultAdapterAwsConfig.unlock\n' + consoleLogs.join('\n');
        expect(output).toContain('with sso prior?');
        expect(output).toContain('re-set required');
        expect(output).toMatchSnapshot();
      });
    });

    when(
      '[t4] unlock called with username mismatch (valid session, wrong user)',
      () => {
        beforeEach(() => {
          // track login state — after login, identity switches from bob to alice
          let loginCompleted = false;

          // valid session but for different user
          mockFromSSO.mockResolvedValue({
            accessKeyId: 'AKIA...',
            secretAccessKey: 'secret',
            sessionToken: 'token',
          });

          // returns bob before login, alice after login
          execMock.mockImplementation((cmd: string, callback: any) => {
            if (cmd.includes('aws configure export-credentials')) {
              callback(null, {
                stdout: [
                  'AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE',
                  'AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
                  'AWS_SESSION_TOKEN=FwoGZXIvYXdzEBYaDK...',
                  'AWS_CREDENTIAL_EXPIRATION=2026-04-14T12:00:00Z',
                ].join('\n'),
                stderr: '',
              });
            } else if (cmd.includes('aws sts get-caller-identity')) {
              const username = loginCompleted
                ? 'alice@acme.com'
                : 'bob@acme.com';
              callback(null, {
                stdout: `{"Account":"123456789012","Arn":"arn:aws:sts::123456789012:assumed-role/MyRole/${username}"}`,
                stderr: '',
              });
            }
            return {} as any;
          });

          // mock cache for clear operation
          getAllAwsSsoCacheEntriesMock.mockReturnValue([
            {
              file: 'cached-token.json',
              filePath: '/home/test/.aws/sso/cache/cached-token.json',
              startUrl: 'https://example.awsapps.com/start',
              accessToken: 'valid-access-token',
              region: 'us-east-1',
              expiresAt: '2026-04-30T23:59:59Z',
            },
          ]);

          // mock sso login to succeed after clear
          const { EventEmitter } = require('node:events');
          spawnMock.mockImplementation(() => {
            const emitter = new EventEmitter();
            process.nextTick(() => {
              loginCompleted = true; // mark login complete before emitting close
              emitter.emit('close', 0);
            });
            return emitter;
          });
        });

        then('clears cached session and triggers re-auth', async () => {
          await vaultAdapterAwsConfig.unlock({
            identity: null,
            exid: 'acme-prod',
            meta: { awsSsoUsername: 'alice@acme.com' }, // expects alice, but session is bob
            silent: true,
          });

          // should clear cache (wrong user)
          expect(unlinkSyncMock).toHaveBeenCalled();
          // should trigger fresh sso login
          expect(spawnMock).toHaveBeenCalledTimes(1);
        });

        then('outputs mismatch message with expected vs observed', async () => {
          const consoleLogs: string[] = [];
          const originalLog = console.log;
          console.log = (...args: unknown[]) =>
            consoleLogs.push(args.join(' '));

          try {
            await vaultAdapterAwsConfig.unlock({
              identity: null,
              exid: 'acme-prod',
              meta: { awsSsoUsername: 'alice@acme.com' },
              silent: false, // enable output
            });
          } finally {
            console.log = originalLog;
          }

          // verify mismatch output includes expected/observed usernames
          // wrap with root context for treestruct completeness in snapshot
          const output = '🔓 vault.unlock\n' + consoleLogs.join('\n');
          expect(output).toContain('with sso prior?');
          expect(output).toContain('expected: alice@acme.com');
          expect(output).toContain('observed: bob@acme.com');
          expect(output).toContain('cleared, re-auth triggered');
          expect(output).toMatchSnapshot();
        });
      },
    );
  });

  given('[case4] set flow', () => {
    beforeEach(() => {
      // mock fromSSO to succeed (validates with AWS SSO servers)
      mockFromSSO.mockResolvedValue({
        accessKeyId: 'AKIA...',
        secretAccessKey: 'secret',
        sessionToken: 'token',
      });
      // mock export-credentials and sts get-caller-identity
      execMock.mockImplementation((cmd: string, callback: any) => {
        if (cmd.includes('aws configure export-credentials')) {
          callback(null, {
            stdout: [
              'AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE',
              'AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
              'AWS_SESSION_TOKEN=FwoGZXIvYXdzEBYaDK...',
              'AWS_CREDENTIAL_EXPIRATION=2026-04-14T12:00:00Z',
            ].join('\n'),
            stderr: '',
          });
        } else if (cmd.includes('aws sts get-caller-identity')) {
          callback(null, {
            stdout:
              '{"Account":"123456789012","Arn":"arn:aws:sts::123456789012:assumed-role/MyRole/alice@acme.com"}',
            stderr: '',
          });
        }
        return {} as any;
      });
    });

    when('[t0] set called with exid (profile name)', () => {
      then('completes without error', async () => {
        await expect(
          vaultAdapterAwsConfig.set({
            slug: 'acme.prod.AWS_PROFILE',
            exid: 'acme-prod',
          }),
        ).resolves.toEqual({
          exid: 'acme-prod',
          mech: 'EPHEMERAL_VIA_AWS_SSO',
          meta: { awsSsoUsername: 'alice@acme.com' },
        });
      });
    });

    when('[t1] set called with exid (profile name via host manifest)', () => {
      then('completes without error', async () => {
        await expect(
          vaultAdapterAwsConfig.set({
            slug: 'acme.prod.AWS_PROFILE',
            exid: 'acme-prod',
          }),
        ).resolves.toEqual({
          exid: 'acme-prod',
          mech: 'EPHEMERAL_VIA_AWS_SSO',
          meta: { awsSsoUsername: 'alice@acme.com' },
        });
      });
    });

    when('[t2] set called without exid and not TTY', () => {
      then('throws error', async () => {
        // stdin.isTTY is false in test context
        await expect(
          vaultAdapterAwsConfig.set({
            slug: 'acme.prod.AWS_PROFILE',
          }),
        ).rejects.toThrow(
          'aws.config set requires a profile name (--exid or guided setup)',
        );
      });
    });

    when('[t3] set called with invalid profile (profile not in config)', () => {
      then('throws error with profile name', async () => {
        // note: mock only has acme-prod profile, bogus-profile does not exist
        await expect(
          vaultAdapterAwsConfig.set({
            slug: 'acme.prod.AWS_PROFILE',
            exid: 'bogus-profile',
          }),
        ).rejects.toThrow(
          "aws profile 'bogus-profile' not found in ~/.aws/config",
        );
      });
    });
  });

  given('[case5] del flow', () => {
    when('[t0] del called', () => {
      then('completes without error (no-op)', async () => {
        await expect(
          vaultAdapterAwsConfig.del({ slug: 'acme.prod.AWS_PROFILE' }),
        ).resolves.toBeUndefined();
      });
    });
  });

  given('[case6] relock flow with exid', () => {
    when('[t0] relock called with exid', () => {
      beforeEach(() => {
        // mock SSO cache with entry for target domain
        getAllAwsSsoCacheEntriesMock.mockReturnValue([
          {
            file: 'cached-token.json',
            filePath: '/home/test/.aws/sso/cache/cached-token.json',
            startUrl: 'https://example.awsapps.com/start',
            accessToken: 'valid-access-token',
            region: 'us-east-1',
            expiresAt: '2026-04-30T23:59:59Z',
          },
        ]);
      });

      then('deletes cache files for target domain', async () => {
        await vaultAdapterAwsConfig.relock!({
          slug: 'acme.prod.AWS_PROFILE',
          exid: 'acme-prod',
        });

        // should delete the cached token file for example.awsapps.com/start
        expect(unlinkSyncMock).toHaveBeenCalled();
      });
    });

    when('[t1] relock called without matched cache files', () => {
      beforeEach(() => {
        // mock SSO cache with entry for different domain (no match)
        getAllAwsSsoCacheEntriesMock.mockReturnValue([
          {
            file: 'other-token.json',
            filePath: '/home/test/.aws/sso/cache/other-token.json',
            startUrl: 'https://other-domain.awsapps.com/start',
            accessToken: 'other-token',
            region: 'us-east-1',
            expiresAt: '2026-04-30T23:59:59Z',
          },
        ]);
      });

      then('completes without file deletion', async () => {
        await vaultAdapterAwsConfig.relock!({
          slug: 'acme.prod.AWS_PROFILE',
          exid: 'acme-prod',
        });

        expect(unlinkSyncMock).not.toHaveBeenCalled();
      });
    });
  });
});
