import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';

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

  given('[case2] repo with broken roles package and valid roles package', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-broken-roles-package' }),
    );

    when('[t0] init --roles tester (skips broken package)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['init', '--roles', 'tester'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('exits with non-zero status (package error)', () => {
        expect(result.status).not.toEqual(0);
      });

      then('stdout reports broken package error', () => {
        expect(result.stdout).toContain('package(s) failed to load');
        expect(result.stdout).toContain('broken');
        expect(result.stdout).toContain('rhachet.repo.yml not found');
      });

      then('stdout contains role link message for tester', () => {
        expect(result.stdout).toContain('repo=test/role=tester');
      });

      then('stdout shows 1 role linked', () => {
        expect(result.stdout).toContain('1 role(s) linked');
      });

      then('stdout shows total errors', () => {
        expect(result.stdout).toContain('error(s) occurred');
      });
    });
  });

  given('[case3] repo with broken import package (has manifest, broken import)', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-broken-import-package' }),
    );

    when('[t0] init --roles broken (role link succeeds via manifest)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['init', '--roles', 'broken'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('exits with status 0 (manifest-based, no import)', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout shows role linked', () => {
        expect(result.stdout).toContain('1 role(s) linked');
      });
    });

    when('[t1] init --roles broken --hooks (hooks flow imports and fails)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['init', '--roles', 'broken', '--hooks'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('exits with non-zero status (hook errors propagate)', () => {
        expect(result.status).not.toEqual(0);
      });

      then('stdout reports hook discovery error loud and proud', () => {
        expect(result.stdout).toContain('hook discovery error');
        expect(result.stdout).toContain('broken-import');
        expect(result.stdout).toContain('nonexistent-package');
      });

      then('stdout shows no roles with hooks (error prevented load)', () => {
        expect(result.stdout).toContain('no roles with hooks found');
      });
    });
  });

  given('[case4] repo with rhachet-roles packages installed', () => {
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
        expect(result.stdout).toContain('repo=test/role=tester');
      });

      then('stdout shows roles linked and initialized', () => {
        expect(result.stdout).toContain('1 role(s) linked');
        expect(result.stdout).toContain('1 role(s) initialized');
      });

      then('full stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
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
