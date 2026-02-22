import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';

describe('keyrack recipient', () => {
  /**
   * [uc1] keyrack recipient management (criteria usecase.7)
   * tests recipient set, get, del for multi-recipient support
   */
  given('[case1] recipient lifecycle', () => {
    // init keyrack first to have manifest
    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-keyrack-multi-env' });
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: r.path,
        env: { HOME: r.path },
      });
      return r;
    });

    when('[t0] recipient get (initial state)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'recipient', 'get', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('shows one recipient (default from init)', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toHaveLength(1);
        expect(parsed[0].label).toEqual('test-key');
        expect(parsed[0].mech).toEqual('age');
      });
    });

    when('[t1] recipient set --pubkey --label', () => {
      // valid age pubkey for test
      const testPubkey =
        'age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p';
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'recipient',
            'set',
            '--pubkey',
            testPubkey,
            '--label',
            'backup-key',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('response contains new recipient', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.label).toEqual('backup-key');
        expect(parsed.mech).toEqual('age');
        expect(parsed.pubkey).toEqual(testPubkey);
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        // redact timestamp for stable snapshots
        if (parsed.addedAt) parsed.addedAt = '__TIMESTAMP__';
        expect(parsed).toMatchSnapshot();
      });
    });

    when('[t2] recipient get after set', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'recipient', 'get', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('shows two recipients', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toHaveLength(2);
        const labels = parsed.map((r: { label: string }) => r.label);
        expect(labels).toContain('test-key');
        expect(labels).toContain('backup-key');
      });
    });

    when('[t3] recipient del --label', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'recipient',
            'del',
            '--label',
            'backup-key',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('response confirms deletion', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.deleted).toEqual('backup-key');
      });
    });

    when('[t4] recipient get after deletion', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'recipient', 'get', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('shows one recipient again', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toHaveLength(1);
        expect(parsed[0].label).toEqual('test-key');
      });
    });
  });

  /**
   * [uc2] recipient error cases
   * tests error paths for invalid operations
   */
  given('[case2] recipient error cases', () => {
    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-keyrack-multi-env' });
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: r.path,
        env: { HOME: r.path },
      });
      return r;
    });

    when('[t0] recipient set with duplicate label', () => {
      const testPubkey =
        'age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p';
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'recipient',
            'set',
            '--pubkey',
            testPubkey,
            '--label',
            'test-key', // duplicate label
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('stderr contains duplicate error', () => {
        expect(result.stderr).toContain('already exists');
      });
    });

    when('[t1] recipient del last recipient', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'recipient', 'del', '--label', 'test-key'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('stderr contains last recipient error', () => {
        expect(result.stderr).toContain('cannot remove last recipient');
      });
    });

    when('[t2] recipient del non-existent label', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'recipient', 'del', '--label', 'does-not-exist'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('stderr contains not found error', () => {
        expect(result.stderr).toContain('not found');
      });
    });

    when('[t3] recipient set with invalid pubkey', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'recipient',
            'set',
            '--pubkey',
            'invalid-pubkey',
            '--label',
            'test',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('stderr contains pubkey format error', () => {
        expect(result.stderr).toContain('age1');
      });
    });
  });

  /**
   * [uc3] recipient with --for owner
   * tests per-owner recipient management
   */
  given('[case3] recipient with --for owner', () => {
    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-keyrack-multi-env' });
      // init for mechanic owner
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init', '--for', 'mechanic'],
        cwd: r.path,
        env: { HOME: r.path },
      });
      return r;
    });

    when('[t0] recipient get --for mechanic', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'recipient', 'get', '--for', 'mechanic', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('shows mechanic recipient', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toHaveLength(1);
        expect(parsed[0].mech).toEqual('age');
      });
    });

    when('[t1] recipient get --for foreman (not initialized)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'recipient', 'get', '--for', 'foreman'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('stderr suggests init', () => {
        expect(result.stderr).toContain('init');
      });
    });
  });

  /**
   * [uc4] recipient human-readable output
   * tests display format for humans
   */
  given('[case4] recipient human-readable output', () => {
    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-keyrack-multi-env' });
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: r.path,
        env: { HOME: r.path },
      });
      return r;
    });

    when('[t0] recipient get (human readable)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'recipient', 'get'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output contains recipient info', () => {
        expect(result.stdout).toContain('recipient');
        expect(result.stdout).toContain('test-key');
        expect(result.stdout).toContain('age');
      });

      then('stdout matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] recipient set (human readable)', () => {
      const testPubkey =
        'age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p';
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'recipient',
            'set',
            '--pubkey',
            testPubkey,
            '--label',
            'backup',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output shows recipient was set', () => {
        expect(result.stdout).toContain('recipient');
        expect(result.stdout).toContain('added');
        expect(result.stdout).toContain('backup');
      });

      then('stdout matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t2] recipient del (human readable)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'recipient', 'del', '--label', 'backup'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output shows recipient was removed', () => {
        expect(result.stdout).toContain('removed');
        expect(result.stdout).toContain('backup');
      });

      then('stdout matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });

  /**
   * [gap.4] --stanza ssh prevention flow (full CLI round-trip)
   *
   * .what = test the full prevention path for users who plan to add a passphrase
   *         to a key that was passwordless at init time.
   *
   *         at init, a passwordless key gets `mech: 'age'` with an `age1...` pubkey.
   *         if the user later runs `ssh-keygen -p` to add a passphrase, the manifest
   *         has an X25519 stanza but the key now needs an ssh-ed25519 stanza — mismatch.
   *
   *         the prevention flow is:
   *           1. `rhx keyrack recipient set --pubkey ~/.ssh/id_ed25519.pub --stanza ssh`
   *              (adds ssh-ed25519 recipient BEFORE passphrase change)
   *           2. user runs `ssh-keygen -p` (adds passphrase)
   *           3. manifest already has ssh-ed25519 stanza — no mismatch
   *           4. `rhx keyrack recipient del --label "default"` (clean up stale age1... recipient)
   *
   * .why = this is the only way to safely transition a passwordless key to passphrase-protected
   *        without loss of access to the manifest. without this flow, the user must do a
   *        4-step recovery (temporarily remove passphrase, add ssh recipient, restore passphrase,
   *        remove old recipient). the prevention path avoids that friction entirely.
   *
   * .what we'd test:
   *   t0: init with passwordless key produces mech: 'age' recipient
   *       - baseline: confirms cipher-aware detection works
   *   t1: recipient set --stanza ssh adds ssh-ed25519 recipient alongside age1...
   *       - verifies --stanza ssh overrides cipher-aware conversion
   *       - verifies manifest now has two recipients of different types
   *   t2: after simulated passphrase addition, unlock still works via ssh-ed25519 stanza
   *       - the critical assertion: manifest is decryptable despite key change
   *   t3: recipient del removes stale age1... recipient, manifest still decryptable
   *       - verifies cleanup path works
   *
   * .why deferred:
   *   requires passphrase-protected test keys and age CLI in the test environment.
   *   to simulate `ssh-keygen -p` (add passphrase to a key mid-test) is complex:
   *   - must generate a fresh key pair per test run
   *   - must invoke ssh-keygen non-interactively to add passphrase
   *   - must verify age CLI can decrypt the ssh-ed25519 stanza with the now-protected key
   *   - age CLI must be installed in the test env (not guaranteed in CI)
   *   unit tests cover `sshPubkeyToAgeRecipient` and `sshPrikeyToAgeIdentity` — this gap
   *   is the full CLI round-trip only.
   */
  given.skip('[case5] --stanza ssh prevention flow (gap.4: deferred)', () => {
    when('[t0] init with passwordless key', () => {
      then('recipient mech is age', () => {});
      then('recipient pubkey starts with age1', () => {});
    });

    when('[t1] recipient set --stanza ssh (add ssh-ed25519 recipient)', () => {
      then('exits with status 0', () => {});
      then('manifest now has two recipients', () => {});
      then('one recipient is age, one is ssh', () => {});
    });

    when('[t2] unlock after passphrase added to key', () => {
      then('exits with status 0 (ssh-ed25519 stanza matches)', () => {});
      then('credential is accessible via get', () => {});
    });

    when('[t3] recipient del removes stale age1... recipient', () => {
      then('exits with status 0', () => {});
      then('manifest has one recipient (ssh only)', () => {});
      then('unlock still works', () => {});
    });
  });
});
