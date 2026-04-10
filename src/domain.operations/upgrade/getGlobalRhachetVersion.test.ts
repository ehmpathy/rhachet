import { given, then, when } from 'test-fns';

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { getGlobalRhachetVersion } from './getGlobalRhachetVersion';

jest.mock('node:child_process', () => ({
  spawnSync: jest.fn(),
}));

jest.mock('node:fs', () => ({
  readFileSync: jest.fn(),
}));

const mockSpawnSync = spawnSync as jest.MockedFunction<typeof spawnSync>;
const mockReadFileSync = readFileSync as jest.MockedFunction<
  typeof readFileSync
>;

describe('getGlobalRhachetVersion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  given('[case1] rhachet installed globally via pnpm', () => {
    when('[t0] which rhx finds pnpm wrapper with version in path', () => {
      then('returns version from wrapper content', () => {
        // which rhx succeeds
        mockSpawnSync.mockReturnValue({
          status: 0,
          stdout: Buffer.from('/home/user/.local/share/pnpm/rhx'),
          stderr: Buffer.from(''),
          pid: 1,
          output: [],
          signal: null,
        });

        // pnpm wrapper contains path with version
        mockReadFileSync.mockReturnValue(`#!/bin/sh
basedir=$(dirname "$(echo "$0" | sed -e 's,\\\\,/,g')")
case \`uname\` in
    *CYGWIN*) basedir=\`cygpath -w "$basedir"\`;;
esac
exec node  "$basedir/../.pnpm/rhachet@1.39.11_@types+node@22.13.5/node_modules/rhachet/bin/rhx" "$@"
`);

        expect(getGlobalRhachetVersion()).toEqual('1.39.11');
      });
    });
  });

  given('[case2] rhachet installed globally via npm', () => {
    when(
      '[t0] which rhx finds symlink, realpath resolves to npm global',
      () => {
        then('returns version from package.json', () => {
          // which rhx succeeds
          mockSpawnSync.mockImplementation((cmd, args) => {
            if (cmd === 'which') {
              return {
                status: 0,
                stdout: Buffer.from('/usr/local/bin/rhx'),
                stderr: Buffer.from(''),
                pid: 1,
                output: [],
                signal: null,
              };
            }
            if (cmd === 'realpath') {
              return {
                status: 0,
                stdout: Buffer.from(
                  '/usr/local/lib/node_modules/rhachet/bin/rhx',
                ),
                stderr: Buffer.from(''),
                pid: 1,
                output: [],
                signal: null,
              };
            }
            return {
              status: 1,
              stdout: Buffer.from(''),
              stderr: Buffer.from(''),
              pid: 1,
              output: [],
              signal: null,
            };
          });

          // rhx file is a symlink (no version in content)
          // package.json has version
          mockReadFileSync.mockImplementation((path) => {
            if (String(path).endsWith('package.json')) {
              return JSON.stringify({ name: 'rhachet', version: '1.39.10' });
            }
            // rhx file content (symlink, no version pattern)
            return '#!/usr/bin/env node\nrequire("../dist/cli")';
          });

          expect(getGlobalRhachetVersion()).toEqual('1.39.10');
        });
      },
    );
  });

  given('[case3] rhachet not installed globally', () => {
    when('[t0] which rhx fails', () => {
      then('returns null', () => {
        mockSpawnSync.mockReturnValue({
          status: 1,
          stdout: Buffer.from(''),
          stderr: Buffer.from('rhx not found'),
          pid: 1,
          output: [],
          signal: null,
        });

        expect(getGlobalRhachetVersion()).toBeNull();
      });
    });
  });

  given('[case4] which succeeds but rhx file cannot be read', () => {
    when('[t0] readFileSync throws', () => {
      then('returns null', () => {
        mockSpawnSync.mockReturnValue({
          status: 0,
          stdout: Buffer.from('/usr/local/bin/rhx'),
          stderr: Buffer.from(''),
          pid: 1,
          output: [],
          signal: null,
        });

        mockReadFileSync.mockImplementation(() => {
          throw new Error('ENOENT: no such file');
        });

        expect(getGlobalRhachetVersion()).toBeNull();
      });
    });
  });

  given('[case5] which returns empty path', () => {
    when('[t0] stdout is empty', () => {
      then('returns null', () => {
        mockSpawnSync.mockReturnValue({
          status: 0,
          stdout: Buffer.from(''),
          stderr: Buffer.from(''),
          pid: 1,
          output: [],
          signal: null,
        });

        expect(getGlobalRhachetVersion()).toBeNull();
      });
    });
  });

  given('[case6] npm symlink but package.json not rhachet', () => {
    when('[t0] package.json has different name', () => {
      then('returns null', () => {
        mockSpawnSync.mockImplementation((cmd) => {
          if (cmd === 'which') {
            return {
              status: 0,
              stdout: Buffer.from('/usr/local/bin/rhx'),
              stderr: Buffer.from(''),
              pid: 1,
              output: [],
              signal: null,
            };
          }
          if (cmd === 'realpath') {
            return {
              status: 0,
              stdout: Buffer.from(
                '/usr/local/lib/node_modules/other-pkg/bin/rhx',
              ),
              stderr: Buffer.from(''),
              pid: 1,
              output: [],
              signal: null,
            };
          }
          return {
            status: 1,
            stdout: Buffer.from(''),
            stderr: Buffer.from(''),
            pid: 1,
            output: [],
            signal: null,
          };
        });

        mockReadFileSync.mockImplementation((path) => {
          if (String(path).endsWith('package.json')) {
            return JSON.stringify({ name: 'other-pkg', version: '1.0.0' });
          }
          return '#!/usr/bin/env node';
        });

        expect(getGlobalRhachetVersion()).toBeNull();
      });
    });
  });
});
