import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

describe('keyrack env-isolation', () => {
  // kill any stale daemon to ensure fresh daemon with current code
  beforeAll(() => killKeyrackDaemonForTests());

  /**
   * [uc8] env isolation security
   * os.envvar vault takes precedence, but here we test that
   * env-scoped get only returns keys for the requested env
   */
  given('[case4] env isolation via get --env filter', () => {
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

    when('[t0] unlock prep then get --for repo --env prep --json', () => {
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
});
