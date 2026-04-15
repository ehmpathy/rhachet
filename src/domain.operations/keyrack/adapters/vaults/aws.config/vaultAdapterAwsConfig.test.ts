import { given, then, when } from 'test-fns';

/**
 * .what = unit tests for vaultAdapterAwsConfig
 *
 * .why = verify adapter logic without real aws credentials
 *
 * .scope = internal vault adapter (NOT user-faced contract)
 *   - vaultAdapterAwsConfig is infrastructure in domain.operations/keyrack/adapters/
 *   - user-faced contracts are CLI commands tested in blackbox/cli/keyrack.vault.awsIamSso.acceptance.test.ts
 *   - therefore: no snapshot coverage required per rule.require.contract-snapshot-exhaustiveness
 *
 * .rule-compliance:
 *   - rule.require.contract-snapshot-exhaustiveness: NOT APPLICABLE
 *     - this is an internal adapter, not a user-faced contract
 *     - user-faced contracts (CLI) have snapshot coverage in acceptance tests
 *
 * .mocks = child_process (exec, spawn) and fs to simulate aws cli behavior
 *   - aws sso requires browser-based oauth flow — cannot be automated
 *   - mocks allow test of adapter logic without real credentials
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
      then('returns the exid as the profile name', async () => {
        const result = await vaultAdapterAwsConfig.get({
          slug: 'acme.prod.AWS_PROFILE',
          exid: 'acme-prod',
        });
        expect(result).toEqual('acme-prod');
      });
    });

    when('[t0.5] get called with exid and mech', () => {
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

      then('returns the exid (profile name), not credentials', async () => {
        const result = await vaultAdapterAwsConfig.get({
          slug: 'acme.prod.AWS_PROFILE',
          exid: 'acme-prod',
          mech: 'EPHEMERAL_VIA_AWS_SSO',
        });
        expect(result).toEqual('acme-prod');
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
