import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/accept.blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/accept.blackbox/.test/infra/invokeRhachetCliBinary';

describe('rhachet init', () => {
  given('[case1] repo without rhachet.use.ts and without rhachet-roles packages', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'without-roles-packages' }),
    );

    when('[t0] init --roles mechanic', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['init', '--roles', 'mechanic'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('stderr contains error about no packages found', () => {
        expect(result.stderr).toContain('no rhachet-roles');
      });
    });
  });

  given('[case2] repo with rhachet-roles packages installed', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-roles-packages' }),
    );

    when('[t0] init --roles tester', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['init', '--roles', 'tester'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout contains role link message', () => {
        expect(result.stdout).toContain('init 1 role');
      });

      then('stdout contains role path in output', () => {
        expect(result.stdout).toContain('test/tester');
      });

      then('stdout shows roles linked and initialized', () => {
        expect(result.stdout).toContain('1 role(s) linked');
        expect(result.stdout).toContain('1 role(s) initialized');
      });
    });

    when('[t1] init without --roles flag', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['init'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout contains usage instructions', () => {
        expect(result.stdout).toContain('--roles');
      });

      then('stdout lists available roles', () => {
        expect(result.stdout).toContain('tester');
      });
    });
  });
});
