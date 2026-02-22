import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';

describe('rhx', () => {
  given('[case1] repo with skills', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-skills' }),
    );

    when('[t0] rhx say-hello', () => {
      const rhxResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['say-hello'],
          cwd: repo.path,
        }),
      );
      const rhachetResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['run', '--skill', 'say-hello'],
          cwd: repo.path,
        }),
      );

      then('rhx exits with status 0', () => {
        expect(rhxResult.status).toEqual(0);
      });

      then('rhx output matches rhachet run --skill output', () => {
        expect(rhxResult.stdout).toEqual(rhachetResult.stdout);
      });

      then('rhx exit code matches rhachet run --skill exit code', () => {
        expect(rhxResult.status).toEqual(rhachetResult.status);
      });
    });

    when('[t1] rhx say-hello with positional arg', () => {
      const rhxResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['say-hello', 'claude'],
          cwd: repo.path,
        }),
      );
      const rhachetResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['run', '--skill', 'say-hello', 'claude'],
          cwd: repo.path,
        }),
      );

      then('rhx exits with status 0', () => {
        expect(rhxResult.status).toEqual(0);
      });

      then('rhx output matches rhachet run --skill output', () => {
        expect(rhxResult.stdout).toEqual(rhachetResult.stdout);
      });
    });

    when('[t2] rhx nonexistent', () => {
      const rhxResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['nonexistent'],
          cwd: repo.path,
          logOnError: false,
        }),
      );
      const rhachetResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['run', '--skill', 'nonexistent'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('rhx exits with non-zero status', () => {
        expect(rhxResult.status).not.toEqual(0);
      });

      then('rhx stderr contains error message', () => {
        expect(rhxResult.stderr).toContain('nonexistent');
      });

      then('rhx exit code matches rhachet run --skill exit code', () => {
        expect(rhxResult.status).toEqual(rhachetResult.status);
      });
    });

    when('[t3] rhx echo-args with multiple args', () => {
      const rhxResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['echo-args', 'foo', 'bar', 'baz'],
          cwd: repo.path,
        }),
      );
      const rhachetResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['run', '--skill', 'echo-args', 'foo', 'bar', 'baz'],
          cwd: repo.path,
        }),
      );

      then('rhx exits with status 0', () => {
        expect(rhxResult.status).toEqual(0);
      });

      then('rhx output matches rhachet run --skill output', () => {
        expect(rhxResult.stdout).toEqual(rhachetResult.stdout);
      });
    });
  });

  given('[case2] repo with exit-code skill', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-skills' }),
    );

    when('[t0] rhx exit-code --code 0', () => {
      const rhxResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['exit-code', '--code', '0'],
          cwd: repo.path,
        }),
      );

      then('rhx exits with status 0', () => {
        expect(rhxResult.status).toEqual(0);
      });
    });

    when('[t1] rhx exit-code --code 7', () => {
      const rhxResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['exit-code', '--code', '7'],
          cwd: repo.path,
          logOnError: false,
        }),
      );
      const rhachetResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['run', '--skill', 'exit-code', '--code', '7'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('rhx exit code matches rhachet run --skill exit code', () => {
        expect(rhxResult.status).toEqual(rhachetResult.status);
      });

      then('rhx preserves original exit code', () => {
        expect(rhxResult.status).toEqual(7);
      });
    });
  });

  given('[case3] rhx upgrade short-circuit', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'minimal' }),
    );

    when('[t0] rhx upgrade --help', () => {
      const rhxResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['upgrade', '--help'],
          cwd: repo.path,
        }),
      );
      const rhachetResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['upgrade', '--help'],
          cwd: repo.path,
        }),
      );

      then('rhx exits with status 0', () => {
        expect(rhxResult.status).toEqual(0);
      });

      then('rhx output matches rhachet upgrade output', () => {
        expect(rhxResult.stdout).toEqual(rhachetResult.stdout);
      });

      then('rhx exit code matches rhachet upgrade exit code', () => {
        expect(rhxResult.status).toEqual(rhachetResult.status);
      });

      then('stdout contains --self option (confirms upgrade command)', () => {
        expect(rhxResult.stdout).toContain('--self');
      });

      then('stdout contains --roles option (confirms upgrade command)', () => {
        expect(rhxResult.stdout).toContain('--roles');
      });
    });

    when('[t1] rhx upgrade (without args)', () => {
      const rhxResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['upgrade'],
          cwd: repo.path,
          logOnError: false,
        }),
      );
      const rhachetResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['upgrade'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('does NOT fail with "skill not found" error', () => {
        // if rhx upgrade went through skill path, it would fail with "not found"
        // since there's no skill called "upgrade"
        expect(rhxResult.stderr).not.toContain('not found');
        expect(rhxResult.stderr).not.toContain('skill');
      });

      then('rhx output matches rhachet upgrade output', () => {
        expect(rhxResult.stdout).toEqual(rhachetResult.stdout);
      });

      then('rhx exit code matches rhachet upgrade exit code', () => {
        expect(rhxResult.status).toEqual(rhachetResult.status);
      });
    });
  });
});
