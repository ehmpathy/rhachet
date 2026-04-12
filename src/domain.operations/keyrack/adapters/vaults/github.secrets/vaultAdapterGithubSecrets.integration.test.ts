import { UnexpectedCodePathError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import * as childProcess from 'node:child_process';

// mock child_process to control gh CLI behavior
jest.mock('node:child_process');
const mockExecSync = childProcess.execSync as jest.MockedFunction<
  typeof childProcess.execSync
>;
const mockSpawnSync = childProcess.spawnSync as jest.MockedFunction<
  typeof childProcess.spawnSync
>;

// mock mech adapters
jest.mock(
  '@src/domain.operations/keyrack/adapters/mechanisms/mechAdapterReplica',
  () => ({
    mechAdapterReplica: {
      acquireForSet: jest.fn(),
      deliverForGet: jest.fn(),
      validate: jest.fn(),
    },
  }),
);

jest.mock(
  '@src/domain.operations/keyrack/adapters/mechanisms/mechAdapterGithubApp',
  () => ({
    mechAdapterGithubApp: {
      acquireForSet: jest.fn(),
      deliverForGet: jest.fn(),
      validate: jest.fn(),
    },
  }),
);

// mock getGithubRepoFromContext
jest.mock('./getGithubRepoFromContext', () => ({
  getGithubRepoFromContext: jest.fn(),
}));

import { mechAdapterGithubApp } from '@src/domain.operations/keyrack/adapters/mechanisms/mechAdapterGithubApp';
import { mechAdapterReplica } from '@src/domain.operations/keyrack/adapters/mechanisms/mechAdapterReplica';

import { getGithubRepoFromContext } from './getGithubRepoFromContext';
import { vaultAdapterGithubSecrets } from './vaultAdapterGithubSecrets';

const mockMechAdapterReplica = mechAdapterReplica as jest.Mocked<
  typeof mechAdapterReplica
>;
const mockMechAdapterGithubApp = mechAdapterGithubApp as jest.Mocked<
  typeof mechAdapterGithubApp
>;
const mockGetGithubRepoFromContext =
  getGithubRepoFromContext as jest.MockedFunction<
    typeof getGithubRepoFromContext
  >;

describe('vaultAdapterGithubSecrets', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // default: gh auth succeeds
    mockExecSync.mockReturnValue(Buffer.from(''));

    // default: gh secret set/delete succeeds
    mockSpawnSync.mockReturnValue({
      status: 0,
      stdout: '',
      stderr: '',
      pid: 0,
      output: [],
      signal: null,
    });

    // default: repo from context
    mockGetGithubRepoFromContext.mockReturnValue('ehmpathy/rhachet');
  });

  describe('mechs.supported', () => {
    given('[case1] vault adapter', () => {
      then(
        'supports EPHEMERAL_VIA_GITHUB_APP and PERMANENT_VIA_REPLICA',
        () => {
          expect(vaultAdapterGithubSecrets.mechs.supported).toEqual([
            'EPHEMERAL_VIA_GITHUB_APP',
            'PERMANENT_VIA_REPLICA',
          ]);
        },
      );
    });
  });

  describe('isUnlocked', () => {
    given('[case1] gh auth status succeeds', () => {
      beforeEach(() => {
        mockExecSync.mockReturnValue(Buffer.from(''));
      });

      when('[t0] isUnlocked is called', () => {
        then('returns true', async () => {
          const result = await vaultAdapterGithubSecrets.isUnlocked();
          expect(result).toBe(true);
        });
      });
    });

    given('[case2] gh auth status fails', () => {
      beforeEach(() => {
        mockExecSync.mockImplementation(() => {
          throw new Error('not logged in');
        });
      });

      when('[t0] isUnlocked is called', () => {
        then('returns false', async () => {
          const result = await vaultAdapterGithubSecrets.isUnlocked();
          expect(result).toBe(false);
        });
      });
    });
  });

  describe('get', () => {
    given('[case1] write-only vault', () => {
      then('get is null', () => {
        expect(vaultAdapterGithubSecrets.get).toBeNull();
      });
    });
  });

  describe('set', () => {
    given('[case1] PERMANENT_VIA_REPLICA mech', () => {
      beforeEach(() => {
        mockMechAdapterReplica.acquireForSet.mockResolvedValue({
          source: 'test-secret-value',
        });
      });

      when('[t0] set is called', () => {
        then('ghSecretSet is called with secret value', async () => {
          await vaultAdapterGithubSecrets.set({
            slug: 'ehmpathy.test.API_KEY',
            mech: 'PERMANENT_VIA_REPLICA',
          });

          // verify mech adapter was called
          expect(mockMechAdapterReplica.acquireForSet).toHaveBeenCalledWith({
            keySlug: 'ehmpathy.test.API_KEY',
          });

          // verify ghSecretSet was called via spawnSync
          expect(mockSpawnSync).toHaveBeenCalledWith(
            'gh',
            ['secret', 'set', 'API_KEY', '--repo', 'ehmpathy/rhachet'],
            expect.objectContaining({
              input: 'test-secret-value',
            }),
          );
        });

        then('returns the mech used and exid (repo)', async () => {
          const result = await vaultAdapterGithubSecrets.set({
            slug: 'ehmpathy.test.API_KEY',
            mech: 'PERMANENT_VIA_REPLICA',
          });

          expect(result).toEqual({
            mech: 'PERMANENT_VIA_REPLICA',
            exid: 'ehmpathy/rhachet',
          });
        });
      });
    });

    given('[case2] EPHEMERAL_VIA_GITHUB_APP mech', () => {
      beforeEach(() => {
        mockMechAdapterGithubApp.acquireForSet.mockResolvedValue({
          source: '{"installation_id":123,"pem":"..."}',
        });
      });

      when('[t0] set is called', () => {
        then('mech.acquireForSet is invoked', async () => {
          await vaultAdapterGithubSecrets.set({
            slug: 'ehmpathy.test.GITHUB_TOKEN',
            mech: 'EPHEMERAL_VIA_GITHUB_APP',
          });

          expect(mockMechAdapterGithubApp.acquireForSet).toHaveBeenCalledWith({
            keySlug: 'ehmpathy.test.GITHUB_TOKEN',
          });
        });

        then('ghSecretSet is called with json blob', async () => {
          await vaultAdapterGithubSecrets.set({
            slug: 'ehmpathy.test.GITHUB_TOKEN',
            mech: 'EPHEMERAL_VIA_GITHUB_APP',
          });

          expect(mockSpawnSync).toHaveBeenCalledWith(
            'gh',
            ['secret', 'set', 'GITHUB_TOKEN', '--repo', 'ehmpathy/rhachet'],
            expect.objectContaining({
              input: '{"installation_id":123,"pem":"..."}',
            }),
          );
        });
      });
    });

    given('[case3] slug with nested key name', () => {
      beforeEach(() => {
        mockMechAdapterReplica.acquireForSet.mockResolvedValue({
          source: 'nested-secret',
        });
      });

      when('[t0] set is called with org.env.KEY.NESTED format', () => {
        then('secret name includes the nested parts', async () => {
          await vaultAdapterGithubSecrets.set({
            slug: 'ehmpathy.test.SOME.NESTED.KEY',
            mech: 'PERMANENT_VIA_REPLICA',
          });

          expect(mockSpawnSync).toHaveBeenCalledWith(
            'gh',
            ['secret', 'set', 'SOME.NESTED.KEY', '--repo', 'ehmpathy/rhachet'],
            expect.objectContaining({
              input: 'nested-secret',
            }),
          );
        });
      });
    });
  });

  describe('del', () => {
    given('[case1] valid slug with exid', () => {
      when('[t0] del is called', () => {
        then('ghSecretDelete is called', async () => {
          await vaultAdapterGithubSecrets.del({
            slug: 'ehmpathy.test.API_KEY',
            exid: 'ehmpathy/rhachet',
          });

          expect(mockSpawnSync).toHaveBeenCalledWith(
            'gh',
            ['secret', 'delete', 'API_KEY', '--repo', 'ehmpathy/rhachet'],
            expect.objectContaining({
              encoding: 'utf-8',
            }),
          );
        });
      });
    });

    given('[case2] slug with nested key name', () => {
      when('[t0] del is called', () => {
        then('secret name includes the nested parts', async () => {
          await vaultAdapterGithubSecrets.del({
            slug: 'ehmpathy.test.SOME.NESTED.KEY',
            exid: 'ehmpathy/rhachet',
          });

          expect(mockSpawnSync).toHaveBeenCalledWith(
            'gh',
            [
              'secret',
              'delete',
              'SOME.NESTED.KEY',
              '--repo',
              'ehmpathy/rhachet',
            ],
            expect.objectContaining({
              encoding: 'utf-8',
            }),
          );
        });
      });
    });

    given('[case3] del without exid', () => {
      when('[t0] del is called', () => {
        then('throws UnexpectedCodePathError', async () => {
          const error = await getError(
            vaultAdapterGithubSecrets.del({
              slug: 'ehmpathy.test.API_KEY',
            }),
          );

          expect(error).toBeInstanceOf(UnexpectedCodePathError);
          expect(error.message).toContain('exid (repo) required');
        });
      });
    });
  });
});
