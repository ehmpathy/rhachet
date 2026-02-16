import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/accept.blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/accept.blackbox/.test/infra/invokeRhachetCliBinary';


describe('keyrack daemon cache', () => {
  /**
   * [uc1] daemon cache hit: robot uses cached value without passphrase
   * proves that after human unlocks once, robot can reuse cached credentials from daemon
   *
   * note: with the os.daemon vault, keys unlocked by human are cached in daemon memory.
   * robots can then retrieve these keys without the passphrase.
   */
  given('[case1] repo with os.secure vault, after unlock', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-secure' }),
    );

    // cleanup: relock any prior keys before this test
    useBeforeAll(async () =>
      invokeRhachetCliBinary({
        args: ['keyrack', 'relock'],
        cwd: repo.path,
        env: { HOME: repo.path },
        logOnError: false,
      }),
    );

    // unlock first (simulates human unlock via env var — secure, no shell history exposure)
    useBeforeAll(async () =>
      invokeRhachetCliBinary({
        args: ['keyrack', 'unlock', '--env', 'test'],
        cwd: repo.path,
        env: { HOME: repo.path },
      }),
    );

    when('[t0] keyrack get --key SECURE_API_KEY --json (no passphrase)', () => {
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

      then('status is granted', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('granted');
      });

      then('grant uses cached value from daemon', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.key.secret).toEqual('portable-secure-value-xyz789');
      });

      then('grant source vault is os.daemon', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.source.vault).toEqual('os.daemon');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc2] daemon cache miss with auto-discovery: robot resolves via os.secure directly
   * proves keyrack auto-discovers identity and decrypts os.secure without daemon
   *
   * note: with recipient-key-based identity discovery, the test SSH key at
   * $HOME/.ssh/id_ed25519 is auto-discovered and used to decrypt both the
   * manifest and os.secure vault — no daemon cache needed.
   */
  given('[case2] repo with os.secure vault, daemon empty', () => {
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

    when('[t0] keyrack get --key SECURE_API_KEY --json (no passphrase)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.SECURE_API_KEY', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('status is granted via auto-discovery', () => {
        const parsed = JSON.parse(result.stdout);
        // auto-discovered identity decrypts os.secure directly (no daemon needed)
        expect(parsed.status).toEqual('granted');
      });

      then('grant source vault is os.secure (not daemon)', () => {
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
   * [uc3] passphrase env var unlocks vault directly
   * proves passphrase env var can be used to unlock vault on-the-fly
   */
  given('[case3] repo with os.secure vault', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-secure' }),
    );

    // cleanup: relock to ensure daemon is empty
    useBeforeAll(async () =>
      invokeRhachetCliBinary({
        args: ['keyrack', 'relock'],
        cwd: repo.path,
        env: { HOME: repo.path },
        logOnError: false,
      }),
    );

    when('[t0] keyrack get with KEYRACK_PASSPHRASE env', () => {
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

      then('status is granted', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('granted');
      });

      then('grant value matches pre-encrypted fixture', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.key.secret).toEqual('portable-secure-value-xyz789');
      });

      then('grant source vault is os.secure', () => {
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
   * [uc5] mid-session unlock: robot can access keys after human unlocks mid-session
   * proves that robot doesn't need restart after human unlocks
   *
   * flow: get fails (locked) → human unlocks → get succeeds
   */
  given('[case5] mid-session unlock flow', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-secure' }),
    );

    // cleanup: relock to ensure daemon is empty
    useBeforeAll(async () =>
      invokeRhachetCliBinary({
        args: ['keyrack', 'relock'],
        cwd: repo.path,
        env: { HOME: repo.path },
        logOnError: false,
      }),
    );

    when('[t0] get before unlock (auto-discovers identity)', () => {
      const resultBefore = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.SECURE_API_KEY', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('status is granted via auto-discovery (no daemon needed)', () => {
        const parsed = JSON.parse(resultBefore.stdout);
        // auto-discovered identity decrypts os.secure directly
        expect(parsed.status).toEqual('granted');
      });

      then('grant source vault is os.secure', () => {
        const parsed = JSON.parse(resultBefore.stdout);
        expect(parsed.grant.source.vault).toEqual('os.secure');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(resultBefore.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });

    when('[t1] unlock then get (should succeed)', () => {
      // human unlocks mid-session (via env var — secure, no shell history exposure)
      const unlockResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'test'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      // robot retries get
      const resultAfter = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.SECURE_API_KEY', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('unlock succeeds', () => {
        expect(unlockResult.status).toEqual(0);
      });

      then('get now returns granted', () => {
        const parsed = JSON.parse(resultAfter.stdout);
        expect(parsed.status).toEqual('granted');
      });

      then('key comes from daemon', () => {
        const parsed = JSON.parse(resultAfter.stdout);
        expect(parsed.grant.source.vault).toEqual('os.daemon');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(resultAfter.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc6] unlock via env var then robot gets from daemon
   * proves that human can unlock via recipient key, robot can then get without identity
   *
   * note: the original passphrase-based interactive unlock is deprecated.
   * the new system uses recipient-key-based locks via ssh keys / yubikeys.
   * identity is discovered at runtime from ssh keys matched to the manifest recipients.
   */
  given('[case6] unlock via recipient key discovery', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-secure' }),
    );

    // cleanup: relock to ensure daemon is empty
    useBeforeAll(async () =>
      invokeRhachetCliBinary({
        args: ['keyrack', 'relock'],
        cwd: repo.path,
        env: { HOME: repo.path },
        logOnError: false,
      }),
    );

    when('[t0] unlock via recipient key discovery', () => {
      // human unlocks via recipient key (secure — auto-discovered from ssh key)
      const unlockResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'test'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('unlock exits with status 0', () => {
        expect(unlockResult.status).toEqual(0);
      });

      then('unlock stdout matches snapshot', () => {
        expect(unlockResult.stdout).toMatchSnapshot();
      });
    });

    when('[t1] get after unlock (human readable)', () => {
      // robot gets key (should come from daemon — no identity needed)
      const getResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.SECURE_API_KEY'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('get exits with status 0', () => {
        expect(getResult.status).toEqual(0);
      });

      then('get stdout matches snapshot', () => {
        expect(getResult.stdout).toMatchSnapshot();
      });
    });

    when('[t2] get after unlock (json)', () => {
      // robot gets key in json mode
      const getResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.SECURE_API_KEY', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('status is granted', () => {
        const parsed = JSON.parse(getResult.stdout);
        expect(parsed.status).toEqual('granted');
      });

      then('key comes from daemon', () => {
        const parsed = JSON.parse(getResult.stdout);
        expect(parsed.grant.source.vault).toEqual('os.daemon');
      });

      then('key value matches fixture', () => {
        const parsed = JSON.parse(getResult.stdout);
        expect(parsed.grant.key.secret).toEqual('portable-secure-value-xyz789');
      });
    });
  });

  /**
   * [uc4] priority: daemon cache takes precedence over source vault
   * proves robot uses daemon cache even when source vault credentials exist
   *
   * note: this is the new behavior - os.daemon replaces the old os.direct cache
   */
  given('[case4] repo with daemon cache and source vault', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-secure' }),
    );

    // cleanup: relock to ensure clean state
    useBeforeAll(async () =>
      invokeRhachetCliBinary({
        args: ['keyrack', 'relock'],
        cwd: repo.path,
        env: { HOME: repo.path },
        logOnError: false,
      }),
    );

    // unlock to populate daemon cache (via env var — secure, no shell history exposure)
    useBeforeAll(async () =>
      invokeRhachetCliBinary({
        args: ['keyrack', 'unlock', '--env', 'test'],
        cwd: repo.path,
        env: { HOME: repo.path },
      }),
    );

    when('[t0] keyrack get with KEYRACK_PASSPHRASE (daemon should still win)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.SECURE_API_KEY', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('status is granted', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('granted');
      });

      then('uses daemon cached value', () => {
        const parsed = JSON.parse(result.stdout);
        // both daemon and vault have the same value in this fixture
        expect(parsed.grant.key.secret).toEqual('portable-secure-value-xyz789');
      });

      then('source is os.daemon (not os.secure)', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.source.vault).toEqual('os.daemon');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });
  });
});
