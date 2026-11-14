import { given, then, useThen, when } from 'test-fns';

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
    // .note = the callback is the last arg; the export op passes an options arg before it
    exec: jest.fn((cmd: string, ...rest: any[]) => {
      const callback = rest[rest.length - 1];
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

/**
 * .mock = genAwsProfileExport, as a disk-free stub: it runs the mocked `exec` export and parses
 *   its lines, with no cache file and no disk mutex
 * .why = a unit test crosses no disk boundary; the adapter's contract with the op is which
 *   profile it asks for, with which `refresh`, and what it does with the result or the fault
 * .real = genAwsProfileExport.integration.test.ts (the cache and the mutex, a fake aws on PATH),
 *   genAwsProfileExport.awscli.integration.test.ts (the real aws cli), and
 *   keyrack.vault.awsIamSso.acceptance.test.ts [case20] [case21] (unlocks share one export)
 */
jest.mock('../../mechanisms/aws.sso/genAwsProfileExport', () => {
  const { MalfunctionError } = jest.requireActual('helpful-errors');
  const { asAwsExecFailureText } = jest.requireActual(
    '../../mechanisms/aws.sso/asAwsExecFailureText',
  );
  const genAwsProfileExportStub = (input: {
    profile: string;
    refresh: boolean;
  }) =>
    new Promise((settle, fail) => {
      const { exec } = require('node:child_process');
      exec(
        `exec aws configure export-credentials --profile '${input.profile}' --format env-no-export`,
        {},
        (error: unknown, result: { stdout: string }) => {
          if (error)
            return fail(
              new MalfunctionError('aws configure export-credentials failed', {
                profile: input.profile,
                cliError: asAwsExecFailureText({ error }),
              }),
            );
          const credentials: Record<string, string> = Object.fromEntries(
            String(result.stdout)
              .trim()
              .split('\n')
              .map((line) => line.match(/^([A-Z_]+)=(.*)$/))
              .filter((match): match is RegExpMatchArray => !!match)
              .map((match) => [match[1], match[2] ?? '']),
          );
          if (
            !credentials.AWS_ACCESS_KEY_ID ||
            !credentials.AWS_SECRET_ACCESS_KEY
          )
            return fail(
              new MalfunctionError(
                'aws configure export-credentials did not return expected credentials',
                { profile: input.profile, keysFound: Object.keys(credentials) },
              ),
            );
          return settle({
            credentials,
            expiresAt:
              credentials.AWS_CREDENTIAL_EXPIRATION ??
              new Date(Date.now() + 55 * 60 * 1000).toISOString(),
          });
        },
      );
    });
  return {
    genAwsProfileExport: jest.fn(genAwsProfileExportStub),
    genAwsProfileExportStub,
  };
});

/**
 * .mock = delAwsProfileExport, as a no-op spy
 * .why = a relock case asserts the adapter drops the profile's exports; the drop itself is disk
 * .real = genAwsProfileExport.integration.test.ts [case14] proves the drop on disk
 */
jest.mock('../../mechanisms/aws.sso/delAwsProfileExport', () => ({
  delAwsProfileExport: jest.fn(),
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
import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { getError } from 'test-fns';

import { exec, spawn } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { asKeyrackErroredKeyTip } from '../../../cli/asKeyrackErroredKeyTip';
import { delAwsProfileExport } from '../../mechanisms/aws.sso/delAwsProfileExport';
import { genAwsProfileExport } from '../../mechanisms/aws.sso/genAwsProfileExport';
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
const genAwsProfileExportMock = genAwsProfileExport as jest.MockedFunction<
  typeof genAwsProfileExport
>;
const delAwsProfileExportMock = delAwsProfileExport as jest.MockedFunction<
  typeof delAwsProfileExport
>;
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
      execMock.mockImplementation((cmd: string, ...rest: any[]) => {
        const callback = rest[rest.length - 1];
        callback(null, {
          stdout: [
            'AWS_ACCESS_KEY_ID=AKIAFAKEKEYEXAMPLE',
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
        execMock.mockImplementation((cmd: string, ...rest: any[]) => {
          const callback = rest[rest.length - 1];
          callback(null, {
            stdout: [
              'AWS_ACCESS_KEY_ID=AKIAFAKEKEYEXAMPLE',
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

    when('[t0.2] an unlock check then a get, of one profile', () => {
      beforeEach(() => {
        // the cli answers an export with creds that outlive the margin, and sts with an arn
        const expiration = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        execMock.mockImplementation((cmd: string, ...rest: any[]) => {
          const callback = rest[rest.length - 1];
          if (cmd.includes('aws configure export-credentials'))
            callback(null, {
              stdout: [
                'AWS_ACCESS_KEY_ID=AKIAFAKEKEYEXAMPLE',
                'AWS_SECRET_ACCESS_KEY=fake-secret-for-test',
                'AWS_SESSION_TOKEN=fake-token-for-test',
                `AWS_CREDENTIAL_EXPIRATION=${expiration}`,
              ].join('\n'),
              stderr: '',
            });
          if (cmd.includes('aws sts get-caller-identity'))
            callback(null, {
              stdout:
                '{"Account":"123456789012","Arn":"arn:aws:sts::123456789012:assumed-role/MyRole/alice@acme.com"}',
              stderr: '',
            });
          return {} as any;
        });
        mockFromSSO.mockImplementation(async () => ({
          accessKeyId: 'AKIA...',
          secretAccessKey: 'secret',
          sessionToken: 'token',
        }));
        execMock.mockClear();
        genAwsProfileExportMock.mockClear();
      });

      then(
        'the pre-warm and each get ask the single-flight op for the profile, never the cli direct',
        async () => {
          // the call sites the vision counts: the unlock's pre-warm, then the get's deliverForGet
          const isUnlocked = await vaultAdapterAwsConfig.isUnlocked({
            exid: 'acme-prod',
            meta: { awsSsoUsername: 'alice@acme.com' },
          });
          expect(isUnlocked).toEqual(true);
          await vaultAdapterAwsConfig.get({
            slug: 'acme.prod.AWS_PROFILE',
            exid: 'acme-prod',
          });
          await vaultAdapterAwsConfig.get({
            slug: 'acme.prod.AWS_PROFILE',
            exid: 'acme-prod',
          });

          // all three go through the op, none with a refresh, so its cache can answer them;
          //   that the op exports once across them is clamped in genAwsProfileExport [case2] and
          //   at the cli in the acceptance [case20]
          expect(genAwsProfileExportMock.mock.calls).toEqual([
            [{ profile: 'acme-prod', refresh: false }],
            [{ profile: 'acme-prod', refresh: false }],
            [{ profile: 'acme-prod', refresh: false }],
          ]);

          // every export the cli saw came through the op; none ran beside it
          const exportCalls = execMock.mock.calls.filter(([cmd]) =>
            String(cmd).includes('aws configure export-credentials'),
          );
          expect(exportCalls).toHaveLength(
            genAwsProfileExportMock.mock.calls.length,
          );
        },
      );
    });

    when('[t0.5] get called with exid and explicit mech', () => {
      beforeEach(() => {
        // mock aws configure export-credentials output (mech.deliverForGet calls this)
        execMock.mockImplementation((cmd: string, ...rest: any[]) => {
          const callback = rest[rest.length - 1];
          callback(null, {
            stdout: [
              'AWS_ACCESS_KEY_ID=AKIAFAKEKEYEXAMPLE',
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
        execMock.mockImplementation((cmd: string, ...rest: any[]) => {
          const callback = rest[rest.length - 1];
          if (cmd.includes('aws configure export-credentials')) {
            callback(null, {
              stdout: [
                'AWS_ACCESS_KEY_ID=AKIAFAKEKEYEXAMPLE',
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
          { timeout: 120_000 },
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

    when(
      '[t1.5] isUnlocked while a peer holds the export past the wait bound',
      () => {
        beforeEach(() => {
          mockFromSSO.mockResolvedValue({
            accessKeyId: 'AKIA...',
            secretAccessKey: 'secret',
            sessionToken: 'token',
          });
        });

        then(
          'the wait-bound ConstraintError reaches the caller unchanged, never a re-login or a malfunction',
          async () => {
            // .mock = genAwsProfileExport rejects once with its wait-bound error
            // .why = the real bound is five minutes; a unit case cannot hold a peer that long
            // .real = genAwsProfileExport.integration.test.ts [case9] [t1] proves the op throws it
            const waitBound = new ConstraintError(
              'another process held the aws export for this profile past the wait bound',
              { profile: 'acme-prod' },
            );
            genAwsProfileExportMock.mockRejectedValueOnce(waitBound);
            const error = await getError(
              vaultAdapterAwsConfig.isUnlocked({
                exid: 'acme-prod',
                meta: { awsSsoUsername: 'alice@acme.com' },
              }),
            );
            expect(error).toBe(waitBound);
            expect(spawnMock).not.toHaveBeenCalled();
          },
        );

        then(
          "an export fault of the op's own (a hang) reaches the caller whole, never as an unexpected-error wrapper",
          async () => {
            // .mock = genAwsProfileExport rejects once with its hang-guard error
            // .why = the real hang guard is two minutes; a unit case cannot hold a cli that long
            // .real = genAwsProfileExport.integration.test.ts [case9] [t0] proves the op throws it
            const hung = new MalfunctionError(
              'aws configure export-credentials hung',
              { profile: 'acme-prod' },
            );
            genAwsProfileExportMock.mockRejectedValueOnce(hung);
            const error = await getError(
              vaultAdapterAwsConfig.isUnlocked({
                exid: 'acme-prod',
                meta: { awsSsoUsername: 'alice@acme.com' },
              }),
            );
            expect(error).toBe(hung);
            expect(error.message).not.toContain('unexpected error');
            expect(spawnMock).not.toHaveBeenCalled();
          },
        );
      },
    );

    when('[t1.7] isUnlocked reads the username via sts', () => {
      // the export answers; sts answers per case
      const asExecMockWithSts = (sts: (callback: Function) => void) =>
        execMock.mockImplementation((cmd: string, ...rest: any[]) => {
          const callback = rest[rest.length - 1];
          if (cmd.includes('aws configure export-credentials'))
            callback(null, {
              stdout:
                'AWS_ACCESS_KEY_ID=AKIAFAKEKEYEXAMPLE\nAWS_SECRET_ACCESS_KEY=fake-secret-for-test',
              stderr: '',
            });
          if (cmd.includes('aws sts get-caller-identity')) sts(callback);
          return {} as any;
        });

      beforeEach(() => {
        mockFromSSO.mockResolvedValue({
          accessKeyId: 'AKIA...',
          secretAccessKey: 'secret',
          sessionToken: 'token',
        });
      });

      then(
        'the profile rides as one single-quoted word, under a hang guard',
        async () => {
          asExecMockWithSts((callback) =>
            callback(null, {
              stdout:
                '{"Account":"123456789012","Arn":"arn:aws:sts::123456789012:assumed-role/MyRole/alice@acme.com"}',
              stderr: '',
            }),
          );
          await vaultAdapterAwsConfig.isUnlocked({
            exid: 'acme-prod',
            meta: { awsSsoUsername: 'alice@acme.com' },
          });
          const stsCall = execMock.mock.calls.find(([cmd]) =>
            String(cmd).includes('aws sts get-caller-identity'),
          );
          expect(stsCall?.[0]).toEqual(
            "exec aws sts get-caller-identity --profile 'acme-prod'",
          );
          expect(stsCall?.[1]).toEqual({ timeout: 120_000 });
        },
      );

      then(
        'a sts call killed at the hang guard fails loud, never as an expired session',
        async () => {
          asExecMockWithSts((callback) =>
            callback(
              Object.assign(new Error('Command failed: exec aws sts'), {
                killed: true,
                code: null,
                signal: 'SIGTERM',
              }),
            ),
          );
          const error = await getError(
            vaultAdapterAwsConfig.isUnlocked({
              exid: 'acme-prod',
              meta: { awsSsoUsername: 'alice@acme.com' },
            }),
          );
          expect(error).toBeInstanceOf(MalfunctionError);
          expect(error.message).toContain('aws sts get-caller-identity hung');
          expect(spawnMock).not.toHaveBeenCalled();

          // the unlock row names the retry, then the by-hand command for a recurrence
          const row = asKeyrackErroredKeyTip({
            cause: error,
            slug: 'acme.prod.AWS_PROFILE',
            orgDefault: 'acme',
            owner: null,
          });
          expect(row).toEqual(
            "aws sts get-caller-identity hung — retry: rhx keyrack unlock --env prod --key AWS_PROFILE; if it recurs, run `aws sts get-caller-identity --profile 'acme-prod'` by hand to see where it stalls",
          );
        },
      );
    });

    when('[t1.8] isUnlocked on a profile with no sso config', () => {
      then(
        'it fails as a constraint that names the cure, never as an expired session',
        async () => {
          // the sdk's own words for a profile with no sso_session or sso_start_url
          const notSso = new Error(
            'Profile acme-static is not configured with SSO credentials.',
          );
          notSso.name = 'CredentialsProviderError';
          mockFromSSO.mockRejectedValue(notSso);

          const error = await getError(
            vaultAdapterAwsConfig.isUnlocked({
              exid: 'acme-static',
              meta: { awsSsoUsername: 'alice@acme.com' },
            }),
          );
          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.message).toContain(
            'aws profile is not an sso profile; the aws.config vault needs one',
          );
          expect(error.message).toContain('os.direct');
          expect(error.message).not.toContain('aws sso login');
          expect(spawnMock).not.toHaveBeenCalled();
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
        execMock.mockImplementation((cmd: string, ...rest: any[]) => {
          const callback = rest[rest.length - 1];
          if (cmd.includes('aws configure export-credentials')) {
            callback(null, {
              stdout: [
                'AWS_ACCESS_KEY_ID=AKIAFAKEKEYEXAMPLE',
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
        execMock.mockImplementation((cmd: string, ...rest: any[]) => {
          const callback = rest[rest.length - 1];
          if (cmd.includes('aws configure export-credentials')) {
            callback(null, {
              stdout: [
                'AWS_ACCESS_KEY_ID=AKIAFAKEKEYEXAMPLE',
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

        // snapshot the adapter output directly — it emits its own root header
        const output = consoleLogs.join('\n');
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
        execMock.mockImplementation((cmd: string, ...rest: any[]) => {
          const callback = rest[rest.length - 1];
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

          // snapshot the adapter output directly — it emits its own root header
          const output = consoleLogs.join('\n');
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
        execMock.mockImplementation((cmd: string, ...rest: any[]) => {
          const callback = rest[rest.length - 1];
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

        // snapshot the adapter output directly — it emits its own root header
        const output = consoleLogs.join('\n');
        expect(output).toContain('with sso prior?');
        expect(output).toContain('clear, no prior session');
        expect(output).toMatchSnapshot();
      });
    });

    when('[t1.6] the post-login export fails after a fresh login', () => {
      // .note = deliberate mutation — each `then` sets the cli faults its case wants; each
      //         post-login refresh shifts one off and rejects as the op does, then the stub runs
      const exportPlan = {
        failures: [] as string[],
        hint: null as string | null,
      };
      // .cast = the stub the module mock exposes beside the op; see the mock's .mock doc above
      const genAwsProfileExportStub = (
        jest.requireMock('../../mechanisms/aws.sso/genAwsProfileExport') as {
          genAwsProfileExportStub: typeof genAwsProfileExport;
        }
      ).genAwsProfileExportStub;

      afterEach(() => {
        genAwsProfileExportMock.mockImplementation(genAwsProfileExportStub);
      });

      beforeEach(() => {
        exportPlan.failures = [];
        exportPlan.hint = null;
        genAwsProfileExportMock.mockClear();
        genAwsProfileExportMock.mockImplementation(async (input, options) => {
          const failure = input.refresh ? exportPlan.failures.shift() : null;
          if (failure)
            throw new MalfunctionError(
              'aws configure export-credentials failed',
              {
                profile: input.profile,
                cliError: failure,
                ...(exportPlan.hint ? { hint: exportPlan.hint } : {}),
              },
            );
          return genAwsProfileExportStub(input, options);
        });
        let loginCompleted = false;
        const credentialsError = new Error(
          'The SSO session associated with this profile has expired',
        );
        credentialsError.name = 'CredentialsProviderError';
        mockFromSSO.mockImplementation(async () => {
          if (!loginCompleted) throw credentialsError;
          return {
            accessKeyId: 'AKIA...',
            secretAccessKey: 'secret',
            sessionToken: 'token',
          };
        });
        getAllAwsSsoCacheEntriesMock.mockReturnValue([]);

        const futureExpiration = new Date(
          Date.now() + 30 * 60 * 1000,
        ).toISOString();
        execMock.mockImplementation((cmd: string, ...rest: any[]) => {
          const callback = rest[rest.length - 1];
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
            loginCompleted = true;
            emitter.emit('close', 0);
          });
          return emitter;
        });
      });

      // the export calls the unlock made after its login, each a refresh
      const getRefreshCalls = () =>
        genAwsProfileExportMock.mock.calls.filter(([input]) => input.refresh);

      then(
        'an expired failure clears the cli cache and the retry succeeds',
        async () => {
          exportPlan.failures = ['Error: Token has expired and refresh failed'];
          await vaultAdapterAwsConfig.unlock({
            identity: null,
            exid: 'acme-prod',
            meta: { awsSsoUsername: 'alice@acme.com' },
            silent: true,
          });
          expect(getRefreshCalls()).toHaveLength(2);
        },
      );

      then('an expired failure whose retry fails again throws', async () => {
        exportPlan.failures = [
          'Error: Token has expired and refresh failed',
          'Error: Token has expired and refresh failed',
        ];
        const error = await getError(
          vaultAdapterAwsConfig.unlock({
            identity: null,
            exid: 'acme-prod',
            meta: { awsSsoUsername: 'alice@acme.com' },
            silent: true,
          }),
        );
        expect(error.message).toContain(
          'aws configure export-credentials failed',
        );
        expect(getRefreshCalls()).toHaveLength(2);
      });

      then('a failure that is not an expiry throws with no retry', async () => {
        exportPlan.failures = ['Error: connection refused'];
        const error = await getError(
          vaultAdapterAwsConfig.unlock({
            identity: null,
            exid: 'acme-prod',
            meta: { awsSsoUsername: 'alice@acme.com' },
            silent: true,
          }),
        );
        expect(error.message).toContain('connection refused');
        expect(getRefreshCalls()).toHaveLength(1);
      });

      then(
        'a non-expiry cli fault whose hint says "expired" still throws with no retry',
        async () => {
          // only the cli's own words sort the fault; the hint text must not flip it
          exportPlan.failures = ['Error: connection refused'];
          exportPlan.hint = 'if the session expired, re-run the unlock';
          const error = await getError(
            vaultAdapterAwsConfig.unlock({
              identity: null,
              exid: 'acme-prod',
              meta: { awsSsoUsername: 'alice@acme.com' },
              silent: true,
            }),
          );
          expect(error.message).toContain('connection refused');
          expect(getRefreshCalls()).toHaveLength(1);
        },
      );
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

        const error = await getError(
          vaultAdapterAwsConfig.unlock({
            identity: null,
            exid: 'acme-prod',
            silent: false,
            // meta.awsSsoUsername intentionally absent
          }),
        ).finally(() => {
          console.log = originalLog;
        });

        // the error names the fix
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain(
          'rhx keyrack set --owner <owner> --env <env> --key <key> --vault aws.config',
        );

        // snapshot the adapter output directly — it emits its own root header
        const output = consoleLogs.join('\n');
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
          execMock.mockImplementation((cmd: string, ...rest: any[]) => {
            const callback = rest[rest.length - 1];
            if (cmd.includes('aws configure export-credentials')) {
              callback(null, {
                stdout: [
                  'AWS_ACCESS_KEY_ID=AKIAFAKEKEYEXAMPLE',
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
          // snapshot the adapter output directly — it emits its own root header
          const output = consoleLogs.join('\n');
          expect(output).toContain('with sso prior?');
          expect(output).toContain('expected: alice@acme.com');
          expect(output).toContain('observed: bob@acme.com');
          expect(output).toContain('cleared, re-auth triggered');
          expect(output).toMatchSnapshot();
        });
      },
    );
  });

  given('[case3b] cross-username recovery via confirmSsoSessionForUser', () => {
    /**
     * .what = the post-login recovery loop (mode 1 + mode 2)
     * .why = the wish requires auto-recovery when the browser auths as the
     *        wrong user; one logout+retry loop handles the common case
     *
     * mode 1 = session invalid after login (wrong user authed, lacks access)
     * mode 2 = session valid but username mismatch
     */

    /**
     * .what = build an exec mock whose sts username follows a sequence of values
     * .why = the recovery loop calls validateSsoSession multiple times; each
     *        call must yield the next identity in sequence to model login retries
     */
    const genExecMockWithUsernameSequence = (usernames: string[]) => {
      let callIndex = 0;
      return (cmd: string, ...rest: any[]) => {
        const callback = rest[rest.length - 1];
        if (cmd.includes('aws configure export-credentials')) {
          callback(null, {
            stdout: [
              'AWS_ACCESS_KEY_ID=AKIAFAKEKEYEXAMPLE',
              'AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
              'AWS_SESSION_TOKEN=FwoGZXIvYXdzEBYaDK...',
              'AWS_CREDENTIAL_EXPIRATION=2026-04-14T12:00:00Z',
            ].join('\n'),
            stderr: '',
          });
        } else if (cmd.includes('aws sts get-caller-identity')) {
          const username =
            usernames[Math.min(callIndex, usernames.length - 1)]!;
          callIndex += 1;
          callback(null, {
            stdout: `{"Account":"123456789012","Arn":"arn:aws:sts::123456789012:assumed-role/MyRole/${username}"}`,
            stderr: '',
          });
        }
        return {} as any;
      };
    };

    when('[t0] mode 2: wrong user, retry recovers to correct user', () => {
      beforeEach(() => {
        // session valid throughout; identity flips wrong then correct after retry
        mockFromSSO.mockResolvedValue({
          accessKeyId: 'AKIA...',
          secretAccessKey: 'secret',
          sessionToken: 'token',
        });
        // initial=bob, post-login=bob (still wrong), post-retry=alice
        execMock.mockImplementation(
          genExecMockWithUsernameSequence([
            'bob@acme.com',
            'bob@acme.com',
            'alice@acme.com',
          ]),
        );
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
        const { EventEmitter } = require('node:events');
        spawnMock.mockImplementation(() => {
          const emitter = new EventEmitter();
          process.nextTick(() => emitter.emit('close', 0));
          return emitter;
        });
      });

      then('completes without error after retry', async () => {
        await expect(
          vaultAdapterAwsConfig.unlock({
            identity: null,
            exid: 'acme-prod',
            meta: { awsSsoUsername: 'alice@acme.com' },
            silent: true,
          }),
        ).resolves.toBeUndefined();
      });

      then('triggers a second sso login for the retry', async () => {
        await vaultAdapterAwsConfig.unlock({
          identity: null,
          exid: 'acme-prod',
          meta: { awsSsoUsername: 'alice@acme.com' },
          silent: true,
        });
        // login 1 = initial re-auth, login 2 = recovery retry
        expect(spawnMock).toHaveBeenCalledTimes(2);
      });

      then('outputs the wrong-user recovery message (snapshot)', async () => {
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
        const output = consoleLogs.join('\n');
        expect(output).toContain('wrong user, logout browser session');
        expect(output).toContain('logged out, retry login');
        expect(output).toMatchSnapshot();
      });
    });

    when('[t1] mode 1: invalid session after login, retry recovers', () => {
      beforeEach(() => {
        // fromSSO: invalid until the recovery login completes
        let loginCount = 0;
        const credentialsError = new Error(
          'The SSO session associated with this profile has expired',
        );
        credentialsError.name = 'CredentialsProviderError';
        mockFromSSO.mockImplementation(() => {
          // valid only after the second login (the recovery retry)
          if (loginCount >= 2)
            return Promise.resolve({
              accessKeyId: 'AKIA...',
              secretAccessKey: 'secret',
              sessionToken: 'token',
            });
          return Promise.reject(credentialsError);
        });
        // once valid, sts yields the correct user
        execMock.mockImplementation(
          genExecMockWithUsernameSequence(['alice@acme.com']),
        );
        getAllAwsSsoCacheEntriesMock.mockReturnValue([
          {
            file: 'cached-token.json',
            filePath: '/home/test/.aws/sso/cache/cached-token.json',
            startUrl: 'https://example.awsapps.com/start',
            accessToken: 'token',
            region: 'us-east-1',
            expiresAt: '2026-04-30T23:59:59Z',
          },
        ]);
        const { EventEmitter } = require('node:events');
        spawnMock.mockImplementation(() => {
          const emitter = new EventEmitter();
          process.nextTick(() => {
            loginCount += 1;
            emitter.emit('close', 0);
          });
          return emitter;
        });
      });

      then('recovers and completes without error', async () => {
        await expect(
          vaultAdapterAwsConfig.unlock({
            identity: null,
            exid: 'acme-prod',
            meta: { awsSsoUsername: 'alice@acme.com' },
            silent: true,
          }),
        ).resolves.toBeUndefined();
      });

      then(
        'outputs the invalid-session recovery message (snapshot)',
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
          const output = consoleLogs.join('\n');
          expect(output).toContain('session invalid, logout browser session');
          expect(output).toContain('logged out, retry login');
          expect(output).toMatchSnapshot();
        },
      );
    });

    when('[t2] retry exhausted: still wrong user after retry', () => {
      beforeEach(() => {
        // session valid throughout, but identity is wrong on every check
        mockFromSSO.mockResolvedValue({
          accessKeyId: 'AKIA...',
          secretAccessKey: 'secret',
          sessionToken: 'token',
        });
        execMock.mockImplementation(
          genExecMockWithUsernameSequence(['bob@acme.com']),
        );
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
        const { EventEmitter } = require('node:events');
        spawnMock.mockImplementation(() => {
          const emitter = new EventEmitter();
          process.nextTick(() => emitter.emit('close', 0));
          return emitter;
        });
      });

      then('throws username mismatch persists error', async () => {
        await expect(
          vaultAdapterAwsConfig.unlock({
            identity: null,
            exid: 'acme-prod',
            meta: { awsSsoUsername: 'alice@acme.com' },
            silent: true,
          }),
        ).rejects.toThrow('username mismatch persists');
      });
    });

    when('[t3] retry exhausted: still invalid after retry', () => {
      beforeEach(() => {
        // fromSSO never validates, even after retries
        const credentialsError = new Error(
          'The SSO session associated with this profile has expired',
        );
        credentialsError.name = 'CredentialsProviderError';
        mockFromSSO.mockRejectedValue(credentialsError);
        getAllAwsSsoCacheEntriesMock.mockReturnValue([
          {
            file: 'cached-token.json',
            filePath: '/home/test/.aws/sso/cache/cached-token.json',
            startUrl: 'https://example.awsapps.com/start',
            accessToken: 'token',
            region: 'us-east-1',
            expiresAt: '2026-04-30T23:59:59Z',
          },
        ]);
        const { EventEmitter } = require('node:events');
        spawnMock.mockImplementation(() => {
          const emitter = new EventEmitter();
          process.nextTick(() => emitter.emit('close', 0));
          return emitter;
        });
      });

      then('throws session still invalid error', async () => {
        await expect(
          vaultAdapterAwsConfig.unlock({
            identity: null,
            exid: 'acme-prod',
            meta: { awsSsoUsername: 'alice@acme.com' },
            silent: true,
          }),
        ).rejects.toThrow('sso login failed; session still invalid');
      });
    });

    when(
      '[t4] the recovery (second) login itself fails or is cancelled',
      () => {
        // .what = vision edge case: "user cancels second login → throws after retry"
        // .why = distinct from [t3]: here the retry login process exits non-zero
        //        (cancel/failure) before re-validation, so the throw comes from
        //        triggerSsoLogin inside confirmSsoSessionForUser, not from a
        //        still-invalid session
        beforeEach(() => {
          // valid session throughout, but wrong user → forces mode-2 recovery
          mockFromSSO.mockResolvedValue({
            accessKeyId: 'AKIA...',
            secretAccessKey: 'secret',
            sessionToken: 'token',
          });
          execMock.mockImplementation(
            genExecMockWithUsernameSequence(['bob@acme.com']),
          );
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
          // first login (initial re-auth) succeeds; second login (recovery) fails
          let loginCount = 0;
          const { EventEmitter } = require('node:events');
          spawnMock.mockImplementation(() => {
            const emitter = new EventEmitter();
            const exitCode = loginCount === 0 ? 0 : 1;
            loginCount += 1;
            process.nextTick(() => emitter.emit('close', exitCode));
            return emitter;
          });
        });

        then('throws aws sso login failed (no infinite loop)', async () => {
          await expect(
            vaultAdapterAwsConfig.unlock({
              identity: null,
              exid: 'acme-prod',
              meta: { awsSsoUsername: 'alice@acme.com' },
              silent: true,
            }),
          ).rejects.toThrow('aws sso login failed');
        });

        then('attempts exactly two logins then stops', async () => {
          await vaultAdapterAwsConfig
            .unlock({
              identity: null,
              exid: 'acme-prod',
              meta: { awsSsoUsername: 'alice@acme.com' },
              silent: true,
            })
            .catch(() => undefined);
          // login 1 = initial re-auth (ok), login 2 = recovery (fails) → bounded
          expect(spawnMock).toHaveBeenCalledTimes(2);
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
      execMock.mockImplementation((cmd: string, ...rest: any[]) => {
        const callback = rest[rest.length - 1];
        if (cmd.includes('aws configure export-credentials')) {
          callback(null, {
            stdout: [
              'AWS_ACCESS_KEY_ID=AKIAFAKEKEYEXAMPLE',
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
          vaultAdapterAwsConfig.del({
            slug: 'acme.prod.AWS_PROFILE',
            mech: null,
            meta: null,
          }),
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

      // one relock, shared by the thens; the calls are copied out, since a beforeEach clears them
      const relocked = useThen('the relock completes', async () => {
        delAwsProfileExportMock.mockClear();
        await vaultAdapterAwsConfig.relock!({
          slug: 'acme.prod.AWS_PROFILE',
          exid: 'acme-prod',
        });
        return {
          unlinkCalls: unlinkSyncMock.mock.calls.length,
          dropCalls: [...delAwsProfileExportMock.mock.calls],
        };
      });

      then('deletes cache files for target domain', () => {
        // should delete the cached token file for example.awsapps.com/start
        expect(relocked.unlinkCalls).toBeGreaterThan(0);
      });

      then("drops keyrack's cached exports of the profile", () => {
        expect(relocked.dropCalls).toEqual([[{ profile: 'acme-prod' }]]);
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

  /**
   * .what = the READ side of the reach refusal, which this vault did not hold until 2026-08-06
   * .why = `set` refused a reach; `get` accepted `input.reach` and never read it. that
   *        asymmetry made the guarantee a property of ONE write path rather than of the vault
   *        — a hand-edited manifest, or any future write that bypasses `vault.set`, produces
   *        an entry this read would answer with the REACHLESS sso profile: a live credential
   *        for a reach the caller never asked for (e18's class)
   *
   * .note = every peer vault already holds this line, one way or the other. `os.envvar` and
   *         `github.secrets` assert on read; `os.direct` and `os.secure` bake the reach into
   *         the storage ADDRESS, so a mismatched reach structurally cannot retrieve the wrong
   *         entry. `aws.config` alone trusted "no caller will ever do that", which is the one
   *         form of the guarantee this design accepts nowhere else
   */
  given('[case9] a reach-ask on the read side', () => {
    when('[t0] get is called with a reach', () => {
      // ⚠️ THE clamp — absent the guard this resolves to a grant for the reachless profile
      then(
        'it throws rather than answer with the reachless profile',
        async () => {
          const error = await getError(
            vaultAdapterAwsConfig.get({
              slug: 'acme.prod.AWS_PROFILE',
              exid: 'acme-prod',
              reach: { exid: 'beav@ehmpathy.com' },
            }),
          );

          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.message).toContain('--reach does not apply');
        },
      );
    });

    when('[t1] the same get omits the reach', () => {
      then('e1: the reachless read is byte-identical to today', async () => {
        const grant = await vaultAdapterAwsConfig.get({
          slug: 'acme.prod.AWS_PROFILE',
          exid: 'acme-prod',
        });

        expect(grant).not.toBeNull();
        expect(grant?.key.secret).toEqual('acme-prod');
      });
    });
  });
});
