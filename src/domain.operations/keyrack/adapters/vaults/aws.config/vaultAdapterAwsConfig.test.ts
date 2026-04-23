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

// mock fs functions for checkProfileExists
jest.mock('node:fs', () => {
  const originalModule = jest.requireActual('node:fs');
  return {
    ...originalModule,
    existsSync: jest.fn((path: string) => {
      // default: ~/.aws/config exists
      if (path.includes('.aws/config')) return true;
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
      return originalModule.readFileSync(path, enc);
    }),
  };
});

import { exec, spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { vaultAdapterAwsConfig } from './vaultAdapterAwsConfig';

const existsSyncMock = existsSync as jest.MockedFunction<typeof existsSync>;
const readFileSyncMock = readFileSync as jest.MockedFunction<
  typeof readFileSync
>;

const execMock = exec as jest.MockedFunction<typeof exec>;
const spawnMock = spawn as jest.MockedFunction<typeof spawn>;

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
        execMock.mockImplementation((cmd: string, callback: any) => {
          callback(null, { stdout: '{"Account":"123456789012"}', stderr: '' });
          return {} as any;
        });
      });

      then('returns true', async () => {
        const result = await vaultAdapterAwsConfig.isUnlocked({
          exid: 'acme-prod',
        });
        expect(result).toBe(true);
      });

      then('calls aws sts get-caller-identity for the profile', async () => {
        await vaultAdapterAwsConfig.isUnlocked({ exid: 'acme-prod' });
        expect(execMock).toHaveBeenCalledWith(
          expect.stringMatching(
            /aws sts get-caller-identity --profile "acme-prod"/,
          ),
          expect.any(Function),
        );
      });
    });

    when('[t2] isUnlocked with expired sso session', () => {
      beforeEach(() => {
        execMock.mockImplementation((cmd: string, callback: any) => {
          callback(genExecError('SSO session expired'), null);
          return {} as any;
        });
      });

      then('returns false', async () => {
        const result = await vaultAdapterAwsConfig.isUnlocked({
          exid: 'acme-prod',
        });
        expect(result).toBe(false);
      });
    });
  });

  given('[case3] unlock flow with exid', () => {
    when('[t0] unlock called with valid session', () => {
      beforeEach(() => {
        execMock.mockImplementation((cmd: string, callback: any) => {
          callback(null, { stdout: '{}', stderr: '' });
          return {} as any;
        });
      });

      then('does not trigger aws sso login', async () => {
        await vaultAdapterAwsConfig.unlock({
          identity: null,
          exid: 'acme-prod',
        });
        expect(spawnMock).not.toHaveBeenCalled();
      });
    });

    when('[t1] unlock called with expired session', () => {
      beforeEach(() => {
        execMock.mockImplementation((cmd: string, callback: any) => {
          callback(genExecError('SSO session expired'), null);
          return {} as any;
        });

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
          await vaultAdapterAwsConfig.unlock({
            identity: null,
            exid: 'acme-prod',
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
    });

    when('[t2] unlock called but aws sso login fails', () => {
      beforeEach(() => {
        execMock.mockImplementation((cmd: string, callback: any) => {
          callback(genExecError('SSO session expired'), null);
          return {} as any;
        });

        const { EventEmitter } = require('node:events');
        spawnMock.mockImplementation(() => {
          const emitter = new EventEmitter();
          process.nextTick(() => emitter.emit('close', 1));
          return emitter;
        });
      });

      then('throws error', async () => {
        await expect(
          vaultAdapterAwsConfig.unlock({ identity: null, exid: 'acme-prod' }),
        ).rejects.toThrow('aws sso login failed');
      });
    });
  });

  given('[case4] set flow', () => {
    beforeEach(() => {
      execMock.mockImplementation((cmd: string, callback: any) => {
        callback(null, { stdout: '{"Account":"123456789012"}', stderr: '' });
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
        execMock.mockImplementation((cmd: string, callback: any) => {
          callback(null, { stdout: '', stderr: '' });
          return {} as any;
        });
      });

      then('calls aws sso logout with profile', async () => {
        await vaultAdapterAwsConfig.relock!({
          slug: 'acme.prod.AWS_PROFILE',
          exid: 'acme-prod',
        });

        expect(execMock).toHaveBeenCalledWith(
          expect.stringMatching(/aws sso logout --profile "acme-prod"/),
          expect.any(Function),
        );
      });
    });

    when('[t1] relock called but aws sso logout fails', () => {
      beforeEach(() => {
        execMock.mockImplementation((cmd: string, callback: any) => {
          callback(genExecError('Already logged out'), null);
          return {} as any;
        });
      });

      then('completes without error (logout failure is ok)', async () => {
        await expect(
          vaultAdapterAwsConfig.relock!({
            slug: 'acme.prod.AWS_PROFILE',
            exid: 'acme-prod',
          }),
        ).resolves.toBeUndefined();
      });
    });
  });
});
