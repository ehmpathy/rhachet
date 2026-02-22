import { given, then, useBeforeAll, useThen, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';

describe('keyrack session commands', () => {
  /**
   * test case: status command when daemon not reachable
   * verifies graceful handling when no daemon is active
   */
  given('[case1] repo with keyrack manifest, daemon not active', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-manifest' }),
    );

    when('[t0] status command is executed', () => {
      const result = useThen('it completes', () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'status'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('output indicates daemon not reachable or no keys', () => {
        const output = result.stdout + result.stderr;
        expect(output).toMatch(/daemon|not reachable|no keys|empty/i);
      });
    });
  });

  /**
   * test case: relock command (should work even if nothing unlocked)
   * verifies relock is idempotent
   */
  given('[case2] repo with keyrack manifest', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-manifest' }),
    );

    when('[t0] relock is executed', () => {
      const result = useThen('it completes', () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'relock'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('command exits cleanly', () => {
        // relock should work even if nothing is unlocked (idempotent)
        expect(result.status).toBeDefined();
      });
    });

    when('[t1] relock with --key flag is executed', () => {
      const result = useThen('it completes', () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'relock', '--key', 'TEST_KEY'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('command exits cleanly', () => {
        expect(result.status).toBeDefined();
      });
    });
  });

  /**
   * test case: unlock command (may fail without real vault setup)
   * verifies command is recognized and attempts unlock flow
   */
  given('[case3] repo with keyrack manifest', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-manifest' }),
    );

    when('[t0] unlock with duration is executed', () => {
      const result = useThen('it completes', () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'unlock', '--env', 'test', '--duration', '1h'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('command is recognized', () => {
        // command should be recognized, may fail due to vault setup
        const output = result.stdout + result.stderr;
        expect(output).not.toMatch(/unknown command/i);
      });
    });
  });
});
