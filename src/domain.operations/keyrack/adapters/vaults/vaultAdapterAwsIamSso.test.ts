import { given, then, when } from 'test-fns';

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
  beforeEach(() => {
    execMock.mockClear();
    spawnMock.mockClear();
  });

  given('[case1] no exid provided', () => {
    when('[t0] isUnlocked called without exid', () => {
      then('returns true (no profile = unlocked)', async () => {
        const result = await vaultAdapterAwsIamSso.isUnlocked();
        expect(result).toBe(true);
      });

      then('does not call aws cli', async () => {
        await vaultAdapterAwsIamSso.isUnlocked();
        expect(execMock).not.toHaveBeenCalled();
      });
    });

    when('[t1] get called without exid', () => {
      then('returns null', async () => {
        const result = await vaultAdapterAwsIamSso.get({
          slug: 'acme.test.AWS_PROFILE',
        });
        expect(result).toBeNull();
      });
    });

    when('[t2] unlock called without exid', () => {
      then('completes without error', async () => {
        await expect(vaultAdapterAwsIamSso.unlock({})).resolves.toBeUndefined();
      });

      then('does not call aws cli', async () => {
        await vaultAdapterAwsIamSso.unlock({});
        expect(execMock).not.toHaveBeenCalled();
        expect(spawnMock).not.toHaveBeenCalled();
      });
    });

    when('[t3] relock called without exid', () => {
      then('completes without error', async () => {
        await expect(
          vaultAdapterAwsIamSso.relock!({ slug: 'acme.test.AWS_PROFILE' }),
        ).resolves.toBeUndefined();
      });

      then('does not call aws sso logout', async () => {
        await vaultAdapterAwsIamSso.relock!({
          slug: 'acme.test.AWS_PROFILE',
        });
        expect(execMock).not.toHaveBeenCalled();
      });
    });
  });

  given('[case2] exid provided', () => {
    when('[t0] get called with exid', () => {
      then('returns the exid as the profile name', async () => {
        const result = await vaultAdapterAwsIamSso.get({
          slug: 'acme.prod.AWS_PROFILE',
          exid: 'acme-prod',
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
        const result = await vaultAdapterAwsIamSso.isUnlocked({
          exid: 'acme-prod',
        });
        expect(result).toBe(true);
      });

      then('calls aws sts get-caller-identity for the profile', async () => {
        await vaultAdapterAwsIamSso.isUnlocked({ exid: 'acme-prod' });
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
          callback(new Error('SSO session expired'), null);
          return {} as any;
        });
      });

      then('returns false', async () => {
        const result = await vaultAdapterAwsIamSso.isUnlocked({
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
        await vaultAdapterAwsIamSso.unlock({ exid: 'acme-prod' });
        expect(spawnMock).not.toHaveBeenCalled();
      });
    });

    when('[t1] unlock called with expired session', () => {
      beforeEach(() => {
        execMock.mockImplementation((cmd: string, callback: any) => {
          callback(new Error('SSO session expired'), null);
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
          await vaultAdapterAwsIamSso.unlock({ exid: 'acme-prod' });

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
          callback(new Error('SSO session expired'), null);
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
          vaultAdapterAwsIamSso.unlock({ exid: 'acme-prod' }),
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

    when('[t0] set called with secret (profile name)', () => {
      then('completes without error', async () => {
        await expect(
          vaultAdapterAwsIamSso.set({
            slug: 'acme.prod.AWS_PROFILE',
            secret: 'acme-prod',
            env: 'prod',
            org: 'acme',
          }),
        ).resolves.toEqual({ exid: 'acme-prod' });
      });
    });

    when('[t1] set called with exid (profile name via host manifest)', () => {
      then('completes without error', async () => {
        await expect(
          vaultAdapterAwsIamSso.set({
            slug: 'acme.prod.AWS_PROFILE',
            secret: null,
            env: 'prod',
            org: 'acme',
            exid: 'acme-prod',
          }),
        ).resolves.toEqual({ exid: 'acme-prod' });
      });
    });

    when('[t2] set called without secret or exid and not TTY', () => {
      then('throws error', async () => {
        // stdin.isTTY is false in test context
        await expect(
          vaultAdapterAwsIamSso.set({
            slug: 'acme.prod.AWS_PROFILE',
            secret: null,
            env: 'prod',
            org: 'acme',
          }),
        ).rejects.toThrow(
          'aws.iam.sso set requires a profile name (--exid or guided setup)',
        );
      });
    });

    when('[t3] set called with invalid profile (validation fails)', () => {
      beforeEach(() => {
        execMock.mockImplementation((cmd: string, callback: any) => {
          callback(new Error('profile not found'), null);
          return {} as any;
        });
      });

      then('throws error with profile name', async () => {
        await expect(
          vaultAdapterAwsIamSso.set({
            slug: 'acme.prod.AWS_PROFILE',
            secret: 'bogus-profile',
            env: 'prod',
            org: 'acme',
          }),
        ).rejects.toThrow("aws profile 'bogus-profile' is not valid");
      });
    });
  });

  given('[case5] del flow', () => {
    when('[t0] del called', () => {
      then('completes without error (no-op)', async () => {
        await expect(
          vaultAdapterAwsIamSso.del({ slug: 'acme.prod.AWS_PROFILE' }),
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
        await vaultAdapterAwsIamSso.relock!({
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
          callback(new Error('Already logged out'), null);
          return {} as any;
        });
      });

      then('completes without error (logout failure is ok)', async () => {
        await expect(
          vaultAdapterAwsIamSso.relock!({
            slug: 'acme.prod.AWS_PROFILE',
            exid: 'acme-prod',
          }),
        ).resolves.toBeUndefined();
      });
    });
  });
});
