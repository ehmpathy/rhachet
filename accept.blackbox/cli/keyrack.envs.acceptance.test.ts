import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/accept.blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/accept.blackbox/.test/infra/invokeRhachetCliBinary';

describe('keyrack envs', () => {
  /**
   * [uc9] --env required when env-specific sections exist
   */
  given('[case1] repo with multi-env keyrack.yml (prod + prep)', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-multi-env' }),
    );

    when('[t0] unlock without --env', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('error mentions --env is required', () => {
        const output = result.stdout + result.stderr;
        expect(output).toContain('--env');
      });

      then('error lists available envs', () => {
        const output = result.stdout + result.stderr;
        expect(output).toContain('prod');
        expect(output).toContain('prep');
      });

      then('stdout matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] get --for repo without --env', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--for', 'repo'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('error mentions --env is required', () => {
        const output = result.stdout + result.stderr;
        expect(output).toContain('--env');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t2] get --for repo --json without --env', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--for', 'repo', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc3] unlock with --env filter
   * [uc4] get with --env filter
   * [uc7] export preserves raw key names
   */
  given('[case2] repo with multi-env and os.direct vault configured', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-multi-env' }),
    );

    when('[t0] get --for repo --env prep --json', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--for', 'repo', '--env', 'prep', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('returns granted status for prep keys', () => {
        const parsed = JSON.parse(result.stdout);
        expect(Array.isArray(parsed)).toBe(true);
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

      then('does NOT contain prod keys', () => {
        const parsed = JSON.parse(result.stdout);
        const prodAttempts = parsed.filter(
          (a: { grant?: { slug: string } }) =>
            a.grant?.slug?.includes('.prod.'),
        );
        expect(prodAttempts.length).toEqual(0);
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });

    when('[t1] get --for repo --env prod --json', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--for', 'repo', '--env', 'prod', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('returns granted status for prod keys', () => {
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

      then('does NOT contain prep keys', () => {
        const parsed = JSON.parse(result.stdout);
        const prepAttempts = parsed.filter(
          (a: { grant?: { slug: string } }) =>
            a.grant?.slug?.includes('.prep.'),
        );
        expect(prepAttempts.length).toEqual(0);
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });

    when('[t2] get --for repo --env all --json', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--for', 'repo', '--env', 'all', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
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

    when('[t3] get --for repo --env prep (human readable)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--for', 'repo', '--env', 'prep'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output contains granted indicator', () => {
        expect(result.stdout).toContain('granted');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc7] export preserves raw key names
   */
  given('[case3] raw key name export via single key get', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-multi-env' }),
    );

    when('[t0] get --key testorg.prep.AWS_PROFILE --json', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'testorg.prep.AWS_PROFILE',
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

      then('grant.slug contains raw key name AWS_PROFILE', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.slug).toEqual('testorg.prep.AWS_PROFILE');
        expect(parsed.grant.slug).toContain('AWS_PROFILE');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });

    when('[t1] get --key testorg.prep.AWS_PROFILE (human readable)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.prep.AWS_PROFILE'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('output contains granted and AWS_PROFILE', () => {
        expect(result.stdout).toContain('granted');
        expect(result.stdout).toContain('AWS_PROFILE');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc8] env isolation security
   * os.envvar vault takes precedence, but here we test that
   * env-scoped get only returns keys for the requested env
   */
  given('[case4] env isolation via get --env filter', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-multi-env' }),
    );

    when('[t0] get --for repo --env prep --json (prep only)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--for', 'repo', '--env', 'prep', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('all returned keys are prep-scoped', () => {
        const parsed = JSON.parse(result.stdout);
        for (const attempt of parsed) {
          if (attempt.grant) {
            expect(attempt.grant.slug).toContain('.prep.');
          }
        }
      });

      then('no prod keys leak into prep response', () => {
        const raw = result.stdout;
        expect(raw).not.toContain('"testorg.prod.');
      });
    });
  });

  /**
   * [uc3] unlock with --env filter
   */
  given('[case5] unlock with env filter', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-multi-env' }),
    );

    when('[t0] unlock --env prep', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'prep'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output mentions prep', () => {
        const output = result.stdout + result.stderr;
        expect(output.toLowerCase()).toContain('prep');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] unlock --env all', () => {
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

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc5] set with --org mismatch
   */
  given('[case6] set with org mismatch', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-multi-env' }),
    );

    when('[t0] set --key AWS_PROFILE --org foreign-org --json', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'AWS_PROFILE',
            '--org',
            'foreign-org',
            '--mech',
            'REPLICA',
            '--vault',
            'os.direct',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('error mentions org mismatch', () => {
        const output = result.stdout + result.stderr;
        expect(output.toLowerCase()).toContain('org');
        expect(output).toContain('foreign-org');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] set --key AWS_PROFILE --org testorg (valid match)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'AWS_PROFILE',
            '--org',
            'testorg',
            '--env',
            'prod',
            '--mech',
            'REPLICA',
            '--vault',
            'os.direct',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        // redact timestamps for stable snapshots
        for (const entry of parsed) {
          if (entry.createdAt) entry.createdAt = '__TIMESTAMP__';
          if (entry.updatedAt) entry.updatedAt = '__TIMESTAMP__';
        }
        expect(parsed).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc11] flat keys: format rejection
   */
  given('[case7] repo with old flat keys: format', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-flat-keys' }),
    );

    when('[t0] get --for repo --json', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--for', 'repo', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('error mentions keys: format is not supported', () => {
        const output = result.stdout + result.stderr;
        expect(output.toLowerCase()).toMatch(/keys|format|supported|invalid/);
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] unlock', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc6] list with env awareness
   */
  given('[case8] list with multi-env repo', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-multi-env' }),
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

      then('output contains both prod and prep keys', () => {
        expect(result.stdout).toContain('AWS_PROFILE');
        expect(result.stdout).toContain('SHARED_API_KEY');
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

      then('json contains prod and prep hosts', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed['testorg.prod.AWS_PROFILE']).toBeDefined();
        expect(parsed['testorg.prep.AWS_PROFILE']).toBeDefined();
        expect(parsed['testorg.prod.SHARED_API_KEY']).toBeDefined();
        expect(parsed['testorg.prep.SHARED_API_KEY']).toBeDefined();
      });
    });
  });
});
