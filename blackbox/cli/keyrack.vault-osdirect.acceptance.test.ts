import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

describe('keyrack vault-osdirect', () => {
  // kill any stale daemon to ensure fresh daemon with current code
  beforeAll(() => killKeyrackDaemonForTests());

  /**
   * [uc3] unlock with --env filter
   * [uc4] get with --env filter
   * [uc7] export preserves raw key names
   */
  given('[case2] repo with multi-env and os.direct vault configured', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-multi-env' }),
    );

    // ensure daemon cache is cleared before each test for consistent vault source
    beforeEach(async () => {
      await invokeRhachetCliBinary({
        args: ['keyrack', 'relock'],
        cwd: repo.path,
        env: { HOME: repo.path },
        logOnError: false,
      });
    });

    when('[t0] get --for repo --env prep --json (without unlock)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--for', 'repo', '--env', 'prep', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 2 (locked keys exit non-zero)', () => {
        expect(result.status).toEqual(2);
      });

      then('returns locked status for prep keys (vault keys require unlock)', () => {
        const parsed = JSON.parse(result.stdout);
        expect(Array.isArray(parsed)).toBe(true);
        const locked = parsed.filter(
          (a: { status: string }) => a.status === 'locked',
        );
        // .note = 2 locked = 2 prep-specific (env=all key has no vault entry, so it's absent)
        expect(locked.length).toEqual(2);
      });

      then('does NOT contain prod keys', () => {
        const parsed = JSON.parse(result.stdout);
        const prodAttempts = parsed.filter(
          (a: { slug?: string }) => a.slug?.includes('.prod.'),
        );
        expect(prodAttempts.length).toEqual(0);
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });

    when('[t0.5] unlock prep then get --for repo --env prep --json', () => {
      // unlock prep keys into daemon
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'prep'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--for', 'repo', '--env', 'prep', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('returns granted status for prep keys after unlock', () => {
        const parsed = JSON.parse(result.stdout);
        const granted = parsed.filter(
          (a: { status: string }) => a.status === 'granted',
        );
        expect(granted.length).toEqual(2);
      });

      then('contains prep SHARED_API_KEY with prep value', () => {
        const parsed = JSON.parse(result.stdout);
        const attempt = parsed.find(
          (a: { grant?: { slug: string } }) =>
            a.grant?.slug === 'testorg.prep.SHARED_API_KEY',
        );
        expect(attempt).toBeDefined();
        expect(attempt.status).toEqual('granted');
        expect(attempt.grant.key.secret).toEqual('sk-shared-prep-xyz789');
      });

      then('contains prep AWS_PROFILE with prep value', () => {
        const parsed = JSON.parse(result.stdout);
        const attempt = parsed.find(
          (a: { grant?: { slug: string } }) =>
            a.grant?.slug === 'testorg.prep.AWS_PROFILE',
        );
        expect(attempt).toBeDefined();
        expect(attempt.status).toEqual('granted');
        expect(attempt.grant.key.secret).toEqual('testorg.prep');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });

    when('[t1] get --for repo --env prod --json (without unlock)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--for', 'repo', '--env', 'prod', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 2 (locked keys exit non-zero)', () => {
        expect(result.status).toEqual(2);
      });

      then('returns locked status for prod keys (vault keys require unlock)', () => {
        const parsed = JSON.parse(result.stdout);
        const locked = parsed.filter(
          (a: { status: string }) => a.status === 'locked',
        );
        // .note = 2 locked = 2 prod-specific (env=all key has no vault entry, so it's absent)
        expect(locked.length).toEqual(2);
      });

      then('does NOT contain prep keys', () => {
        const parsed = JSON.parse(result.stdout);
        const prepAttempts = parsed.filter(
          (a: { slug?: string }) => a.slug?.includes('.prep.'),
        );
        expect(prepAttempts.length).toEqual(0);
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });

    when('[t1.5] unlock prod then get --for repo --env prod --json', () => {
      // unlock prod keys into daemon
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'prod'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--for', 'repo', '--env', 'prod', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('returns granted status for prod keys after unlock', () => {
        const parsed = JSON.parse(result.stdout);
        const granted = parsed.filter(
          (a: { status: string }) => a.status === 'granted',
        );
        expect(granted.length).toEqual(2);
      });

      then('contains prod SHARED_API_KEY with prod value', () => {
        const parsed = JSON.parse(result.stdout);
        const attempt = parsed.find(
          (a: { grant?: { slug: string } }) =>
            a.grant?.slug === 'testorg.prod.SHARED_API_KEY',
        );
        expect(attempt).toBeDefined();
        expect(attempt.grant.key.secret).toEqual('sk-shared-prod-abc123');
      });

      then('contains prod AWS_PROFILE with prod value', () => {
        const parsed = JSON.parse(result.stdout);
        const attempt = parsed.find(
          (a: { grant?: { slug: string } }) =>
            a.grant?.slug === 'testorg.prod.AWS_PROFILE',
        );
        expect(attempt).toBeDefined();
        expect(attempt.grant.key.secret).toEqual('testorg.prod');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });

    when('[t2] unlock all then get --for repo --env all --json', () => {
      // unlock all keys into daemon
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'all'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--for', 'repo', '--env', 'all', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 2 (contains locked key testorg.all.SHARED_API_KEY)', () => {
        expect(result.status).toEqual(2);
      });

      then('returns 4 granted keys (2 per env)', () => {
        const parsed = JSON.parse(result.stdout);
        const granted = parsed.filter(
          (a: { status: string }) => a.status === 'granted',
        );
        expect(granted.length).toEqual(4);
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });

    when('[t3] get --for repo --env prep (human readable, without unlock)', () => {
      // relock to clear daemon keys from t2 unlock
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'relock'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--for', 'repo', '--env', 'prep'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 2 (locked keys exit non-zero)', () => {
        expect(result.status).toEqual(2);
      });

      then('output contains locked indicator', () => {
        expect(result.stdout).toContain('locked');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });
});
