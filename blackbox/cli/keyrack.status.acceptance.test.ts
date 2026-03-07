import { given, then, useBeforeAll, when } from 'test-fns';

import {
  genTestTempRepo,
  TEST_SSH_AGE_RECIPIENT,
} from '@/blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

/**
 * .what = tests locked vs absent status distinction
 * .why = users need clear guidance on whether to set or unlock
 *
 * .note = "absent" means key was never set (no vault file)
 * .note = "locked" means key was set but daemon needs unlock
 */
describe('keyrack status: locked vs absent', () => {
  // kill any stale daemon to ensure fresh code is used
  beforeAll(() => {
    killKeyrackDaemonForTests({ owner: null });
  });

  /**
   * [uc1] absent: key was never set
   * get returns absent with guidance to set first
   */
  given('[case1] key was never set (truly absent)', () => {
    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'minimal' });
      // init keyrack so we have encrypted manifest and recipients
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: r.path,
        env: { HOME: r.path },
      });
      return r;
    });

    when('[t0] get --key NONEXISTENT_KEY --env sudo --json', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'NONEXISTENT_KEY',
            '--env',
            'sudo',
            '--org',
            '@all',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('status is absent', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('absent');
      });

      then('message guides user to set', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.message).toContain('does not exist');
        expect(parsed.message).toContain('set it first');
      });

      then('fix contains set command', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.fix).toContain('set');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc2] locked: key was set but needs unlock
   * get returns locked with guidance to unlock first
   */
  given('[case2] key was set but not unlocked (locked)', () => {
    // kill daemon to ensure clean state
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

    // set the key first (creates vault file) - use sudo env to bypass keyrack.yml requirement
    const setResult = useBeforeAll(async () =>
      invokeRhachetCliBinary({
        args: [
          'keyrack',
          'set',
          '--key',
          'LOCKED_KEY',
          '--env',
          'sudo',
          '--vault',
          'os.secure',
          '--vault-recipient',
          TEST_SSH_AGE_RECIPIENT,
          '--org',
          '@all',
          '--json',
        ],
        cwd: repo.path,
        env: { HOME: repo.path },
        stdin: 'locked-secret-value\n',
      }),
    );

    when('[t0] set creates the key', () => {
      then('set exits with status 0', () => {
        expect(setResult.status).toEqual(0);
      });
    });

    when('[t1] get --key LOCKED_KEY --env sudo --json (after set, before unlock)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'LOCKED_KEY',
            '--env',
            'sudo',
            '--org',
            '@all',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('status is locked (not absent)', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('locked');
      });

      then('message guides user to unlock', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.message).toContain('locked');
        expect(parsed.message).toContain('unlock it first');
      });

      then('fix contains unlock command', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.fix).toContain('unlock');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc3] set invalidates daemon cache (relock on set)
   * ensures stale values are not returned after set overwrites
   */
  given('[case3] set invalidates daemon cache (relock)', () => {
    // kill daemon to ensure clean state
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

    // set initial value - use sudo env to bypass keyrack.yml requirement
    useBeforeAll(async () =>
      invokeRhachetCliBinary({
        args: [
          'keyrack',
          'set',
          '--key',
          'RELOCK_TEST_KEY',
          '--env',
          'sudo',
          '--vault',
          'os.secure',
          '--vault-recipient',
          TEST_SSH_AGE_RECIPIENT,
          '--org',
          '@all',
          '--json',
        ],
        cwd: repo.path,
        env: { HOME: repo.path },
        stdin: 'initial-value\n',
      }),
    );

    // unlock to cache initial value in daemon
    useBeforeAll(async () =>
      invokeRhachetCliBinary({
        args: ['keyrack', 'unlock', '--env', 'sudo', '--key', 'RELOCK_TEST_KEY'],
        cwd: repo.path,
        env: { HOME: repo.path },
      }),
    );

    when('[t0] get returns initial value from daemon', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'RELOCK_TEST_KEY',
            '--env',
            'sudo',
            '--org',
            '@all',
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

      then('value is initial-value', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.key.secret).toEqual('initial-value');
      });
    });

    when('[t1] set overwrites with new value', () => {
      const setResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'RELOCK_TEST_KEY',
            '--env',
            'sudo',
            '--vault',
            'os.secure',
            '--vault-recipient',
            TEST_SSH_AGE_RECIPIENT,
            '--org',
            '@all',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'updated-value\n',
        }),
      );

      then('set exits with status 0', () => {
        expect(setResult.status).toEqual(0);
      });
    });

    when('[t2] get after set returns locked (not stale value)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'RELOCK_TEST_KEY',
            '--env',
            'sudo',
            '--org',
            '@all',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('status is locked (daemon cache was invalidated)', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('locked');
      });

      then('does NOT return stale value', () => {
        expect(result.stdout).not.toContain('initial-value');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });

    when('[t3] unlock then get returns updated value', () => {
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'sudo', '--key', 'RELOCK_TEST_KEY'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'RELOCK_TEST_KEY',
            '--env',
            'sudo',
            '--org',
            '@all',
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

      then('value is updated-value', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.key.secret).toEqual('updated-value');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });
  });
});
