import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

import { given, then, useBeforeAll, useThen, when } from 'test-fns';

import {
  genTestTempRepo,
  TEST_SSH_AGE_RECIPIENT,
} from '../.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '../.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '../.test/infra/killKeyrackDaemonForTests';

/**
 * .what = acceptance tests for keyrack status --env filter
 * .why = prove behavior of env filter and hints
 */
describe('keyrack status --env', () => {
  // kill any stale daemon to ensure fresh code is used
  beforeAll(() => {
    killKeyrackDaemonForTests({ owner: null });
  });

  given('[case1] invalid --env value', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'minimal' }),
    );

    when('[t0] status is called with invalid env', () => {
      const result = useThen('command fails with error', () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'status', '--env', 'invalid'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('exit code is non-zero', () => {
        expect(result.status).not.toBe(0);
      });

      then('error mentions valid env values', () => {
        expect(result.stderr).toContain('invalid --env');
        expect(result.stderr).toMatch(/prod|prep|test|all|sudo/);
      });

      then('stderr matches snapshot', () => {
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case2] status --env filters keys to requested env', () => {
    // kill daemon for clean state
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'minimal' });
      // init keyrack
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: r.path,
        env: { HOME: r.path },
      });
      return r;
    });

    // set and unlock a key in env=sudo
    useBeforeAll(async () =>
      invokeRhachetCliBinary({
        args: [
          'keyrack',
          'set',
          '--key',
          'SUDO_SECRET',
          '--env',
          'sudo',
          '--vault',
          'os.secure',
          '--mech',
          'PERMANENT_VIA_REPLICA',
          '--vault-recipient',
          TEST_SSH_AGE_RECIPIENT,
          '--org',
          '@all',
          '--json',
        ],
        cwd: repo.path,
        env: { HOME: repo.path },
        stdin: 'sudo-secret\n',
      }),
    );

    useBeforeAll(async () =>
      invokeRhachetCliBinary({
        args: ['keyrack', 'unlock', '--env', 'sudo', '--key', 'SUDO_SECRET'],
        cwd: repo.path,
        env: { HOME: repo.path },
      }),
    );

    when('[t0] status without --env shows all keys', () => {
      const result = useThen('status succeeds', () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'status', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('shows sudo key', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.keys.length).toBeGreaterThan(0);
        expect(
          parsed.keys.some((k: { slug: string }) =>
            k.slug.includes('SUDO_SECRET'),
          ),
        ).toBe(true);
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        // redact volatile fields
        parsed.socketPath = '__REDACTED__';
        for (const key of parsed.keys) {
          key.expiresAt = '__REDACTED__';
          key.ttlLeftMs = '__REDACTED__';
        }
        for (const recipient of parsed.recipients ?? []) {
          recipient.addedAt = '__REDACTED__';
        }
        expect(parsed).toMatchSnapshot();
      });
    });

    when('[t1] status --env sudo shows only sudo keys', () => {
      const result = useThen('status succeeds', () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'status', '--env', 'sudo', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('shows sudo key', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.keys.length).toBeGreaterThan(0);
        expect(parsed.keys.every((k: { env: string }) => k.env === 'sudo')).toBe(
          true,
        );
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        // redact volatile fields
        parsed.socketPath = '__REDACTED__';
        for (const key of parsed.keys) {
          key.expiresAt = '__REDACTED__';
          key.ttlLeftMs = '__REDACTED__';
        }
        for (const recipient of parsed.recipients ?? []) {
          recipient.addedAt = '__REDACTED__';
        }
        expect(parsed).toMatchSnapshot();
      });
    });

    when('[t2] status --env test returns empty (no test keys)', () => {
      const result = useThen('status succeeds', () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'status', '--env', 'test', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('keys array is empty', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.keys).toEqual([]);
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        // redact volatile fields
        parsed.socketPath = '__REDACTED__';
        for (const recipient of parsed.recipients ?? []) {
          recipient.addedAt = '__REDACTED__';
        }
        expect(parsed).toMatchSnapshot();
      });
    });
  });

  given('[case3] status --env shows hint for non-sudo envs with keys', () => {
    // kill daemon for clean state
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'minimal' });

      // create keyrack.yml that declares a key in env.prep (required for non-sudo unlock)
      const keyrackYml = `org: testorg
env.prep:
  - PREP_SECRET
`;
      mkdirSync(join(r.path, '.agent'), { recursive: true });
      writeFileSync(join(r.path, '.agent', 'keyrack.yml'), keyrackYml);

      // init keyrack
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: r.path,
        env: { HOME: r.path },
      });
      return r;
    });

    // set and unlock a key in env=prep (non-sudo, will appear in hints)
    useBeforeAll(async () =>
      invokeRhachetCliBinary({
        args: [
          'keyrack',
          'set',
          '--key',
          'PREP_SECRET',
          '--env',
          'prep',
          '--vault',
          'os.secure',
          '--mech',
          'PERMANENT_VIA_REPLICA',
          '--vault-recipient',
          TEST_SSH_AGE_RECIPIENT,
          '--json',
        ],
        cwd: repo.path,
        env: { HOME: repo.path },
        stdin: 'prep-secret-value\n',
      }),
    );

    useBeforeAll(async () =>
      invokeRhachetCliBinary({
        args: ['keyrack', 'unlock', '--env', 'prep', '--key', 'PREP_SECRET'],
        cwd: repo.path,
        env: { HOME: repo.path },
      }),
    );

    when('[t0] status --env test (no keys in test, but keys in prep)', () => {
      const result = useThen('status succeeds', () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'status', '--env', 'test'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exit code is 0', () => {
        expect(result.status).toBe(0);
      });

      then('output shows no keys in test with hint to try prep', () => {
        // hint format: "(no keys in --env test, try --env prep)"
        expect(result.stdout).toContain('no keys in --env test');
        expect(result.stdout).toContain('try --env prep');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case4] status --env shows no hint when only sudo keys exist', () => {
    // kill daemon for clean state
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'minimal' });
      // init keyrack
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: r.path,
        env: { HOME: r.path },
      });
      return r;
    });

    // set and unlock a key ONLY in env=sudo (sudo is filtered from hints)
    useBeforeAll(async () =>
      invokeRhachetCliBinary({
        args: [
          'keyrack',
          'set',
          '--key',
          'ONLY_SUDO_KEY',
          '--env',
          'sudo',
          '--vault',
          'os.secure',
          '--mech',
          'PERMANENT_VIA_REPLICA',
          '--vault-recipient',
          TEST_SSH_AGE_RECIPIENT,
          '--org',
          '@all',
          '--json',
        ],
        cwd: repo.path,
        env: { HOME: repo.path },
        stdin: 'only-sudo-secret\n',
      }),
    );

    useBeforeAll(async () =>
      invokeRhachetCliBinary({
        args: ['keyrack', 'unlock', '--env', 'sudo', '--key', 'ONLY_SUDO_KEY'],
        cwd: repo.path,
        env: { HOME: repo.path },
      }),
    );

    when('[t0] status --env test (no keys in test, only sudo keys exist)', () => {
      const result = useThen('status succeeds', () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'status', '--env', 'test'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exit code is 0', () => {
        expect(result.status).toBe(0);
      });

      then('output shows no keys in test WITHOUT hint (sudo is silent)', () => {
        // sudo keys are filtered from hints, so no hint appears
        expect(result.stdout).toContain('no keys in --env test');
        expect(result.stdout).not.toContain('try --env');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case5] status with --env in isolated env (daemon inactive)', () => {
    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'minimal' });
      // init keyrack so we have valid config
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: r.path,
        env: { HOME: r.path },
      });
      return r;
    });

    when('[t0] status is called with --env test (daemon inactive)', () => {
      const result = useThen('command succeeds', () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'status', '--env', 'test'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exit code is 0', () => {
        expect(result.status).toBe(0);
      });

      then('output shows daemon not found', () => {
        expect(result.stdout).toContain('daemon');
        expect(result.stdout).toMatch(/not found/i);
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });
});
