import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

describe('keyrack list', () => {
  // kill any stale daemon to ensure fresh daemon with current code
  beforeAll(() => killKeyrackDaemonForTests());

  /**
   * [uc6] list with env awareness
   */
  given('[case9] list with multi-env repo', () => {
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
