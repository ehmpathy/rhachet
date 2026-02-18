import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/accept.blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/accept.blackbox/.test/infra/invokeRhachetCliBinary';

describe('keyrack vault os.secure', () => {
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

    when('[t0] keyrack set --key NEW_KEY --mech REPLICA --vault os.secure', () => {
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
            'REPLICA',
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
        expect(parsed.mech).toEqual('REPLICA');
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
            'REPLICA',
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
   * [uc3] unlock command with os.secure vault
   * session-based unlock sends keys to daemon
   */
  given('[case3] repo with os.secure vault', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-secure' }),
    );

    when('[t0] keyrack unlock --passphrase', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'test', '--passphrase', 'test-passphrase-123'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output contains unlocked indicator', () => {
        const output = result.stdout + result.stderr;
        expect(output).toMatch(/unlock|keys/i);
      });
    });
  });

  /**
   * [uc4] get with recipient key available grants via os.secure
   * recipient-based encryption means os.secure can decrypt when recipient key is present
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

    when('[t0] keyrack get --key SECURE_API_KEY (recipient key auto-decrypts)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.SECURE_API_KEY', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('returns granted status', () => {
        const parsed = JSON.parse(result.stdout);
        // recipient key is available so os.secure can decrypt directly
        expect(parsed.status).toEqual('granted');
      });

      then('grant contains the credential value', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.key.secret).toEqual('portable-secure-value-xyz789');
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
            'REPLICA',
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
        expect(parsed.mech).toEqual('REPLICA');
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
   * [uc6] portability: pre-encrypted .age file can be read
   * proves that age encryption is portable across systems
   *
   * the pre-encrypted fixture exists at .rhachet/keyrack/vault/os.secure/949203795e1e45ae.age
   * passphrase: test-passphrase-123, value: portable-secure-value-xyz789
   */
  given('[case6] repo with pre-encrypted .age fixture', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-secure' }),
    );

    when('[t0] get SECURE_API_KEY with KEYRACK_PASSPHRASE env', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.SECURE_API_KEY', '--json'],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            KEYRACK_PASSPHRASE: 'test-passphrase-123',
          },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('status is granted', () => {
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
