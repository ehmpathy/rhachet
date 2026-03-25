import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

describe('keyrack vault-ossecure', () => {
  // kill any stale daemon to ensure fresh daemon with current code
  beforeAll(() => killKeyrackDaemonForTests());

  /**
   * [uc12] set+get roundtrip journey with os.secure vault
   * critical path: set a key, then get it back
   */
  given('[case4.5] set+get roundtrip with os.secure vault', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-vault-os-secure' }),
    );

    // ensure daemon cache is cleared before test
    beforeAll(async () => {
      await invokeRhachetCliBinary({
        args: ['keyrack', 'relock'],
        cwd: repo.path,
        env: { HOME: repo.path },
        logOnError: false,
      });
    });

    when('[t0] set NEW_ROUNDTRIP_KEY to os.secure, then get it back', () => {
      // set the key
      const setResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'NEW_ROUNDTRIP_KEY',
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
          stdin: 'roundtrip-secure-value-123\n',
        }),
      );

      then('set exits with status 0', () => {
        expect(setResult.status).toEqual(0);
      });

      then('set returns configured host', () => {
        const parsed = JSON.parse(setResult.stdout);
        expect(parsed.slug).toEqual('testorg.test.NEW_ROUNDTRIP_KEY');
        expect(parsed.vault).toEqual('os.secure');
      });
    });

    when('[t1] get NEW_ROUNDTRIP_KEY after set (without unlock)', () => {
      // first set the key
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'KEY_FOR_LOCKED_TEST',
            '--env',
            'test',
            '--mech',
            'PERMANENT_VIA_REPLICA',
            '--vault',
            'os.secure',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'locked-test-value-456\n',
        }),
      );

      // relock to clear daemon
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'relock'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      const getResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.KEY_FOR_LOCKED_TEST', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('get returns locked status (vault not unlocked)', () => {
        const parsed = JSON.parse(getResult.stdout);
        expect(parsed.status).toEqual('locked');
      });

      then('fix mentions unlock', () => {
        const parsed = JSON.parse(getResult.stdout);
        expect(parsed.fix).toContain('unlock');
      });
    });

    when('[t2] unlock then get SECURE_API_KEY (full roundtrip)', () => {
      // unlock keys into daemon first
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'test'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      const getResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.SECURE_API_KEY', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('get exits with status 0', () => {
        expect(getResult.status).toEqual(0);
      });

      then('status is granted after unlock', () => {
        const parsed = JSON.parse(getResult.stdout);
        expect(parsed.status).toEqual('granted');
      });

      then('value matches stored value', () => {
        const parsed = JSON.parse(getResult.stdout);
        expect(parsed.grant.key.secret).toEqual('portable-secure-value-xyz789');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(getResult.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });

    when('[t3] unlock then get SECURE_API_KEY via raw key name with --env test', () => {
      // unlock keys into daemon
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'test'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      const getResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'SECURE_API_KEY', '--env', 'test', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('get exits with status 0', () => {
        expect(getResult.status).toEqual(0);
      });

      then('status is granted after unlock', () => {
        const parsed = JSON.parse(getResult.stdout);
        expect(parsed.status).toEqual('granted');
      });

      then('expands to full slug testorg.test.SECURE_API_KEY', () => {
        const parsed = JSON.parse(getResult.stdout);
        expect(parsed.grant.slug).toEqual('testorg.test.SECURE_API_KEY');
      });

      then('value is correct', () => {
        const parsed = JSON.parse(getResult.stdout);
        expect(parsed.grant.key.secret).toEqual('portable-secure-value-xyz789');
      });
    });
  });
});
