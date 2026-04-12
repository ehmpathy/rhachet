import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';
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

import { ghSecretDelete } from './ghSecretDelete';

describe('ghSecretDelete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  given('[case1] gh auth status succeeds', () => {
    beforeEach(() => {
      // auth succeeds
      mockExecSync.mockReturnValue(Buffer.from(''));
    });

    when('[t0] valid secret name and repo provided', () => {
      beforeEach(() => {
        // gh secret delete succeeds
        mockSpawnSync.mockReturnValue({
          status: 0,
          stdout: '',
          stderr: '',
          pid: 0,
          output: [],
          signal: null,
        });
      });

      then('gh secret delete is invoked', () => {
        ghSecretDelete({
          name: 'MY_SECRET',
          repo: 'owner/repo',
        });

        expect(mockSpawnSync).toHaveBeenCalledWith(
          'gh',
          ['secret', 'delete', 'MY_SECRET', '--repo', 'owner/repo'],
          expect.objectContaining({
            encoding: 'utf-8',
          }),
        );
      });

      then('returns success (no throw)', () => {
        expect(() =>
          ghSecretDelete({
            name: 'MY_SECRET',
            repo: 'owner/repo',
          }),
        ).not.toThrow();
      });
    });

    when('[t1] repo format is invalid', () => {
      then('failloud with "repo must be in owner/repo format"', async () => {
        const error = await getError(async () =>
          ghSecretDelete({
            name: 'MY_SECRET',
            repo: 'invalid-repo',
          }),
        );

        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('repo must be in owner/repo format');
      });
    });

    when('[t2] gh secret delete fails', () => {
      beforeEach(() => {
        // gh secret delete fails
        mockSpawnSync.mockReturnValue({
          status: 1,
          stdout: '',
          stderr: 'error: secret not found',
          pid: 0,
          output: [],
          signal: null,
        });
      });

      then('failloud with forwarded gh stderr', async () => {
        const error = await getError(async () =>
          ghSecretDelete({
            name: 'MY_SECRET',
            repo: 'owner/repo',
          }),
        );

        expect(error).toBeInstanceOf(UnexpectedCodePathError);
        expect(error.message).toContain('gh secret delete failed');
        expect((error as UnexpectedCodePathError).metadata).toMatchObject({
          name: 'MY_SECRET',
          repo: 'owner/repo',
          stderr: 'error: secret not found',
        });
      });
    });
  });

  given('[case2] gh auth status fails', () => {
    beforeEach(() => {
      // auth fails
      mockExecSync.mockImplementation(() => {
        throw new Error('not logged in');
      });
    });

    when('[t0] ghSecretDelete is called', () => {
      then('failloud with "gh auth required"', async () => {
        const error = await getError(async () =>
          ghSecretDelete({
            name: 'MY_SECRET',
            repo: 'owner/repo',
          }),
        );

        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('gh auth required');
      });
    });
  });
});
