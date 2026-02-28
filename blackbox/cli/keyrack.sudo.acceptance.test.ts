import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { given, then, useBeforeAll, when } from 'test-fns';

import {
  genTestTempRepo,
  TEST_SSH_AGE_RECIPIENT,
} from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';
import { writeDirectStoreEntry } from '@/blackbox/.test/infra/writeDirectStoreEntry';

describe('keyrack sudo', () => {
  // kill any stale daemon to ensure fresh code is used
  beforeAll(() => {
    killKeyrackDaemonForTests({ owner: null });
  });
  /**
   * [uc1] sudo credential set
   * sudo credentials stored ONLY in encrypted host manifest, not keyrack.yml
   */
  given('[case1] sudo credential set', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-multi-env' }),
    );

    when('[t0] set --key SUDO_TOKEN --env sudo --vault os.direct --json', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'SUDO_TOKEN',
            '--env',
            'sudo',
            '--mech',
            'REPLICA',
            '--vault',
            'os.direct',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'sudo-token-value\n',
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('response contains env: sudo', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.env).toEqual('sudo');
      });

      then('response contains org resolved from manifest', () => {
        const parsed = JSON.parse(result.stdout);
        // @this is resolved to actual org name at storage time
        expect(parsed.org).toEqual('testorg');
      });

      then('slug follows org.env.key pattern', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.slug).toMatch(/^testorg\.sudo\.SUDO_TOKEN$/);
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        // redact timestamps for stable snapshots
        if (parsed.createdAt) parsed.createdAt = '__TIMESTAMP__';
        if (parsed.updatedAt) parsed.updatedAt = '__TIMESTAMP__';
        expect(parsed).toMatchSnapshot();
      });
    });

    when('[t1] set --key SUDO_TOKEN --env sudo (human readable)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'SUDO_TOKEN',
            '--env',
            'sudo',
            '--mech',
            'REPLICA',
            '--vault',
            'os.direct',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'sudo-token-value\n',
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output mentions sudo credentials not in keyrack.yml', () => {
        expect(result.stdout).toContain('sudo credentials');
        expect(result.stdout).toContain('keyrack.yml');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t2] set with --org @all (cross-org sudo)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'CROSS_ORG_TOKEN',
            '--env',
            'sudo',
            '--org',
            '@all',
            '--mech',
            'REPLICA',
            '--vault',
            'os.direct',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'cross-org-token-value\n',
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('response contains org: @all', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.org).toEqual('@all');
      });

      then('slug contains @all', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.slug).toContain('@all');
      });
    });

    when('[t3] set with --max-duration 5m', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'LIMITED_TOKEN',
            '--env',
            'sudo',
            '--mech',
            'REPLICA',
            '--vault',
            'os.direct',
            '--max-duration',
            '5m',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'limited-token-value\n',
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('response contains maxDuration', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.maxDuration).toEqual('5m');
      });
    });

    when('[t4] duplicate set (findsert semantics)', () => {
      // set the same sudo key again — should return prior config
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'SUDO_TOKEN',
            '--env',
            'sudo',
            '--mech',
            'REPLICA',
            '--vault',
            'os.direct',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'sudo-token-value\n',
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('returns prior config (findsert)', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.slug).toMatch(/^testorg\.sudo\.SUDO_TOKEN$/);
        expect(parsed.vault).toEqual('os.direct');
      });
    });
  });

  /**
   * [uc2] sudo unlock requires --key
   */
  given('[case2] sudo unlock requires --key', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-multi-env' }),
    );

    when('[t0] unlock --env sudo without --key', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'sudo'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('error mentions sudo credentials require --key flag', () => {
        const output = result.stdout + result.stderr;
        expect(output).toContain('sudo');
        expect(output).toContain('--key');
      });

      then('stdout matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] unlock --env sudo --key NONEXISTENT_KEY', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'unlock',
            '--env',
            'sudo',
            '--key',
            'NONEXISTENT_KEY',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('error mentions key not found', () => {
        const output = result.stdout + result.stderr;
        expect(output.toLowerCase()).toMatch(/not found|absent/);
      });
    });
  });

  /**
   * [uc3] org validation
   */
  given('[case3] org validation', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-multi-env' }),
    );

    when('[t0] set --org invalid-org (not @this or @all)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'TEST_KEY',
            '--env',
            'sudo',
            '--org',
            'invalid-org',
            '--mech',
            'REPLICA',
            '--vault',
            'os.direct',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'test-key-value\n',
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('error mentions org', () => {
        const output = result.stdout + result.stderr;
        expect(output.toLowerCase()).toContain('org');
      });

      then('stdout matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] set --org @this (valid)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'VALID_ORG_KEY',
            '--env',
            'sudo',
            '--org',
            '@this',
            '--mech',
            'REPLICA',
            '--vault',
            'os.direct',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'valid-org-key-value\n',
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('response contains resolved org', () => {
        const parsed = JSON.parse(result.stdout);
        // @this resolves to manifest org (testorg) at storage time
        expect(parsed.org).toEqual('testorg');
      });
    });
  });

  /**
   * [uc4] relock behavior
   */
  given('[case4] relock behavior', () => {
    // kill daemon to isolate from case3 sudo key state
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-keyrack-multi-env' });
      // unlock all keys first so relock has keys to purge
      await invokeRhachetCliBinary({
        args: ['keyrack', 'unlock', '--env', 'all'],
        cwd: r.path,
        env: { HOME: r.path },
      });
      return r;
    });

    when('[t0] relock (bare, no flags)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'relock'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output mentions prune/relock', () => {
        expect(result.stdout).toContain('prune');
      });

      then('output shows correct count of pruned keys', () => {
        expect(result.stdout).toContain('testorg.prod.AWS_PROFILE');
        expect(result.stdout).toContain('testorg.prod.SHARED_API_KEY');
        expect(result.stdout).toContain('testorg.prep.AWS_PROFILE');
        expect(result.stdout).toContain('testorg.prep.SHARED_API_KEY');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] relock --json', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'relock', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('returns json with relocked array', () => {
        const parsed = JSON.parse(result.stdout);
        expect(Array.isArray(parsed.relocked)).toBe(true);
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc5] status shows env and org
   */
  given('[case5] status output', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-multi-env' }),
    );

    when('[t0] status when daemon not active', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'status'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output mentions daemon not found or no keys', () => {
        // daemon may or may not be active in test env
        const output = result.stdout;
        const hasDaemonInfo =
          output.includes('daemon') || output.includes('unlock');
        expect(hasDaemonInfo).toBe(true);
      });

      then('stdout matches snapshot', () => {
        // owner, recipients, socketPath are new fields in status output - expected
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] status --json', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'status', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('returns valid json', () => {
        // may be null if daemon not active, or object with keys array
        const parsed = JSON.parse(result.stdout);
        expect(parsed === null || typeof parsed === 'object').toBe(true);
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        // redact dynamic fields for stable snapshots
        if (parsed?.recipients) {
          for (const r of parsed.recipients) {
            if (r.addedAt) r.addedAt = '__TIMESTAMP__';
          }
        }
        if (parsed?.socketPath) parsed.socketPath = '__SOCKET_PATH__';
        expect(parsed).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc6] list shows env and org
   */
  given('[case6] list shows env and org fields', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-multi-env' }),
    );

    // first set a sudo key so we have one to list
    useBeforeAll(async () =>
      invokeRhachetCliBinary({
        args: [
          'keyrack',
          'set',
          '--key',
          'SUDO_LIST_TEST',
          '--env',
          'sudo',
          '--mech',
          'REPLICA',
          '--vault',
          'os.direct',
        ],
        cwd: repo.path,
        env: { HOME: repo.path },
        stdin: 'sudo-list-test-value\n',
      }),
    );

    when('[t0] keyrack list', () => {
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

      then('output contains env field', () => {
        expect(result.stdout).toContain('env:');
      });

      then('output contains org field', () => {
        expect(result.stdout).toContain('org:');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] keyrack list --json', () => {
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

      then('json contains sudo key with env and org', () => {
        const parsed = JSON.parse(result.stdout);
        const sudoKey = Object.values(parsed).find(
          (host: unknown) => (host as { env: string }).env === 'sudo',
        );
        expect(sudoKey).toBeDefined();
        expect((sudoKey as { env: string }).env).toEqual('sudo');
        expect((sudoKey as { org: string }).org).toBeDefined();
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        // redact timestamps for stable snapshots
        for (const key of Object.keys(parsed)) {
          if (parsed[key].createdAt) parsed[key].createdAt = '__TIMESTAMP__';
          if (parsed[key].updatedAt) parsed[key].updatedAt = '__TIMESTAMP__';
        }
        expect(parsed).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc7] per-owner isolation
   */
  given('[case7] per-owner isolation via --for flag', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-multi-env' }),
    );

    when('[t0] set --for mechanic (per-owner isolation)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'MECHANIC_TOKEN',
            '--env',
            'sudo',
            '--mech',
            'REPLICA',
            '--vault',
            'os.direct',
            '--json',
          ],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            KEYRACK_OWNER: 'mechanic',
          },
          stdin: 'mechanic-token-value\n',
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('response contains slug with mechanic token', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.slug).toContain('MECHANIC_TOKEN');
      });
    });

    when('[t1] status --for mechanic', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'status', '--for', 'mechanic'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output contains daemon info', () => {
        expect(result.stdout).toContain('daemon');
      });
    });

    when('[t2] relock --for mechanic', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'relock', '--for', 'mechanic'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });
    });
  });

  /**
   * [uc8] vault-recipient for os.secure
   */
  given('[case8] os.secure vault with vault-recipient', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-multi-env' }),
    );

    when('[t0] set with --vault os.secure --vault-recipient', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'SECURE_TOKEN',
            '--env',
            'sudo',
            '--mech',
            'REPLICA',
            '--vault',
            'os.secure',
            '--vault-recipient',
            TEST_SSH_AGE_RECIPIENT,
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'secure-token-value\n',
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('response contains vaultRecipient', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.vaultRecipient).toEqual(TEST_SSH_AGE_RECIPIENT);
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        if (parsed.createdAt) parsed.createdAt = '__TIMESTAMP__';
        if (parsed.updatedAt) parsed.updatedAt = '__TIMESTAMP__';
        expect(parsed).toMatchSnapshot();
      });
    });

    when('[t1] set with --vault os.secure (no vault-recipient)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'SECURE_TOKEN_DEFAULT',
            '--env',
            'sudo',
            '--mech',
            'REPLICA',
            '--vault',
            'os.secure',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'secure-token-default-value\n',
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('vaultRecipient is null (uses manifest recipient)', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.vaultRecipient).toBeNull();
      });
    });
  });

  /**
   * [uc9] unlock with specific key for non-sudo env still works
   */
  given('[case9] unlock with --key for regular env', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-multi-env' }),
    );

    when('[t0] unlock --env prod --key testorg.prod.AWS_PROFILE', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'unlock',
            '--env',
            'prod',
            '--key',
            'testorg.prod.AWS_PROFILE',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('unlocks the specific key', () => {
        expect(result.stdout).toContain('AWS_PROFILE');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc10] get sudo credential (criteria usecase.3)
   * tests keyrack get with --env sudo for various states
   *
   * .note = current implementation shows sudo keys as "absent" when not in keyrack.yml
   *         this is a gap: sudo keys should show as "locked" when in host manifest but not unlocked
   *         for now, tests match actual behavior
   */
  given('[case10] get sudo credential', () => {
    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-keyrack-multi-env' });
      // pre-populate the direct store with the sudo key's secret value
      writeDirectStoreEntry({
        home: r.path,
        slug: 'testorg.sudo.SUDO_GET_TEST',
        value: 'test-sudo-secret-value',
      });
      // set a sudo key first
      await invokeRhachetCliBinary({
        args: [
          'keyrack',
          'set',
          '--key',
          'SUDO_GET_TEST',
          '--env',
          'sudo',
          '--mech',
          'REPLICA',
          '--vault',
          'os.direct',
        ],
        cwd: r.path,
        env: { HOME: r.path },
        stdin: 'sudo-get-test-value\n',
      });
      return r;
    });

    when('[t0] get --key without unlock (returns locked)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'testorg.sudo.SUDO_GET_TEST',
            '--env',
            'sudo',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('returns locked status', () => {
        // sudo keys require explicit unlock via daemon — direct vault access is denied
        expect(result.stdout).toContain('locked');
      });

      then('output contains unlock instructions', () => {
        expect(result.stdout).toContain('rhx keyrack unlock --env sudo');
      });
    });

    when('[t1] get --key after unlock (shows granted)', () => {
      const result = useBeforeAll(async () => {
        // first unlock the key
        await invokeRhachetCliBinary({
          args: [
            'keyrack',
            'unlock',
            '--env',
            'sudo',
            '--key',
            'testorg.sudo.SUDO_GET_TEST',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        });
        // then get it
        return invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'testorg.sudo.SUDO_GET_TEST',
            '--env',
            'sudo',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        });
      });

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('returns granted status', () => {
        // sudo keys unlocked from daemon show granted
        expect(result.stdout).toContain('granted');
      });
    });

    when('[t2] get --key after unlock --json', () => {
      const result = useBeforeAll(async () => {
        // ensure unlocked
        await invokeRhachetCliBinary({
          args: [
            'keyrack',
            'unlock',
            '--env',
            'sudo',
            '--key',
            'testorg.sudo.SUDO_GET_TEST',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        });
        // then get with json
        return invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'testorg.sudo.SUDO_GET_TEST',
            '--env',
            'sudo',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        });
      });

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('json shows granted status', () => {
        const parsed = JSON.parse(result.stdout);
        // sudo keys unlocked from daemon show granted
        expect(parsed.status).toEqual('granted');
      });
    });
  });

  /**
   * [uc11] env isolation - sudo keys not included in regular env unlock
   */
  given('[case11] env isolation - sudo keys separate from regular', () => {
    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-keyrack-multi-env' });
      // set a sudo key first
      await invokeRhachetCliBinary({
        args: [
          'keyrack',
          'set',
          '--key',
          'SUDO_ISOLATED',
          '--env',
          'sudo',
          '--mech',
          'REPLICA',
          '--vault',
          'os.direct',
        ],
        cwd: r.path,
        env: { HOME: r.path },
        stdin: 'sudo-isolated-value\n',
      });
      return r;
    });

    when('[t0] unlock --env all', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'all'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('does NOT unlock sudo keys', () => {
        // sudo keys should not appear in --env all unlock
        expect(result.stdout).not.toContain('SUDO_ISOLATED');
      });

      then('unlocks regular keys', () => {
        expect(result.stdout).toContain('AWS_PROFILE');
      });
    });

    when('[t1] list shows sudo key exists', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('sudo key is in host manifest', () => {
        const parsed = JSON.parse(result.stdout);
        const sudoKey = Object.keys(parsed).find((k) => k.includes('SUDO_ISOLATED'));
        expect(sudoKey).toBeDefined();
      });
    });
  });

  /**
   * [uc12] cross-org credential set flow (criteria usecase.5)
   * tests that cross-org (@all) credentials are stored correctly
   *
   * .note = --org flag is only on `set`, not on `get` (gap in CLI)
   *         tests focus on set behavior with @all
   */
  given('[case12] cross-org credential set flow', () => {
    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-keyrack-multi-env' });
      // pre-populate the direct store with the cross-org sudo key's secret value
      writeDirectStoreEntry({
        home: r.path,
        slug: '@all.sudo.CROSS_ORG_TOKEN',
        value: 'cross-org-secret-value',
      });
      return r;
    });

    when('[t0] set --key with --org @all stores with org @all', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'CROSS_ORG_TOKEN',
            '--org',
            '@all',
            '--env',
            'sudo',
            '--mech',
            'REPLICA',
            '--vault',
            'os.direct',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'cross-org-token-value\n',
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('org is stored as @all', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.org).toEqual('@all');
      });

      then('slug starts with @all', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.slug).toMatch(/^@all\.sudo\./);
      });
    });

    when('[t1] list shows cross-org key with org @all', () => {
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

      then('json contains key with org @all', () => {
        const parsed = JSON.parse(result.stdout) as Record<
          string,
          { org?: string }
        >;
        const crossOrgKey = Object.values(parsed).find((k) => k.org === '@all');
        expect(crossOrgKey).toBeDefined();
      });
    });

    when('[t2] unlock cross-org sudo key by full slug', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'unlock',
            '--env',
            'sudo',
            '--key',
            '@all.sudo.CROSS_ORG_TOKEN',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('unlock reports 1 key', () => {
        // full slug match works for cross-org sudo keys
        expect(result.stdout).toContain('@all.sudo.CROSS_ORG_TOKEN');
      });
    });
  });

  /**
   * [uc13] relock env filter - relock only sudo keys
   * tests that `relock --env sudo` only purges sudo keys from daemon
   */
  given('[case13] relock env filter', () => {
    const repo = useBeforeAll(async () => {
      // kill daemon to prevent state leakage from prior cases
      await killKeyrackDaemonForTests({ owner: null });
      const r = await genTestTempRepo({ fixture: 'with-keyrack-multi-env' });
      // pre-populate the direct store with the sudo key's secret value
      writeDirectStoreEntry({
        home: r.path,
        slug: 'testorg.sudo.SUDO_RELOCK_TEST',
        value: 'sudo-relock-test-secret',
      });
      // set a sudo key
      const setResult = await invokeRhachetCliBinary({
        args: [
          'keyrack',
          'set',
          '--key',
          'SUDO_RELOCK_TEST',
          '--env',
          'sudo',
          '--mech',
          'REPLICA',
          '--vault',
          'os.direct',
        ],
        cwd: r.path,
        env: { HOME: r.path },
        stdin: 'sudo-relock-test-value\n',
      });
      // unlock both regular and sudo keys
      const unlockAllResult = await invokeRhachetCliBinary({
        args: ['keyrack', 'unlock', '--env', 'all'],
        cwd: r.path,
        env: { HOME: r.path },
      });
      const unlockSudoResult = await invokeRhachetCliBinary({
        args: ['keyrack', 'unlock', '--env', 'sudo', '--key', 'SUDO_RELOCK_TEST'],
        cwd: r.path,
        env: { HOME: r.path },
      });
      return r;
    });

    when('[t0] status shows both regular and sudo keys unlocked', () => {
      const result = useBeforeAll(async () => {
        const r = await invokeRhachetCliBinary({
          args: ['keyrack', 'status', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        });
        return r;
      });

      then('shows regular key with env=prod', () => {
        const parsed = JSON.parse(result.stdout);
        const awsKey = parsed.keys.find((k: { slug: string }) =>
          k.slug.includes('AWS_PROFILE'),
        );
        expect(awsKey).toBeDefined();
        // verify env field matches expected tier
        expect(awsKey?.env).toEqual('prod');
      });

      then('shows sudo key with env=sudo', () => {
        const parsed = JSON.parse(result.stdout);
        const sudoKey = parsed.keys.find((k: { slug: string }) =>
          k.slug.includes('SUDO_RELOCK_TEST'),
        );
        expect(sudoKey).toBeDefined();
        // verify env field matches expected tier
        expect(sudoKey?.env).toEqual('sudo');
      });
    });

    when('[t1] relock --env sudo', () => {
      const result = useBeforeAll(async () => {
        await invokeRhachetCliBinary({
          args: ['keyrack', 'relock', '--env', 'sudo'],
          cwd: repo.path,
          env: { HOME: repo.path },
        });
        // then check status
        return invokeRhachetCliBinary({
          args: ['keyrack', 'status'],
          cwd: repo.path,
          env: { HOME: repo.path },
        });
      });

      then('regular key still unlocked', () => {
        expect(result.stdout).toContain('AWS_PROFILE');
      });

      then('sudo key is relocked', () => {
        expect(result.stdout).not.toContain('SUDO_RELOCK_TEST');
      });
    });
  });

  /**
   * [uc14] cross-owner isolation - mechanic cannot access foreman's keyrack
   * tests that per-owner isolation is enforced at manifest decryption
   */
  given('[case14] cross-owner isolation', () => {
    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-keyrack-multi-env' });
      // init keyrack for mechanic owner
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init', '--for', 'mechanic'],
        cwd: r.path,
        env: { HOME: r.path },
      });
      // set a sudo key for mechanic
      await invokeRhachetCliBinary({
        args: [
          'keyrack',
          'set',
          '--for',
          'mechanic',
          '--key',
          'MECHANIC_SECRET',
          '--env',
          'sudo',
          '--mech',
          'REPLICA',
          '--vault',
          'os.direct',
        ],
        cwd: r.path,
        env: { HOME: r.path },
        stdin: 'mechanic-secret-value\n',
      });
      return r;
    });

    when('[t0] list for mechanic shows the key', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--for', 'mechanic', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('mechanic key is present', () => {
        const parsed = JSON.parse(result.stdout);
        const mechanicKey = Object.keys(parsed).find((k) =>
          k.includes('MECHANIC_SECRET'),
        );
        expect(mechanicKey).toBeDefined();
      });
    });

    when('[t1] list for foreman cannot see mechanic key', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--for', 'foreman', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('foreman list does not contain mechanic key', () => {
        // foreman has no keyrack initialized, so list returns empty or error
        // either way, MECHANIC_SECRET should not be visible
        expect(result.stdout).not.toContain('MECHANIC_SECRET');
      });
    });

    when('[t2] default owner cannot see mechanic key', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('default owner list does not contain mechanic key', () => {
        // default owner (no --for) should not see mechanic's keys
        expect(result.stdout).not.toContain('MECHANIC_SECRET');
      });
    });
  });

  /**
   * [uc15] attack surface reduction
   * verifies security properties: socket permissions, manifest encryption, sudo invisibility
   */
  given('[case15] attack surface reduction', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'minimal' }),
    );

    // init keyrack
    useBeforeAll(async () =>
      invokeRhachetCliBinary({
        args: ['keyrack', 'init', '--json'],
        cwd: repo.path,
        env: { HOME: repo.path },
      }),
    );

    when('[t0] manifest is age-encrypted', () => {
      then('manifest file starts with age header', () => {
        const manifestPath = join(
          repo.path,
          '.rhachet',
          'keyrack',
          'keyrack.host.age',
        );
        expect(existsSync(manifestPath)).toBe(true);
        const content = readFileSync(manifestPath, 'utf8');
        expect(content).toMatch(/^-----BEGIN AGE ENCRYPTED FILE-----/);
      });
    });

    when('[t1] sudo key not visible in keyrack.yml', () => {
      // set a sudo credential
      const setResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'HIDDEN_SUDO_KEY',
            '--vault',
            'os.direct',
            '--env',
            'sudo',
            '--org',
            '@all',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'hidden-sudo-value\n',
        }),
      );

      then('set succeeds', () => {
        expect(setResult.status).toEqual(0);
      });

      then('keyrack.yml does not contain the sudo key', () => {
        const keyrackYmlPath = join(repo.path, 'keyrack.yml');
        if (!existsSync(keyrackYmlPath)) return; // no keyrack.yml = no leak
        const content = readFileSync(keyrackYmlPath, 'utf8');
        expect(content).not.toContain('HIDDEN_SUDO_KEY');
      });

      then('manifest still has age-encrypted header', () => {
        const manifestPath = join(
          repo.path,
          '.rhachet',
          'keyrack',
          'keyrack.host.age',
        );
        const content = readFileSync(manifestPath, 'utf8');
        expect(content).toMatch(/^-----BEGIN AGE ENCRYPTED FILE-----/);
      });
    });

    when('[t2] daemon socket has restricted permissions', () => {
      // trigger daemon creation via unlock
      const unlockResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'unlock',
            '--env',
            'sudo',
            '--key',
            'HIDDEN_SUDO_KEY',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('unlock succeeds', () => {
        expect(unlockResult.status).toEqual(0);
      });

      then('daemon socket is owner-only (0600)', () => {
        // replicate socket path logic from getKeyrackDaemonSocketPath
        const sessionidPath = `/proc/${process.pid}/sessionid`;
        const sessionIdStr = readFileSync(sessionidPath, 'utf-8').trim();
        const sessionId = parseInt(sessionIdStr, 10);
        const uid = process.getuid?.();
        const runtimeDir =
          process.env['XDG_RUNTIME_DIR'] ?? `/run/user/${uid}`;
        const socketPath = `${runtimeDir}/keyrack.${sessionId}.sock`;

        expect(existsSync(socketPath)).toBe(true);
        const stats = statSync(socketPath);
        // mask to permission bits only (sockets have type bits too)
        const permBits = stats.mode & 0o777;
        expect(permBits).toEqual(0o600);
      });
    });
  });

  /**
   * [gap.3] --prikey fallback for unlock
   *
   * .what = test that `keyrack unlock --env sudo --key X --prikey ~/.ssh/id_ed25519`
   *         works when the ssh-agent has no keys loaded
   *
   * .why = the --prikey flag is the escape hatch for environments where ssh-agent
   *        is unavailable or empty (e.g., minimal CI containers, recovery scenarios).
   *        without this flag, keyrack cannot discover an identity to decrypt the manifest.
   *        the flag bypasses agent discovery and reads the private key directly from disk.
   *
   * .what we'd test:
   *   t0: unlock --env sudo --key X --prikey <path> succeeds when agent is empty
   *       - verifies the flag is wired end-to-end through CLI -> unlockKeyrackKeys -> identity discovery
   *       - verifies the credential is available via `get` afterward
   *   t1: unlock --env sudo --key X --prikey <nonexistent> returns clear error
   *       - verifies bad path fails fast with helpful message
   *   t2: unlock --env sudo --key X (no --prikey, no agent keys) returns clear error
   *       - verifies the error message mentions --prikey as the recovery path
   *
   * .why deferred:
   *   requires test infrastructure to spawn an isolated ssh-agent with zero keys loaded,
   *   then override SSH_AUTH_SOCK for the child process. this is complex to set up without
   *   side effects on the host agent, and risks flakiness if agent cleanup fails.
   *   unit tests already cover `sshPrikeyToAgeIdentity` — this gap is blackbox-only.
   */
  given.skip('[case16] --prikey fallback for unlock (gap.3: deferred)', () => {
    when('[t0] unlock --env sudo --key X --prikey <path> (agent empty)', () => {
      then('exits with status 0', () => {});
      then('credential is available via get', () => {});
    });

    when('[t1] unlock --prikey <nonexistent path>', () => {
      then('exits with non-zero status', () => {});
      then('error mentions file not found', () => {});
    });

    when('[t2] unlock without --prikey and no agent keys', () => {
      then('exits with non-zero status', () => {});
      then('error mentions --prikey as recovery', () => {});
    });
  });

  /**
   * [gap.i1] get never requires manifest decryption
   *
   * .what = prove that `keyrack get` completes without passphrase prompt
   * .why = get reads only from unlocked sources (os.envvar, os.daemon).
   *        manifest decryption is exclusive to unlock and set.
   *        if get triggered manifest decryption, it would block or fail
   *        when SSH_AUTH_SOCK is empty and no stdin is provided.
   */
  given('[case17] get never requires manifest decryption', () => {
    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-keyrack-multi-env' });
      // pre-populate the direct store with the sudo key's secret value
      writeDirectStoreEntry({
        home: r.path,
        slug: 'testorg.sudo.NO_PASSPHRASE_KEY',
        value: 'no-passphrase-secret',
      });
      // set a sudo key (with normal env — agent is available)
      await invokeRhachetCliBinary({
        args: [
          'keyrack',
          'set',
          '--key',
          'NO_PASSPHRASE_KEY',
          '--env',
          'sudo',
          '--mech',
          'REPLICA',
          '--vault',
          'os.direct',
        ],
        cwd: r.path,
        env: { HOME: r.path },
        stdin: 'no-passphrase-secret\n',
      });
      return r;
    });

    when('[t0] get --key without unlock and without ssh agent', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'testorg.sudo.NO_PASSPHRASE_KEY',
            '--env',
            'sudo',
            '--json',
          ],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            SSH_AUTH_SOCK: '', // disable ssh agent — if manifest decryption fires, this would fail
          },
          logOnError: false,
        }),
      );

      then('exits with status 2 (locked keys exit non-zero)', () => {
        expect(result.status).toEqual(2);
      });

      then('returns locked status (no manifest decryption needed)', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('locked');
      });
    });

    when('[t1] get --key after unlock and without ssh agent', () => {
      const result = useBeforeAll(async () => {
        // unlock with normal env (agent available)
        await invokeRhachetCliBinary({
          args: [
            'keyrack',
            'unlock',
            '--env',
            'sudo',
            '--key',
            'testorg.sudo.NO_PASSPHRASE_KEY',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        });
        // get with empty agent — should still work via daemon
        return invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'testorg.sudo.NO_PASSPHRASE_KEY',
            '--env',
            'sudo',
            '--json',
          ],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            SSH_AUTH_SOCK: '', // disable ssh agent — get should resolve from daemon without manifest
          },
          logOnError: false,
        });
      });

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('returns granted status from daemon (no manifest needed)', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('granted');
      });

      then('value matches what was set', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.key.secret).toEqual('no-passphrase-secret');
      });
    });
  });
});
