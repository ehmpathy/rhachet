import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

describe('keyrack key-expansion', () => {
  // kill any stale daemon to ensure fresh daemon with current code
  beforeAll(() => killKeyrackDaemonForTests());

  /**
   * [uc7] export preserves raw key names
   */
  given('[case3] raw key name export via single key get', () => {
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

    when('[t0] get --key testorg.prep.AWS_PROFILE --json (without unlock)', () => {
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

      then('status is locked (vault key requires unlock)', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('locked');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });

    when('[t0.5] unlock prep then get --key testorg.prep.AWS_PROFILE --json', () => {
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

      then('status is granted after unlock', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('granted');
      });

      then('grant.slug contains raw key name AWS_PROFILE', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.slug).toEqual('testorg.prep.AWS_PROFILE');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });

    when('[t1] get --key testorg.prep.AWS_PROFILE (human readable, without unlock)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.prep.AWS_PROFILE'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('output contains locked and AWS_PROFILE', () => {
        expect(result.stdout).toContain('locked');
        expect(result.stdout).toContain('AWS_PROFILE');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc10] raw key name expansion
   * when user passes just the raw key name (not full slug),
   * keyrack should expand it to full slug based on env context
   */
  given('[case3.5] raw key name expansion with --key', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-multi-env' }),
    );

    // ensure daemon cache is cleared before each test
    beforeEach(async () => {
      await invokeRhachetCliBinary({
        args: ['keyrack', 'relock'],
        cwd: repo.path,
        env: { HOME: repo.path },
        logOnError: false,
      });
    });

    /**
     * [uc5] get requires --env when key exists in multiple envs
     *
     * .note = per spec.key-get-behavior.md usecase.5:
     *         get MUST fail-fast when --env is omitted
     *         - no default env inference
     *         - error tells user to specify --env
     *
     * implementation: when key found in multiple envs, error says
     *   "found in multiple envs: ... specify --env to disambiguate"
     *
     * this satisfies the spec requirement that --env is required
     */
    when('[t0] get --key AWS_PROFILE without --env (fail-fast)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'AWS_PROFILE'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('exits with non-zero status (error)', () => {
        expect(result.status).not.toEqual(0);
      });

      then('error tells user to specify --env', () => {
        const output = result.stdout + result.stderr;
        expect(output).toContain('--env');
        // impl says "specify --env to disambiguate" when key in multiple envs
        expect(output.toLowerCase()).toContain('disambiguate');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] get --key AWS_PROFILE --env prep (without unlock)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'AWS_PROFILE', '--env', 'prep', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 2 (locked keys exit non-zero)', () => {
        expect(result.status).toEqual(2);
      });

      then('status is locked (vault key requires unlock)', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('locked');
      });
    });

    when('[t1.5] unlock prep then get --key AWS_PROFILE --env prep', () => {
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
          args: ['keyrack', 'get', '--key', 'AWS_PROFILE', '--env', 'prep', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('status is granted after unlock', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('granted');
      });

      then('expands to full slug testorg.prep.AWS_PROFILE', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.slug).toEqual('testorg.prep.AWS_PROFILE');
      });

      then('returns prep value', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.key.secret).toEqual('testorg.prep');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });

    when('[t2] unlock prod then get --key SHARED_API_KEY --env prod', () => {
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
          args: ['keyrack', 'get', '--key', 'SHARED_API_KEY', '--env', 'prod', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('expands to full slug testorg.prod.SHARED_API_KEY', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.slug).toEqual('testorg.prod.SHARED_API_KEY');
      });

      then('returns prod value', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.key.secret).toEqual('sk-shared-prod-abc123');
      });
    });
  });
});
