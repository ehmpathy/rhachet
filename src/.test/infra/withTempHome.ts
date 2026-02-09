import { mkdirSync, rmSync } from 'node:fs';
import os from 'node:os';
import { join } from 'node:path';

/**
 * .what = provides isolated HOME directory for tests
 * .why = prevents host manifest tests from pollution of real ~/.rhachet
 */
export const withTempHome = (input: {
  /** subdirectory name for this test suite */
  name: string;
}): {
  /** absolute path to the temp home directory */
  path: string;
  /** call in beforeAll to setup temp home */
  setup: () => void;
  /** call in afterAll to restore real home */
  teardown: () => void;
} => {
  const tempHome = join(os.tmpdir(), 'rhachet-test', input.name);
  const originalHome = process.env.HOME;

  return {
    path: tempHome,

    setup: () => {
      // clean and create temp home
      rmSync(tempHome, { recursive: true, force: true });
      mkdirSync(tempHome, { recursive: true });
      // override HOME environment variable
      process.env.HOME = tempHome;
    },

    teardown: () => {
      // restore original HOME
      process.env.HOME = originalHome;
      // clean up temp home
      rmSync(tempHome, { recursive: true, force: true });
    },
  };
};
