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

import { ghSecretSet, validateGhAuth } from './ghSecretSet';

describe('ghSecretSet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  given('[case1] gh auth status succeeds', () => {
    beforeEach(() => {
      // auth succeeds
      mockExecSync.mockReturnValue(Buffer.from(''));
    });

    when('[t0] valid secret and repo provided', () => {
      beforeEach(() => {
        // gh secret set succeeds
        mockSpawnSync.mockReturnValue({
          status: 0,
          stdout: '',
          stderr: '',
          pid: 0,
          output: [],
          signal: null,
        });
      });

      then('gh secret set is invoked with piped secret', () => {
        ghSecretSet({
          name: 'MY_SECRET',
          repo: 'owner/repo',
          secret: 'secret-value',
        });

        expect(mockSpawnSync).toHaveBeenCalledWith(
          'gh',
          ['secret', 'set', 'MY_SECRET', '--repo', 'owner/repo'],
          expect.objectContaining({
            input: 'secret-value',
            encoding: 'utf-8',
          }),
        );
      });

      then('returns success (no throw)', () => {
        expect(() =>
          ghSecretSet({
            name: 'MY_SECRET',
            repo: 'owner/repo',
            secret: 'secret-value',
          }),
        ).not.toThrow();
      });
    });

    when('[t1] repo format is invalid', () => {
      then('failloud with "repo must be in owner/repo format"', async () => {
        const error = await getError(async () =>
          ghSecretSet({
            name: 'MY_SECRET',
            repo: 'invalid-repo',
            secret: 'secret-value',
          }),
        );

        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('repo must be in owner/repo format');
      });
    });

    when('[t2] gh secret set fails', () => {
      beforeEach(() => {
        // gh secret set fails
        mockSpawnSync.mockReturnValue({
          status: 1,
          stdout: '',
          stderr: 'error: secret not found or permission denied',
          pid: 0,
          output: [],
          signal: null,
        });
      });

      then('failloud with forwarded gh stderr', async () => {
        const error = await getError(async () =>
          ghSecretSet({
            name: 'MY_SECRET',
            repo: 'owner/repo',
            secret: 'secret-value',
          }),
        );

        expect(error).toBeInstanceOf(UnexpectedCodePathError);
        expect(error.message).toContain('gh secret set failed');
        expect((error as UnexpectedCodePathError).metadata).toMatchObject({
          name: 'MY_SECRET',
          repo: 'owner/repo',
          stderr: 'error: secret not found or permission denied',
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

    when('[t0] ghSecretSet is called', () => {
      then('failloud with "gh auth required"', async () => {
        const error = await getError(async () =>
          ghSecretSet({
            name: 'MY_SECRET',
            repo: 'owner/repo',
            secret: 'secret-value',
          }),
        );

        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('gh auth required');
      });
    });
  });
});

describe('validateGhAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  given('[case1] gh auth status succeeds', () => {
    beforeEach(() => {
      mockExecSync.mockReturnValue(Buffer.from(''));
    });

    when('[t0] validateGhAuth is called', () => {
      then('does not throw', () => {
        expect(() => validateGhAuth()).not.toThrow();
      });
    });
  });

  given('[case2] gh auth status fails', () => {
    beforeEach(() => {
      mockExecSync.mockImplementation(() => {
        throw new Error('not logged in');
      });
    });

    when('[t0] validateGhAuth is called', () => {
      then('failloud with "gh auth required"', async () => {
        const error = await getError(async () => validateGhAuth());

        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('gh auth required');
        expect((error as BadRequestError).metadata?.hint).toContain(
          'gh auth login',
        );
      });
    });
  });
});
