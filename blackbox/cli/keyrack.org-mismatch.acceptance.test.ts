import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

describe('keyrack org-mismatch', () => {
  // kill any stale daemon to ensure fresh daemon with current code
  beforeAll(() => killKeyrackDaemonForTests());

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
            'PERMANENT_VIA_REPLICA',
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

    when('[t1] set --key AWS_PROFILE --org @this (valid match)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'AWS_PROFILE',
            '--org',
            '@this',
            '--env',
            'prod',
            '--mech',
            'PERMANENT_VIA_REPLICA',
            '--vault',
            'os.direct',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'test-aws-profile-value\n',
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        // redact timestamps for stable snapshots
        if (parsed.createdAt) parsed.createdAt = '__TIMESTAMP__';
        if (parsed.updatedAt) parsed.updatedAt = '__TIMESTAMP__';
        expect(parsed).toMatchSnapshot();
      });
    });
  });
});
