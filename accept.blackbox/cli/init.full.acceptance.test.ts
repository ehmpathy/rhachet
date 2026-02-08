import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/accept.blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/accept.blackbox/.test/infra/invokeRhachetCliBinary';

describe('rhachet init (full output)', () => {
  given('[case1] repo with multiple roles, inits, and hooks', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-roles-full' }),
    );

    when('[t0] init --roles tester reviewer --hooks', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['init', '--roles', 'tester', 'reviewer', '--hooks'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout contains link blocks for both roles', () => {
        expect(result.stdout).toContain('repo=test/role=tester');
        expect(result.stdout).toContain('repo=test/role=reviewer');
      });

      then('stdout contains init block for tester', () => {
        expect(result.stdout).toContain('init role repo=test/role=tester');
      });

      then('stdout shows roles linked and initialized', () => {
        expect(result.stdout).toContain('2 role(s) linked');
      });

      then('stdout shows hooks applied', () => {
        expect(result.stdout).toContain('hooks');
        expect(result.stdout).toContain('created');
      });

      then('full stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });
});
