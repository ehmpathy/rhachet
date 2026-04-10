import { given, then, when } from 'test-fns';

import { spawnSync } from 'node:child_process';
import { execNpmInstallGlobal, isPnpmAvailable } from './execNpmInstallGlobal';

jest.mock('node:child_process', () => ({
  spawnSync: jest.fn(),
}));

const mockSpawnSync = spawnSync as jest.MockedFunction<typeof spawnSync>;

describe('isPnpmAvailable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  given('[case1] pnpm is installed', () => {
    when('[t0] which pnpm returns 0', () => {
      then('returns true', () => {
        mockSpawnSync.mockReturnValue({
          status: 0,
          stdout: Buffer.from('/usr/local/bin/pnpm'),
          stderr: Buffer.from(''),
          pid: 1,
          output: [],
          signal: null,
        });

        expect(isPnpmAvailable()).toBe(true);
        expect(mockSpawnSync).toHaveBeenCalledWith('which', ['pnpm'], {
          stdio: 'pipe',
          shell: true,
        });
      });
    });
  });

  given('[case2] pnpm is not installed', () => {
    when('[t0] which pnpm returns non-zero', () => {
      then('returns false', () => {
        mockSpawnSync.mockReturnValue({
          status: 1,
          stdout: Buffer.from(''),
          stderr: Buffer.from(''),
          pid: 1,
          output: [],
          signal: null,
        });

        expect(isPnpmAvailable()).toBe(false);
      });
    });
  });
});

describe('execNpmInstallGlobal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  given('[case1] pnpm is available', () => {
    when('[t0] install succeeds', () => {
      then('uses pnpm add -g', () => {
        mockSpawnSync
          // first call: which pnpm
          .mockReturnValueOnce({
            status: 0,
            stdout: Buffer.from('/usr/local/bin/pnpm'),
            stderr: Buffer.from(''),
            pid: 1,
            output: [],
            signal: null,
          })
          // second call: pnpm add -g
          .mockReturnValueOnce({
            status: 0,
            stdout: Buffer.from('Packages: +1'),
            stderr: Buffer.from(''),
            pid: 1,
            output: [],
            signal: null,
          });

        const result = execNpmInstallGlobal({ packages: ['rhachet'] });
        expect(result).toEqual({ upgraded: true });
        expect(mockSpawnSync).toHaveBeenNthCalledWith(
          2,
          'pnpm',
          ['add', '-g', 'rhachet@latest'],
          {
            stdio: 'inherit',
            shell: true,
          },
        );
      });
    });

    when('[t1] install fails with EACCES', () => {
      then('throws error', () => {
        mockSpawnSync
          .mockReturnValueOnce({
            status: 0,
            stdout: Buffer.from('/usr/local/bin/pnpm'),
            stderr: Buffer.from(''),
            pid: 1,
            output: [],
            signal: null,
          })
          .mockReturnValueOnce({
            status: 1,
            stdout: Buffer.from(''),
            stderr: Buffer.from('ERR_PNPM_EACCES  EACCES: permission denied'),
            pid: 1,
            output: [],
            signal: null,
          });

        expect(() => execNpmInstallGlobal({ packages: ['rhachet'] })).toThrow(
          'global install failed with exit code 1',
        );
      });
    });

    when('[t2] multiple packages', () => {
      then('passes all packages with @latest suffix', () => {
        mockSpawnSync
          .mockReturnValueOnce({
            status: 0,
            stdout: Buffer.from('/usr/local/bin/pnpm'),
            stderr: Buffer.from(''),
            pid: 1,
            output: [],
            signal: null,
          })
          .mockReturnValueOnce({
            status: 0,
            stdout: Buffer.from('Packages: +2'),
            stderr: Buffer.from(''),
            pid: 1,
            output: [],
            signal: null,
          });

        const result = execNpmInstallGlobal({
          packages: ['rhachet', 'another-pkg'],
        });
        expect(result).toEqual({ upgraded: true });
        expect(mockSpawnSync).toHaveBeenNthCalledWith(
          2,
          'pnpm',
          ['add', '-g', 'rhachet@latest', 'another-pkg@latest'],
          { stdio: 'inherit', shell: true },
        );
      });
    });
  });

  given('[case2] pnpm is not available (fallback to npm)', () => {
    when('[t0] install succeeds', () => {
      then('uses npm install -g', () => {
        mockSpawnSync
          // first call: which pnpm fails
          .mockReturnValueOnce({
            status: 1,
            stdout: Buffer.from(''),
            stderr: Buffer.from(''),
            pid: 1,
            output: [],
            signal: null,
          })
          // second call: npm install -g
          .mockReturnValueOnce({
            status: 0,
            stdout: Buffer.from('added 1 package'),
            stderr: Buffer.from(''),
            pid: 1,
            output: [],
            signal: null,
          });

        const result = execNpmInstallGlobal({ packages: ['rhachet'] });
        expect(result).toEqual({ upgraded: true });
        expect(mockSpawnSync).toHaveBeenNthCalledWith(
          2,
          'npm',
          ['install', '-g', 'rhachet@latest'],
          { stdio: 'inherit', shell: true },
        );
      });
    });

    when('[t1] install fails with EACCES', () => {
      then('throws error', () => {
        mockSpawnSync
          .mockReturnValueOnce({
            status: 1,
            stdout: Buffer.from(''),
            stderr: Buffer.from(''),
            pid: 1,
            output: [],
            signal: null,
          })
          .mockReturnValueOnce({
            status: 1,
            stdout: Buffer.from(''),
            stderr: Buffer.from('npm ERR! code EACCES'),
            pid: 1,
            output: [],
            signal: null,
          });

        expect(() => execNpmInstallGlobal({ packages: ['rhachet'] })).toThrow(
          'global install failed with exit code 1',
        );
      });
    });

    when('[t2] install fails with EPERM (Windows)', () => {
      then('throws error', () => {
        mockSpawnSync
          .mockReturnValueOnce({
            status: 1,
            stdout: Buffer.from(''),
            stderr: Buffer.from(''),
            pid: 1,
            output: [],
            signal: null,
          })
          .mockReturnValueOnce({
            status: 1,
            stdout: Buffer.from(''),
            stderr: Buffer.from('npm ERR! code EPERM'),
            pid: 1,
            output: [],
            signal: null,
          });

        expect(() => execNpmInstallGlobal({ packages: ['rhachet'] })).toThrow(
          'global install failed with exit code 1',
        );
      });
    });
  });
});
