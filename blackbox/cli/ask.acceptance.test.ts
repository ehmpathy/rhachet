import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';

describe('rhachet ask', () => {
  given('[case1] short flags on ask (`-r`/`-a`) after the enroll `-r` fix', () => {
    // regression clamp: the `--roles` fix made the argv preprocessor recognize
    // `-r`. `-r` is ALSO ask's `--role` alias, so a command-blind encode would
    // rewrite the later `-a` (`--ask`) into a `\u0000a` null byte and break ask.
    // this proves ask's short flags parse identically to the long form.
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-registry' }),
    );

    when('[t0] `ask -r any -a "hi"` (short-flag form)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['ask', '-r', 'any', '-a', 'hi'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('the short flags parse — no null byte leaks into stderr', () => {
        expect(result.stderr).not.toContain('\u0000');
      });

      then('`-r`/`-a` are understood — no absent-option error', () => {
        expect(result.stderr).not.toContain('required option');
      });

      then('reaches brain resolution — the same outcome as the long form', () => {
        // identical to `ask --role any --ask hi`: both parse fully and fail
        // only at brain resolution (no brains in the fixture)
        expect(result.stderr).toContain('no brains available');
      });

      then('the short-flag stderr is locked to a snapshot', () => {
        // snapshot the caller-faced error so a reviewer sees the exact `-r`/`-a`
        // output in the pr diff and any future drift surfaces
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });
});
