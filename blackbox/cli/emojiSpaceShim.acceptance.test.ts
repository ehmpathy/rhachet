import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';

/**
 * .what = acceptance tests for emoji space shim integration
 * .why = verifies CLI entry points are wrapped with withEmojiSpaceShim
 *
 * .note = behavioral verification of emoji transformation is covered in
 *         package-level tests at src/_topublish/emoji-space-shim/accept.blackbox/
 *         these tests verify CLI integration and that the shim wrapper
 *         does not cause crashes or unexpected behavior
 */
describe('emoji space shim cli integration', () => {
  given('[case1] cli invoked with vscode terminal detection', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-skills' }),
    );

    when('[t0] roles boot with TERM_PROGRAM=vscode', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'boot', '--repo', '.this', '--role', 'any'],
          cwd: repo.path,
          env: { TERM_PROGRAM: 'vscode' },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('shim wrapper does not crash cli', () => {
        expect(result.stderr).not.toContain('withEmojiSpaceShim');
        expect(result.stderr).not.toContain('shimConsoleLog');
      });
    });

    when('[t1] run --skill with TERM_PROGRAM=vscode', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['run', '--skill', 'say-hello'],
          cwd: repo.path,
          env: { TERM_PROGRAM: 'vscode' },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });
    });
  });

  given('[case2] cli invoked with default terminal', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-skills' }),
    );

    when('[t0] roles boot without TERM_PROGRAM', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'boot', '--repo', '.this', '--role', 'any'],
          cwd: repo.path,
          env: { TERM_PROGRAM: undefined },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('shim wrapper does not crash cli', () => {
        expect(result.stderr).not.toContain('withEmojiSpaceShim');
        expect(result.stderr).not.toContain('shimConsoleLog');
      });
    });

    when('[t1] run --skill without TERM_PROGRAM', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['run', '--skill', 'say-hello'],
          cwd: repo.path,
          env: { TERM_PROGRAM: undefined },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });
    });
  });

  given('[case3] cli exits cleanly', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-briefs' }),
    );

    when('[t0] multiple commands in sequence', () => {
      then('shim is restored after each command', async () => {
        // first command
        const result1 = invokeRhachetCliBinary({
          args: ['roles', 'boot', '--repo', '.this', '--role', 'any'],
          cwd: repo.path,
        });
        expect(result1.status).toEqual(0);

        // second command - if shim wasn't restored, this might behave oddly
        const result2 = invokeRhachetCliBinary({
          args: ['roles', 'boot', '--repo', '.this', '--role', 'any'],
          cwd: repo.path,
        });
        expect(result2.status).toEqual(0);

        // both should produce consistent output
        expect(result1.stdout).toEqual(result2.stdout);
      });
    });
  });
});
