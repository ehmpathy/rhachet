import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

describe('keyrack vault os.secure', () => {
  // kill daemon from prior test runs to prevent state leakage
  beforeAll(() => killKeyrackDaemonForTests({ owner: null }));
  /**
   * [uc1] list command with os.secure vault
   * shows configured keys with vault type
   */
  given('[case1] repo with os.secure vault configured', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-secure' }),
    );

    when('[t0] keyrack list --json', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output is valid json', () => {
        expect(() => JSON.parse(result.stdout)).not.toThrow();
      });

      then('json contains SECURE_API_KEY with os.secure vault', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed['testorg.test.SECURE_API_KEY']).toBeDefined();
        expect(parsed['testorg.test.SECURE_API_KEY'].vault).toEqual('os.secure');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        // redact timestamps for stable snapshots
        const snapped = Object.fromEntries(
          Object.entries(parsed).map(([k, v]: [string, any]) => [
            k,
            { ...(v as Record<string, unknown>), createdAt: '__TIMESTAMP__', updatedAt: '__TIMESTAMP__' },
          ]),
        );
        expect(snapped).toMatchSnapshot();
      });
    });

    when('[t1] keyrack list (human readable)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'list'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output contains SECURE_API_KEY', () => {
        expect(result.stdout).toContain('SECURE_API_KEY');
      });

      then('output contains os.secure', () => {
        expect(result.stdout).toContain('os.secure');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc2] set command creates new os.secure host entry
   */
  given('[case2] repo without host entry for a key', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-secure' }),
    );

    when('[t0] keyrack set --key NEW_KEY --mech PERMANENT_VIA_REPLICA --vault os.secure', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'NEW_KEY',
            '--env',
            'test',
            '--mech',
            'PERMANENT_VIA_REPLICA',
            '--vault',
            'os.secure',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'test-new-key-value\n',
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output contains configured key', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.slug).toEqual('testorg.test.NEW_KEY');
        expect(parsed.mech).toEqual('PERMANENT_VIA_REPLICA');
        expect(parsed.vault).toEqual('os.secure');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        // redact timestamps for stable snapshots
        const snapped = {
          ...parsed,
          createdAt: '__TIMESTAMP__',
          updatedAt: '__TIMESTAMP__',
        };
        expect(snapped).toMatchSnapshot();
      });
    });

    when('[t1] keyrack list after set', () => {
      // first set the key
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'ANOTHER_SECURE_KEY',
            '--env',
            'test',
            '--mech',
            'PERMANENT_VIA_REPLICA',
            '--vault',
            'os.secure',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'test-another-secure-value\n',
        }),
      );

      const listResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('list shows the new key', () => {
        const parsed = JSON.parse(listResult.stdout);
        expect(parsed['testorg.test.ANOTHER_SECURE_KEY']).toBeDefined();
        expect(parsed['testorg.test.ANOTHER_SECURE_KEY'].vault).toEqual('os.secure');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(listResult.stdout);
        // redact timestamps for stable snapshots
        const snapped = Object.fromEntries(
          Object.entries(parsed).map(([k, v]: [string, any]) => [
            k,
            { ...(v as Record<string, unknown>), createdAt: '__TIMESTAMP__', updatedAt: '__TIMESTAMP__' },
          ]),
        );
        expect(snapped).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc3] --passphrase flag is deprecated
   * passphrase auth was removed in favor of identity-based (--prikey) auth
   */
  given('[case3] repo with os.secure vault', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-secure' }),
    );

    when('[t0] keyrack unlock --passphrase', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'unlock',
            '--env',
            'test',
            '--passphrase',
            'test-passphrase-123',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('error indicates --passphrase is not recognized', () => {
        const output = result.stdout + result.stderr;
        expect(output).toMatch(/unknown option.*--passphrase/i);
      });
    });
  });

  /**
   * [uc4] get requires unlock — vault keys are locked by default
   * even with recipient key available, explicit unlock is required
   */
  given('[case4] repo with os.secure vault (recipient key available)', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-secure' }),
    );

    // cleanup: relock to ensure daemon is empty for this test
    useBeforeAll(async () =>
      invokeRhachetCliBinary({
        args: ['keyrack', 'relock'],
        cwd: repo.path,
        env: { HOME: repo.path },
        logOnError: false,
      }),
    );

    when('[t0] keyrack get --key SECURE_API_KEY without unlock', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.SECURE_API_KEY', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('status is locked (vault keys require unlock)', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('locked');
      });

      then('secret is not exposed', () => {
        expect(result.stdout).not.toContain('portable-secure-value-xyz789');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });

    when('[t1] unlock then get --key SECURE_API_KEY (roundtrip)', () => {
      // unlock vault keys into daemon
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'test'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.SECURE_API_KEY', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('status is granted after unlock', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('granted');
      });

      then('grant contains the credential value', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.key.secret).toEqual('portable-secure-value-xyz789');
      });

      then('grant source vault is os.secure (preserves original vault)', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.source.vault).toEqual('os.secure');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc5] findsert semantics with os.secure
   * set key that already has same attrs returns found
   */
  given('[case5] findsert semantics', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-secure' }),
    );

    when('[t0] set key that already has same attrs', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'SECURE_API_KEY',
            '--env',
            'test',
            '--mech',
            'PERMANENT_VIA_REPLICA',
            '--vault',
            'os.secure',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'unused-findsert-value\n',
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('returns found host config', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.slug).toEqual('testorg.test.SECURE_API_KEY');
        expect(parsed.mech).toEqual('PERMANENT_VIA_REPLICA');
        expect(parsed.vault).toEqual('os.secure');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        // redact timestamps for stable snapshots
        const snapped = {
          ...parsed,
          createdAt: '__TIMESTAMP__',
          updatedAt: '__TIMESTAMP__',
        };
        expect(snapped).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc6] lost key: host manifest points to vault but vault no longer has key
   * unlock should report key as "lost" (not throw error)
   */
  given('[case6] key lost from vault', () => {
    // kill daemon to prevent state leakage from prior cases
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-secure' }),
    );

    when('[t0] unlock after vault secret deleted', () => {
      // delete the .age file to simulate "lost" key (vault no longer has it)
      useBeforeAll(async () => {
        const fs = await import('fs/promises');
        const path = await import('path');
        const vaultDir = path.join(
          repo.path,
          '.rhachet/keyrack/vault/os.secure/owner=default',
        );
        const files = await fs.readdir(vaultDir);
        for (const file of files) {
          if (file.endsWith('.age')) {
            await fs.unlink(path.join(vaultDir, file));
          }
        }
        return {};
      });

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'test'],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            KEYRACK_PASSPHRASE: 'test-passphrase-123',
          },
        }),
      );

      then('exits with status 0 (graceful omit)', () => {
        expect(result.status).toEqual(0);
      });

      then('output contains lost indicator', () => {
        expect(result.stdout).toContain('lost');
        expect(result.stdout).toContain('👻');
      });

      then('output shows key slug', () => {
        expect(result.stdout).toContain('SECURE_API_KEY');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] get after unlock reports lost key as locked', () => {
      // delete the .age file first
      useBeforeAll(async () => {
        const fs = await import('fs/promises');
        const path = await import('path');
        const vaultDir = path.join(
          repo.path,
          '.rhachet/keyrack/vault/os.secure/owner=default',
        );
        const files = await fs.readdir(vaultDir);
        for (const file of files) {
          if (file.endsWith('.age')) {
            await fs.unlink(path.join(vaultDir, file));
          }
        }
        return {};
      });

      // unlock (will report lost)
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'test'],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            KEYRACK_PASSPHRASE: 'test-passphrase-123',
          },
        }),
      );

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.SECURE_API_KEY', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('status is absent (vault lost key, must re-set)', () => {
        const parsed = JSON.parse(result.stdout);
        // key was not unlocked (lost) → get returns "absent" (not "locked")
        // .note = "absent" is correct because unlock can't help — key is gone from vault
        expect(parsed.status).toEqual('absent');
      });
    });
  });

  /**
   * [uc7] portability: pre-encrypted .age file can be read after unlock
   * proves that age encryption is portable across systems
   *
   * the pre-encrypted fixture exists at .rhachet/keyrack/vault/os.secure/949203795e1e45ae.age
   * passphrase: test-passphrase-123, value: portable-secure-value-xyz789
   */
  given('[case7] repo with pre-encrypted .age fixture', () => {
    // kill daemon to prevent state leakage from prior cases (case3/case4 do unlock)
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-secure' }),
    );

    when('[t0] get SECURE_API_KEY without unlock', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.SECURE_API_KEY', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('status is locked (vault keys require unlock)', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('locked');
      });
    });

    when('[t1] unlock with KEYRACK_PASSPHRASE then get', () => {
      // unlock with passphrase env to decrypt vault
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'test'],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            KEYRACK_PASSPHRASE: 'test-passphrase-123',
          },
        }),
      );

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.SECURE_API_KEY', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('status is granted after unlock', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('granted');
      });

      then('value matches pre-encrypted fixture value', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.key.secret).toEqual('portable-secure-value-xyz789');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });
  });
});
