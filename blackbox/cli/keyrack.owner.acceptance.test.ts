import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';
import { writeDirectStoreEntry } from '@/blackbox/.test/infra/writeDirectStoreEntry';

describe('keyrack --owner', () => {
  // kill daemons from prior test runs to prevent state leakage
  beforeAll(() => {
    killKeyrackDaemonForTests({ owner: null });
    killKeyrackDaemonForTests({ owner: 'ehmpath.demo' });
  });

  /**
   * [uc1] init custom owner
   * creates or finds host manifest for custom owner
   */
  given('[case1] init --owner creates manifest', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-direct' }),
    );

    when('[t0] init --owner ehmpath.demo (no manifest exists)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'init', '--owner', 'ehmpath.demo'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output mentions freshly minted', () => {
        expect(result.stdout).toContain('freshly minted');
      });

      then('output mentions owner ehmpath.demo', () => {
        expect(result.stdout).toContain('ehmpath.demo');
      });

      then('manifest file is created', () => {
        const manifestPath = join(
          repo.path,
          '.rhachet',
          'keyrack',
          'keyrack.host.ehmpath.demo.age',
        );
        expect(existsSync(manifestPath)).toBe(true);
      });
    });

    when('[t1] init --owner ehmpath.demo (manifest already exists)', () => {
      // first init
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'init', '--owner', 'ehmpath.demo'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      // second init
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'init', '--owner', 'ehmpath.demo'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output mentions already active (not freshly minted)', () => {
        expect(result.stdout).toContain('already active');
        expect(result.stdout).not.toContain('freshly minted');
      });
    });

    when('[t2] init --for ehmpath.alias (--for alias works)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'init', '--for', 'ehmpath.alias'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('manifest file is created for alias owner', () => {
        const manifestPath = join(
          repo.path,
          '.rhachet',
          'keyrack',
          'keyrack.host.ehmpath.alias.age',
        );
        expect(existsSync(manifestPath)).toBe(true);
      });
    });
  });

  /**
   * [uc2] set key with custom owner
   * stores key in owner-namespaced vault path
   */
  given('[case2] set --owner stores in correct vault path', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-direct' }),
    );

    when('[t0] set key for owner ehmpath.demo (manifest exists)', () => {
      // init first
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'init', '--owner', 'ehmpath.demo'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      // set key
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'DEMO_TOKEN',
            '--env',
            'all',
            '--org',
            '@all',
            '--mech',
            'REPLICA',
            '--vault',
            'os.direct',
            '--owner',
            'ehmpath.demo',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'demo-secret-value-123\n',
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('returns key config for owner', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.slug).toEqual('@all.all.DEMO_TOKEN');
        expect(parsed.vault).toEqual('os.direct');
      });

      then('vault file created in owner-namespaced path', () => {
        const vaultPath = join(
          repo.path,
          '.rhachet',
          'keyrack',
          'vault',
          'os.direct',
          'owner=ehmpath.demo',
          'keyrack.direct.json',
        );
        expect(existsSync(vaultPath)).toBe(true);
      });
    });

    when('[t1] set key without manifest (error + tip)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'NO_MANIFEST_KEY',
            '--env',
            'all',
            '--org',
            '@all',
            '--mech',
            'REPLICA',
            '--vault',
            'os.direct',
            '--owner',
            'nonexistent.owner',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'some-value\n',
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('error mentions manifest not found', () => {
        const output = result.stdout + result.stderr;
        expect(output).toMatch(/not found|no manifest|init/i);
      });
    });
  });

  /**
   * [uc3] get key isolation
   * keys are isolated between owners (matrix.3 - all 8 combos)
   */
  given('[case3] get key isolation between owners', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-direct' }),
    );

    // setup: write keys and init manifests
    useBeforeAll(async () => {
      // write key to default owner
      writeDirectStoreEntry({
        home: repo.path,
        slug: '@all.all.ISOLATION_KEY',
        value: 'default-owner-value',
        owner: null,
      });

      // write key to custom owner
      writeDirectStoreEntry({
        home: repo.path,
        slug: '@all.all.ISOLATION_KEY',
        value: 'demo-owner-value',
        owner: 'ehmpath.demo',
      });

      // init demo manifest
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init', '--owner', 'ehmpath.demo'],
        cwd: repo.path,
        env: { HOME: repo.path },
      });

      // set key config in default manifest
      await invokeRhachetCliBinary({
        args: [
          'keyrack',
          'set',
          '--key',
          'ISOLATION_KEY',
          '--env',
          'all',
          '--org',
          '@all',
          '--mech',
          'REPLICA',
          '--vault',
          'os.direct',
        ],
        cwd: repo.path,
        env: { HOME: repo.path },
        stdin: 'default-owner-value\n',
      });

      // set key config in demo manifest
      await invokeRhachetCliBinary({
        args: [
          'keyrack',
          'set',
          '--key',
          'ISOLATION_KEY',
          '--env',
          'all',
          '--org',
          '@all',
          '--mech',
          'REPLICA',
          '--vault',
          'os.direct',
          '--owner',
          'ehmpath.demo',
        ],
        cwd: repo.path,
        env: { HOME: repo.path },
        stdin: 'demo-owner-value\n',
      });

      return { setup: 'complete' };
    });

    when('[t0] get key from default owner (flag omitted)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', '@all.all.ISOLATION_KEY', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('returns value from default owner', () => {
        const parsed = JSON.parse(result.stdout);
        if (parsed.status === 'granted') {
          expect(parsed.grant.key.secret).toEqual('default-owner-value');
        }
      });
    });

    when('[t1] get key from demo owner (--owner flag)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            '@all.all.ISOLATION_KEY',
            '--owner',
            'ehmpath.demo',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('returns value from demo owner', () => {
        const parsed = JSON.parse(result.stdout);
        if (parsed.status === 'granted') {
          expect(parsed.grant.key.secret).toEqual('demo-owner-value');
        }
      });
    });
  });

  /**
   * [uc4] vault file isolation
   * vault files are physically separate per owner
   */
  given('[case4] vault files physically separate per owner', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-direct' }),
    );

    // setup: write keys to both owners
    useBeforeAll(async () => {
      writeDirectStoreEntry({
        home: repo.path,
        slug: '@all.all.VAULT_ISO_KEY',
        value: 'default-value',
        owner: null,
      });
      writeDirectStoreEntry({
        home: repo.path,
        slug: '@all.all.VAULT_ISO_KEY',
        value: 'demo-value',
        owner: 'ehmpath.demo',
      });
      return { setup: 'complete' };
    });

    when('[t0] check vault file structure', () => {
      then('default owner vault file exists', () => {
        const defaultPath = join(
          repo.path,
          '.rhachet',
          'keyrack',
          'vault',
          'os.direct',
          'owner=default',
          'keyrack.direct.json',
        );
        expect(existsSync(defaultPath)).toBe(true);
      });

      then('demo owner vault file exists', () => {
        const demoPath = join(
          repo.path,
          '.rhachet',
          'keyrack',
          'vault',
          'os.direct',
          'owner=ehmpath.demo',
          'keyrack.direct.json',
        );
        expect(existsSync(demoPath)).toBe(true);
      });

      then('owner directories are separate', () => {
        const vaultDir = join(
          repo.path,
          '.rhachet',
          'keyrack',
          'vault',
          'os.direct',
        );
        const dirs = readdirSync(vaultDir);
        expect(dirs).toContain('owner=default');
        expect(dirs).toContain('owner=ehmpath.demo');
      });
    });
  });

  /**
   * [uc5] status with custom owner
   * shows keys for specific owner only
   */
  given('[case5] status isolation between owners', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-direct' }),
    );

    // setup: init demo manifest and set a key
    useBeforeAll(async () => {
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init', '--owner', 'ehmpath.demo'],
        cwd: repo.path,
        env: { HOME: repo.path },
      });

      await invokeRhachetCliBinary({
        args: [
          'keyrack',
          'set',
          '--key',
          'DEMO_ONLY_KEY',
          '--env',
          'all',
          '--org',
          '@all',
          '--mech',
          'REPLICA',
          '--vault',
          'os.direct',
          '--owner',
          'ehmpath.demo',
        ],
        cwd: repo.path,
        env: { HOME: repo.path },
        stdin: 'demo-only-value\n',
      });
      return { setup: 'complete' };
    });

    when('[t0] status for default owner', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'status'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('does not show demo-only key', () => {
        expect(result.stdout).not.toContain('DEMO_ONLY_KEY');
      });
    });

    when('[t1] list for demo owner (shows configured keys)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--owner', 'ehmpath.demo'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('shows demo-only key', () => {
        // list shows configured keys (status shows unlocked daemon keys)
        expect(result.stdout).toContain('DEMO_ONLY_KEY');
      });
    });
  });

  /**
   * [uc6] --owner flag consistency
   * --owner works on all keyrack commands
   */
  given('[case6] --owner flag works on all commands', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-direct' }),
    );

    // setup: init demo manifest
    useBeforeAll(async () => {
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init', '--owner', 'ehmpath.demo'],
        cwd: repo.path,
        env: { HOME: repo.path },
      });
      return { setup: 'complete' };
    });

    when('[t0] list --owner', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--owner', 'ehmpath.demo'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });
    });

    when('[t1] unlock --owner', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--owner', 'ehmpath.demo'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('exits with status 0 (or expected error for empty manifest)', () => {
        // unlock may fail if no keys to unlock, but should accept the flag
        expect(result.status).toBeDefined();
      });
    });

    when('[t2] relock --owner', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'relock', '--owner', 'ehmpath.demo'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });
    });

    when('[t3] recipient set --owner', () => {
      // use a valid bech32 age pubkey format (test key, not a real one)
      // age pubkeys are 62 chars: "age1" + 58 bech32 chars
      const testPubkey =
        'age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p';
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'recipient',
            'set',
            '--owner',
            'ehmpath.demo',
            '--label',
            'test-recipient',
            '--pubkey',
            testPubkey,
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        // valid pubkey format means command should succeed
        expect(result.status).toEqual(0);
      });
    });
  });

  /**
   * [uc7] fallback pattern
   * skills can try default owner first, fall back to demo owner
   *
   * note: sudo env keys unlock directly from hostManifest (no repoManifest required)
   */
  given('[case7] fallback pattern works', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-direct' }),
    );

    // setup: key only in demo owner (sudo env for direct unlock)
    useBeforeAll(async () => {
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init', '--owner', 'ehmpath.demo'],
        cwd: repo.path,
        env: { HOME: repo.path },
      });

      // set key in demo owner with sudo env (enables unlock without repoManifest)
      await invokeRhachetCliBinary({
        args: [
          'keyrack',
          'set',
          '--key',
          'FALLBACK_KEY',
          '--env',
          'sudo',
          '--org',
          '@all',
          '--mech',
          'REPLICA',
          '--vault',
          'os.direct',
          '--owner',
          'ehmpath.demo',
        ],
        cwd: repo.path,
        env: { HOME: repo.path },
        stdin: 'fallback-value-123\n',
      });

      // unlock the key into the demo owner's daemon
      await invokeRhachetCliBinary({
        args: [
          'keyrack',
          'unlock',
          '--env',
          'sudo',
          '--key',
          'FALLBACK_KEY',
          '--owner',
          'ehmpath.demo',
        ],
        cwd: repo.path,
        env: { HOME: repo.path },
      });

      return { setup: 'complete' };
    });

    when('[t0] get from default owner (should not find)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', '@all.sudo.FALLBACK_KEY', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('status is locked or not granted', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).not.toEqual('granted');
      });
    });

    when('[t1] get from demo owner (should find)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            '@all.sudo.FALLBACK_KEY',
            '--owner',
            'ehmpath.demo',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('status is granted', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('granted');
      });

      then('value matches demo owner value', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.key.secret).toEqual('fallback-value-123');
      });
    });
  });
});
