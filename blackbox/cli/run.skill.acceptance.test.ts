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

      /**
       * .why = this row walks the BUN `run` entry (`bin/run` dispatches `run` to
       *        `run.bun.rhachet-run.bc`), which is its own process root and so owns its own
       *        last error handler. it had NONE, so a `ConstraintError` escaped to bun's default
       *        render and exited 1 rather than the 2 its class documents
       */
      then('exits 2 — a caller-fixable constraint, never a malfunction', () => {
        // `not.toEqual(0)` was the prior assertion, and it passed on the defect: 1 is non-zero
        expect(result.status).toEqual(2);
      });

      then('renders the classified frame, with the fix named', () => {
        expect(result.stderr).toContain('✋ ConstraintError');
        expect(result.stderr).toContain('no skill "any"');
        expect(result.stderr).toContain('tip:');
      });

      then('shows a human NO raw runtime dump', () => {
        // the pre-fix render: `node_modules/.pnpm/…/HelpfulError.js` source, a caret, a
        // ten-frame stack, and a `Bun v1.3.5 (Linux x64)` footer
        expect(result.stderr).not.toContain('node_modules');
        expect(result.stderr).not.toMatch(/^\s*at /m);
        expect(result.stderr).not.toMatch(/Bun v\d/);
      });

      then('the refusal frame is locked to a snapshot', () => {
        // the asserts above prove the fragments fire and the dump is gone; they cannot
        // prove the frame READS well or stays stable — a reworded header, a moved hint,
        // or a dropped tree row all pass. this is a NEW user-faced failure surface on
        // the `run` contract, so it is snapped like every other one in this change
        // (`rule.require.contract-snapshot-exhaustiveness` +
        // `rule.require.acceptance-journey-coverage` — a negative path is snapped).
        // paired with those asserts, never snapshot-only (`rule.forbid.failhide`)
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
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
