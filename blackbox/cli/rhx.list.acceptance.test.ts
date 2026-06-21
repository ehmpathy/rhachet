import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';

/**
 * .what = acceptance tests for rhx list command
 * .why = verifies rhx list discovers and displays skills in treestruct format
 */
describe('rhx list command', () => {
  given('[case1] repo with skills in multiple repos/roles', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-multi-skills' }),
    );

    when('[t0] rhx list is invoked', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['list'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('shows treestruct header', () => {
        expect(result.stdout).toContain('rhx list');
      });

      then('shows skill count', () => {
        expect(result.stdout).toMatch(/\d+ skills? found/);
      });

      then('shows repos', () => {
        expect(result.stdout).toContain('repo=.this');
        expect(result.stdout).toContain('repo=test');
      });

      then('shows roles', () => {
        expect(result.stdout).toContain('role=any');
        expect(result.stdout).toContain('role=mechanic');
        expect(result.stdout).toContain('role=designer');
      });

      then('shows skills', () => {
        expect(result.stdout).toContain('say-hello');
        expect(result.stdout).toContain('git.commit');
      });

      then('output matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] rhx list --help is invoked', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['list', '--help'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('shows list help with pattern option', () => {
        expect(result.stdout).toContain('pattern');
      });

      then('shows --repo option', () => {
        expect(result.stdout).toContain('--repo');
      });

      then('shows --role option', () => {
        expect(result.stdout).toContain('--role');
      });

      then('shows --all option', () => {
        expect(result.stdout).toContain('--all');
      });

      then('output matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t2] rhx list help is invoked', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['list', 'help'],
          cwd: repo.path,
        }),
      );

      then('shows same output as --help', () => {
        const helpResult = invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['list', '--help'],
          cwd: repo.path,
        });
        expect(result.stdout).toEqual(helpResult.stdout);
      });

      then('output matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t3] rhx list -h is invoked', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['list', '-h'],
          cwd: repo.path,
        }),
      );

      then('shows same output as --help', () => {
        const helpResult = invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['list', '--help'],
          cwd: repo.path,
        });
        expect(result.stdout).toEqual(helpResult.stdout);
      });

      then('output matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t4] rhx list with pattern is invoked', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['list', 'git'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('filters to git skills only', () => {
        expect(result.stdout).toContain('git.commit');
        expect(result.stdout).toContain('git.release');
        expect(result.stdout).not.toContain('wireframe');
      });

      then('output matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t5] rhx list --repo is invoked', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['list', '--repo', '.this'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('shows only .this repo skills', () => {
        expect(result.stdout).toContain('say-hello');
        expect(result.stdout).not.toContain('git.commit');
      });

      then('output matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t6] rhx list --role is invoked', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['list', '--role', 'designer'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('shows only designer role skills', () => {
        expect(result.stdout).toContain('wireframe');
        expect(result.stdout).toContain('mockup');
        expect(result.stdout).not.toContain('git.commit');
      });

      then('output matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t7] rhx list with nonexistent pattern is invoked', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['list', 'zzz-nonexistent-pattern-zzz'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('shows 0 skills found', () => {
        expect(result.stdout).toMatch(/0 skills? found/);
      });

      then('output matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t8] rhx list with glob pattern is invoked', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['list', 'git.*'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('filters to git.* skills only', () => {
        expect(result.stdout).toContain('git.commit');
        expect(result.stdout).toContain('git.release');
        expect(result.stdout).not.toContain('say-hello');
        expect(result.stdout).not.toContain('radio');
      });

      then('output matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t9] rhx list --all is invoked', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['list', '--all'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('shows all skills without truncation', () => {
        expect(result.stdout).toContain('say-hello');
        expect(result.stdout).toContain('git.commit');
        expect(result.stdout).toContain('radio');
      });

      then('output matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t10] rhx list with pattern and --repo filter is invoked', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['list', 'radio', '--repo', 'test'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('shows only radio skills from test repo', () => {
        expect(result.stdout).toContain('radio');
        expect(result.stdout).not.toContain('git.commit');
        expect(result.stdout).not.toContain('say-hello');
      });

      then('output matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case2] repo with no skills', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'minimal' }),
    );

    when('[t0] rhx list is invoked', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['list'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('shows 0 skills found', () => {
        expect(result.stdout).toMatch(/0 skills? found/);
      });

      then('output matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });
});
