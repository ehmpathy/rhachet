import { genTempDir, given, then, when } from 'test-fns';

import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { daoKeyrackInventory } from './index';

describe('daoKeyrackInventory', () => {
  // isolate HOME to temp directory for each test run
  const tempDir = genTempDir({ slug: 'daoKeyrackInventory' });
  const originalHome = process.env.HOME;

  beforeEach(() => {
    process.env.HOME = tempDir;
  });

  afterAll(() => {
    process.env.HOME = originalHome;
  });

  given('[case1] inventory entry does not exist', () => {
    when('[t0] exists is called', () => {
      then('returns false', async () => {
        const result = await daoKeyrackInventory.exists({
          slug: 'ehmpathy.prep.AWS_PROFILE',
          owner: null,
        });
        expect(result).toBe(false);
      });
    });
  });

  given('[case2] inventory entry is created', () => {
    when('[t0] set is called', () => {
      then('creates directory and file', async () => {
        await daoKeyrackInventory.set({
          slug: 'ehmpathy.prep.AWS_PROFILE',
          owner: 'ehmpath',
        });

        const inventoryDir = join(
          tempDir,
          '.rhachet',
          'keyrack',
          'inventory',
          'owner=ehmpath',
        );
        expect(existsSync(inventoryDir)).toBe(true);
      });
    });

    when('[t1] exists is called after set', () => {
      then('returns true', async () => {
        await daoKeyrackInventory.set({
          slug: 'ehmpathy.prep.AWS_PROFILE',
          owner: 'ehmpath',
        });

        const result = await daoKeyrackInventory.exists({
          slug: 'ehmpathy.prep.AWS_PROFILE',
          owner: 'ehmpath',
        });
        expect(result).toBe(true);
      });
    });

    when('[t2] set is called again (idempotent)', () => {
      then('no error (re-set is no-op)', async () => {
        await daoKeyrackInventory.set({
          slug: 'ehmpathy.prep.AWS_PROFILE',
          owner: 'ehmpath',
        });

        // second set should not throw
        await expect(
          daoKeyrackInventory.set({
            slug: 'ehmpathy.prep.AWS_PROFILE',
            owner: 'ehmpath',
          }),
        ).resolves.not.toThrow();
      });
    });
  });

  given('[case3] inventory entry is deleted', () => {
    when('[t0] del is called after set', () => {
      then('removes file', async () => {
        await daoKeyrackInventory.set({
          slug: 'ehmpathy.test.DEL_KEY',
          owner: null,
        });

        // verify it was created
        expect(
          await daoKeyrackInventory.exists({
            slug: 'ehmpathy.test.DEL_KEY',
            owner: null,
          }),
        ).toBe(true);

        // delete it
        await daoKeyrackInventory.del({
          slug: 'ehmpathy.test.DEL_KEY',
          owner: null,
        });

        // verify it was removed
        expect(
          await daoKeyrackInventory.exists({
            slug: 'ehmpathy.test.DEL_KEY',
            owner: null,
          }),
        ).toBe(false);
      });
    });

    when('[t1] del is called when entry absent (idempotent)', () => {
      then('no error (re-del is no-op)', async () => {
        await expect(
          daoKeyrackInventory.del({
            slug: 'ehmpathy.test.NONEXTANT',
            owner: null,
          }),
        ).resolves.not.toThrow();
      });
    });
  });

  given('[case4] owner is null', () => {
    when('[t0] set is called with owner=null', () => {
      then('uses owner=default directory', async () => {
        await daoKeyrackInventory.set({
          slug: 'ehmpathy.test.DEFAULT_OWNER',
          owner: null,
        });

        const inventoryDir = join(
          tempDir,
          '.rhachet',
          'keyrack',
          'inventory',
          'owner=default',
        );
        expect(existsSync(inventoryDir)).toBe(true);
      });
    });
  });

  given('[case5] HOME is not set', () => {
    when('[t0] set is called without HOME', () => {
      then('throws UnexpectedCodePathError', async () => {
        const savedHome = process.env.HOME;
        delete process.env.HOME;

        try {
          await expect(
            daoKeyrackInventory.set({
              slug: 'ehmpathy.test.NO_HOME',
              owner: null,
            }),
          ).rejects.toThrow('HOME not set');
        } finally {
          process.env.HOME = savedHome;
        }
      });
    });
  });

  given('[case6] security: .stocked file is empty (usecase.7)', () => {
    when('[t0] set is called', () => {
      then('creates empty file (zero bytes)', async () => {
        await daoKeyrackInventory.set({
          slug: 'ehmpathy.test.SECURITY_CHECK',
          owner: 'ehmpath',
        });

        // find the .stocked file
        const inventoryDir = join(
          tempDir,
          '.rhachet',
          'keyrack',
          'inventory',
          'owner=ehmpath',
        );

        // read all files in directory to find the .stocked file
        const files = require('node:fs').readdirSync(inventoryDir);
        const stockedFile = files.find((f: string) => f.endsWith('.stocked'));
        expect(stockedFile).toBeDefined();

        // verify file is empty
        const content = readFileSync(join(inventoryDir, stockedFile), 'utf8');
        expect(content).toEqual('');
      });
    });
  });

  given('[case7] file permissions', () => {
    when('[t0] set is called', () => {
      then('creates file with mode 0o600', async () => {
        await daoKeyrackInventory.set({
          slug: 'ehmpathy.test.PERMISSIONS',
          owner: 'ehmpath',
        });

        const inventoryDir = join(
          tempDir,
          '.rhachet',
          'keyrack',
          'inventory',
          'owner=ehmpath',
        );

        const files = require('node:fs').readdirSync(inventoryDir);
        const stockedFile = files.find((f: string) => f.endsWith('.stocked'));

        const stats = statSync(join(inventoryDir, stockedFile));
        // mode is octal, mask with 0o777 to get permissions
        const permissions = stats.mode & 0o777;
        expect(permissions).toEqual(0o600);
      });
    });
  });

  given('[case8] directory permissions', () => {
    when('[t0] set is called', () => {
      then('creates directory with mode 0o700', async () => {
        await daoKeyrackInventory.set({
          slug: 'ehmpathy.test.DIRPERMISSIONS',
          owner: 'ehmpath',
        });

        const inventoryDir = join(
          tempDir,
          '.rhachet',
          'keyrack',
          'inventory',
          'owner=ehmpath',
        );

        const stats = statSync(inventoryDir);
        // mode is octal, mask with 0o777 to get permissions
        const permissions = stats.mode & 0o777;
        expect(permissions).toEqual(0o700);
      });
    });
  });
});
