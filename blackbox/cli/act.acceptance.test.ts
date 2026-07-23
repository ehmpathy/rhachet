import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';

describe('rhachet act', () => {
  given('[case1] repo with registry but no brains', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-registry' }),
    );

    when('[t0] act --role any --skill say-hello', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['act', '--role', 'any', '--skill', 'say-hello'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('stderr contains error about no brains', () => {
        expect(result.stderr).toContain('no brains available');
      });
    });

    when('[t1] act --role any --skill say-hello --attempts 3 (missing --output)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['act', '--role', 'any', '--skill', 'say-hello', '--attempts', '3'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('stderr contains error about --output required', () => {
        expect(result.stderr).toContain('--attempts requires --output');
      });
    });
  });

  given('[case2] repo with skills (no registry)', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-skills' }),
    );

    when('[t0] act without --role', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['act', '--skill', 'say-hello'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('stderr contains error about missing role', () => {
        expect(result.stderr).toContain('--role');
      });
    });

    when('[t1] act without --skill', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['act', '--role', 'any'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('stderr contains error about missing skill', () => {
        expect(result.stderr).toContain('--skill');
      });
    });

    when('[t2] act --role any --skill nonexistent', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['act', '--role', 'any', '--skill', 'nonexistent'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });
    });

    when('[t3] act --role any --skill say-hello --attempts 3 (missing --output)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['act', '--role', 'any', '--skill', 'say-hello', '--attempts', '3'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('stderr contains error about --output required', () => {
        expect(result.stderr).toContain('--attempts requires --output');
      });
    });
  });

  given('[case3] short flags on act (`-r`/`-s`) after the enroll `-r` fix', () => {
    // regression clamp: the `--roles` fix made the argv preprocessor recognize
    // `-r`. `-r` is ALSO act's `--role` alias, so a command-blind encode would
    // rewrite the later `-s` into a `\u0000s` null byte and break act. this
    // proves act's short flags parse identically to the long form.
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-registry' }),
    );

    when('[t0] `act -r any -s say-hello` (short-flag form)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['act', '-r', 'any', '-s', 'say-hello'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('the short flags parse — no null byte leaks into stderr', () => {
        expect(result.stderr).not.toContain('\u0000');
      });

      then('`-s` is understood — no absent-`--skill` option error', () => {
        expect(result.stderr).not.toContain("required option '-s");
        expect(result.stderr).not.toContain('required option');
      });

      then('reaches the same brain-resolution outcome as the long form', () => {
        // identical to case1 t0's long-form `--role any --skill say-hello`:
        // both parse fully and fail only at brain resolution
        expect(result.stderr).toContain('no brains available');
      });

      then('the short-flag stderr is locked to a snapshot', () => {
        // snapshot the caller-faced error so a reviewer sees the exact `-r`/`-s`
        // output in the pr diff and any future drift surfaces
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });
});
