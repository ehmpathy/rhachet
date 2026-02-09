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
        expect(parsed.SECURE_API_KEY).toBeDefined();
        expect(parsed.SECURE_API_KEY.vault).toEqual('os.secure');
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
            '--mech',
            'REPLICA',
            '--vault',
            'os.secure',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output contains configured key', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.slug).toEqual('NEW_KEY');
        expect(parsed.mech).toEqual('REPLICA');
        expect(parsed.vault).toEqual('os.secure');
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
            '--mech',
            'REPLICA',
            '--vault',
            'os.secure',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
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
        expect(parsed.ANOTHER_SECURE_KEY).toBeDefined();
        expect(parsed.ANOTHER_SECURE_KEY.vault).toEqual('os.secure');
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
          args: ['keyrack', 'unlock', '--passphrase', 'test-passphrase-123'],
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
   * [uc4] get without unlock shows key absent
   * credential cannot be retrieved when daemon is empty and no passphrase provided
   */
  given('[case4] repo with os.secure vault (daemon empty)', () => {
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
          args: ['keyrack', 'get', '--key', 'SECURE_API_KEY', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('returns locked status', () => {
        const parsed = JSON.parse(result.stdout);
        // key exists in os.secure but vault is locked (daemon empty, no passphrase)
        expect(parsed.status).toEqual('locked');
      });

      then('fix mentions unlock', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.fix).toContain('unlock');
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
            '--mech',
            'REPLICA',
            '--vault',
            'os.secure',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('returns found host config', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.slug).toEqual('SECURE_API_KEY');
        expect(parsed.mech).toEqual('REPLICA');
        expect(parsed.vault).toEqual('os.secure');
      });
    });
  });

  /**
   * [uc6] portability: pre-encrypted .age file can be read
   * proves that age encryption is portable across systems
   *
   * the pre-encrypted fixture exists at .rhachet/keyrack.secure/8ff6529b98db9873.age
   * passphrase: test-passphrase-123, value: portable-secure-value-xyz789
   */
  given('[case6] repo with pre-encrypted .age fixture', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-secure' }),
    );

    when('[t0] get SECURE_API_KEY with KEYRACK_PASSPHRASE env', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'SECURE_API_KEY', '--json'],
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
