import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { given, then, when } from 'test-fns';

import {
  createTestHomeWithSshKey,
  withTestHomeWithSshKey,
} from './withTestHomeWithSshKey';

describe('withTestHomeWithSshKey', () => {
  given('[case0] callback style', () => {
    when('[t0] callback is invoked', () => {
      then('temp HOME is set', async () => {
        const originalHome = process.env.HOME;

        await withTestHomeWithSshKey(
          { name: 'test-home-with-ssh-key' },
          async (home) => {
            expect(process.env.HOME).toBe(home);
            expect(process.env.HOME).not.toBe(originalHome);
          },
        );
      });

      then('ssh key exists at ~/.ssh/id_ed25519', async () => {
        await withTestHomeWithSshKey(
          { name: 'test-home-with-ssh-key' },
          async (home) => {
            const keyPath = join(home, '.ssh', 'id_ed25519');
            expect(existsSync(keyPath)).toBe(true);
          },
        );
      });

      then('ssh pubkey exists at ~/.ssh/id_ed25519.pub', async () => {
        await withTestHomeWithSshKey(
          { name: 'test-home-with-ssh-key' },
          async (home) => {
            const pubkeyPath = join(home, '.ssh', 'id_ed25519.pub');
            expect(existsSync(pubkeyPath)).toBe(true);
          },
        );
      });

      then('private key has 0600 permissions', async () => {
        await withTestHomeWithSshKey(
          { name: 'test-home-with-ssh-key' },
          async (home) => {
            const keyPath = join(home, '.ssh', 'id_ed25519');
            const stats = statSync(keyPath);
            const mode = stats.mode & 0o777;
            expect(mode).toBe(0o600);
          },
        );
      });

      then('pubkey has ed25519 format', async () => {
        await withTestHomeWithSshKey(
          { name: 'test-home-with-ssh-key' },
          async (home) => {
            const pubkeyPath = join(home, '.ssh', 'id_ed25519.pub');
            const pubkey = readFileSync(pubkeyPath, 'utf-8');
            expect(pubkey).toMatch(/^ssh-ed25519 /);
          },
        );
      });
    });

    when('[t1] callback completes', () => {
      then('original HOME is restored', async () => {
        const originalHome = process.env.HOME;

        await withTestHomeWithSshKey(
          { name: 'test-home-with-ssh-key-restore' },
          async () => {
            // inside callback, HOME is different
          },
        );

        expect(process.env.HOME).toBe(originalHome);
      });

      then('temp directory is cleaned up', async () => {
        let capturedHome = '';

        await withTestHomeWithSshKey(
          { name: 'test-home-with-ssh-key-cleanup' },
          async (home) => {
            capturedHome = home;
            expect(existsSync(home)).toBe(true);
          },
        );

        expect(existsSync(capturedHome)).toBe(false);
      });
    });
  });

  given('[case1] hook style (createTestHomeWithSshKey)', () => {
    const testHome = createTestHomeWithSshKey({
      name: 'test-home-hook-style',
    });

    beforeAll(async () => testHome.setup());
    afterAll(() => testHome.teardown());

    when('[t0] setup is called', () => {
      then('temp HOME is set', () => {
        expect(process.env.HOME).toBe(testHome.path);
      });

      then('ssh key exists at ~/.ssh/id_ed25519', () => {
        const keyPath = join(testHome.path, '.ssh', 'id_ed25519');
        expect(existsSync(keyPath)).toBe(true);
      });
    });
  });
});
