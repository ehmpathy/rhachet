import { copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import { genTempDirPhysical } from './genTempDirPhysical';
import { TEST_SSH_KEY_PATH, TEST_SSH_PUBKEY_PATH } from './withTestSshAgent';

/**
 * .what = creates temp HOME with test ssh key in .ssh/id_ed25519
 * .why = enables tests for default ssh key discovery without system pollution
 *
 * the test key is copied to ~/.ssh/id_ed25519 so that keyrack's default
 * discovery logic finds it without explicit --pubkey flag.
 */
export const withTestHomeWithSshKey = async <T>(
  input: { name: string },
  fn: (home: string) => Promise<T>,
): Promise<T> => {
  const tempHome = genTempDirPhysical({ slug: `home-${input.name}` });
  const originalHome = process.env.HOME;

  // create .ssh within the fresh temp home
  mkdirSync(join(tempHome, '.ssh'), { recursive: true });

  // copy test key to standard locations
  copyFileSync(TEST_SSH_KEY_PATH, join(tempHome, '.ssh', 'id_ed25519'));
  copyFileSync(TEST_SSH_PUBKEY_PATH, join(tempHome, '.ssh', 'id_ed25519.pub'));

  // set permissions (private key must be 0600)
  const fs = await import('node:fs/promises');
  await fs.chmod(join(tempHome, '.ssh', 'id_ed25519'), 0o600);
  await fs.chmod(join(tempHome, '.ssh', 'id_ed25519.pub'), 0o644);

  try {
    // override HOME
    process.env.HOME = tempHome;

    // run the test function
    return await fn(tempHome);
  } finally {
    // restore original HOME
    process.env.HOME = originalHome;

    // remove the home at once, as this fixture promises its callers; the run's globalTeardown
    // reclaims it regardless, so this is an early release, never the only reclaim
    rmSync(tempHome, { recursive: true, force: true });
  }
};

/**
 * .what = jest-style hooks for withTestHomeWithSshKey
 * .why = some tests prefer beforeAll/afterAll pattern over callback
 */
export const createTestHomeWithSshKey = (input: { name: string }): {
  path: string;
  setup: () => Promise<void>;
  teardown: () => void;
} => {
  const tempHome = genTempDirPhysical({ slug: `home-${input.name}` });
  let originalHome: string | undefined;

  return {
    path: tempHome,

    setup: async () => {
      originalHome = process.env.HOME;

      // create .ssh within the fresh temp home
      mkdirSync(join(tempHome, '.ssh'), { recursive: true });

      // copy test key to standard locations
      copyFileSync(TEST_SSH_KEY_PATH, join(tempHome, '.ssh', 'id_ed25519'));
      copyFileSync(
        TEST_SSH_PUBKEY_PATH,
        join(tempHome, '.ssh', 'id_ed25519.pub'),
      );

      // set permissions (private key must be 0600)
      const fs = await import('node:fs/promises');
      await fs.chmod(join(tempHome, '.ssh', 'id_ed25519'), 0o600);
      await fs.chmod(join(tempHome, '.ssh', 'id_ed25519.pub'), 0o644);

      // override HOME
      process.env.HOME = tempHome;
    },

    teardown: () => {
      // restore original HOME
      process.env.HOME = originalHome;

      // remove the home at once, as this fixture promises its callers; the run's globalTeardown
      // reclaims it regardless, so this is an early release, never the only reclaim
      rmSync(tempHome, { recursive: true, force: true });
    },
  };
};
