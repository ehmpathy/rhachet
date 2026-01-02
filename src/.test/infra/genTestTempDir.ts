import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * .what = creates a managed temp test directory with cwd switching
 * .why = standardizes test directory setup/teardown across integration tests
 */
export const genTestTempDir = (input: {
  /** base directory (typically __dirname) */
  base: string;
  /** subdirectory name under .temp */
  name: string;
}): {
  /** absolute path to the test directory */
  path: string;
  /** call in beforeAll to setup directory and switch cwd */
  setup: () => void;
  /** call in afterAll to restore original cwd */
  teardown: () => void;
  /** call to remove a file or directory within the test dir */
  rm: (relativePath: string) => void;
} => {
  const testDir = resolve(input.base, './.temp', input.name);
  const originalCwd = process.cwd();

  return {
    path: testDir,

    setup: () => {
      rmSync(testDir, { recursive: true, force: true });
      mkdirSync(testDir, { recursive: true });
      process.chdir(testDir);
    },

    teardown: () => {
      process.chdir(originalCwd);
    },

    rm: (relativePath: string) => {
      rmSync(resolve(testDir, relativePath), { force: true, recursive: true });
    },
  };
};
