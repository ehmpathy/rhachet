import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';

describe('rhachet run', () => {
  given('[case1] repo with skills', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-skills' }),
    );

    when('[t0] run --skill say-hello', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['run', '--skill', 'say-hello'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('outputs skill discovery log', () => {
        expect(result.stdout).toContain('say-hello');
      });
    });

    when('[t1] run --skill say-hello with positional arg', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['run', '--skill', 'say-hello', 'claude'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });
    });

    when('[t2] run --skill nonexistent', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['run', '--skill', 'nonexistent'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('stderr contains error message', () => {
        expect(result.stderr).toContain('nonexistent');
      });
    });

    when('[t3] run without --skill', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['run'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });
    });

    when('[t4] run --skill echo-args --help (help flag passthrough)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['run', '--skill', 'echo-args', '--help'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('--help is passed through to skill (not intercepted by rhachet)', () => {
        // skill outputs "args: $@" so --help should appear after "args:"
        expect(result.stdout).toMatch(/args:.*--help/);
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case2] repo with registry', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-registry' }),
    );

    when('[t0] run --skill say-hello', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['run', '--skill', 'say-hello'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });
    });
  });

  given('[case3] minimal repo', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'minimal' }),
    );

    when('[t0] run --skill any', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['run', '--skill', 'any'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('exits with non-zero status (no skills found)', () => {
        expect(result.status).not.toEqual(0);
      });
    });
  });

  given('[case4] repo with exit-code skill', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-skills' }),
    );

    when('[t0] run --skill exit-code --code 0', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['run', '--skill', 'exit-code', '--code', '0'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });
    });

    when('[t1] run --skill exit-code --code 2', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['run', '--skill', 'exit-code', '--code', '2'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('exits with status 2 (not 1)', () => {
        expect(result.status).toEqual(2);
      });
    });

    when('[t2] run --skill exit-code --code 7', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['run', '--skill', 'exit-code', '--code', '7'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('exits with status 7 (preserves original exit code)', () => {
        expect(result.status).toEqual(7);
      });
    });

    when('[t3] run --skill exit-code --code 127', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['run', '--skill', 'exit-code', '--code', '127'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('exits with status 127 (command not found convention)', () => {
        expect(result.status).toEqual(127);
      });
    });
  });

  given('[case5] repo with skills and --attempts flag', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-skills' }),
    );

    when('[t0] run --skill say-hello --attempts 3', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['run', '--skill', 'say-hello', '--attempts', '3'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('stderr contains helpful error about --attempts not supported', () => {
        expect(result.stderr).toContain('--attempts is not supported');
      });

      then('stderr suggests using ask or act instead', () => {
        expect(result.stderr).toMatch(/ask.*--attempts|act.*--attempts/);
      });
    });
  });

  given('[case6] short flags on run (`-r`/`-s`) after the enroll `-r` fix', () => {
    // regression clamp: the `--roles` fix made the argv preprocessor recognize
    // `-r`. `-r` is ALSO run's `--role` alias, so a command-blind encode would
    // rewrite the later `-s` (`--skill`) into a `\u0000s` null byte and break
    // run. this proves run's short flags parse identically to the long form.
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-skills' }),
    );

    when('[t0] `run -r any -s say-hello` (short-flag form)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['run', '-r', 'any', '-s', 'say-hello'],
          cwd: repo.path,
        }),
      );

      then('the short flags parse — no null byte leaks into stderr', () => {
        expect(result.stderr).not.toContain('\u0000');
      });

      then('`-s` is understood — no absent-`--skill` option error', () => {
        expect(result.stderr).not.toContain("required option '-s");
        expect(result.stderr).not.toContain('required option');
      });

      then('exits 0 — parses identically to `--role any --skill say-hello`', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('say-hello');
      });

      then('the short-flag stderr is locked to a snapshot', () => {
        // snapshot the caller-faced stderr so a reviewer sees the exact `-r`/`-s`
        // output in the pr diff and any future drift surfaces — mirrors the
        // clamp pattern act/ask use for the same short-flag regression
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });
});
