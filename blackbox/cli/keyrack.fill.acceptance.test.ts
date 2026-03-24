import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';

describe('keyrack fill cli', () => {
  /**
   * test case: rhx keyrack fill --help
   * verifies help output describes the command correctly
   */
  given('[case1] any repo', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-manifest' }),
    );

    when('[t0] rhx keyrack fill --help', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'fill', '--help'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('shows fill command description', () => {
        expect(result.stdout).toContain('fill');
      });

      then('shows --env option', () => {
        expect(result.stdout).toContain('--env');
      });

      then('shows --owner option', () => {
        expect(result.stdout).toContain('--owner');
      });

      then('shows --prikey option', () => {
        expect(result.stdout).toContain('--prikey');
      });

      then('shows --key option', () => {
        expect(result.stdout).toContain('--key');
      });

      then('shows --refresh option', () => {
        expect(result.stdout).toContain('--refresh');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  /**
   * test case: error when --env not provided
   * verifies required option validation
   */
  given('[case2] repo with keyrack manifest', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-manifest' }),
    );

    when('[t0] rhx keyrack fill without --env', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'fill'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('shows error about absent --env', () => {
        // commander shows "required option" errors
        expect(result.stderr.toLowerCase()).toContain('env');
      });
    });
  });

  /**
   * test case: error when no keyrack.yml in repo
   * verifies manifest validation
   */
  given('[case3] repo without keyrack manifest', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'minimal' }),
    );

    when('[t0] rhx keyrack fill --env test', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'fill', '--env', 'test'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('shows error about no keyrack.yml', () => {
        expect(result.stderr.toLowerCase()).toContain('keyrack');
      });
    });
  });

  /**
   * test case: no keys match env
   * verifies graceful behavior when no keys for specified env
   */
  given('[case4] repo with keyrack manifest (test keys only)', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-manifest' }),
    );

    when('[t0] rhx keyrack fill --env prod (no prod keys exist)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'fill', '--env', 'prod'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0 (empty is not an error)', () => {
        expect(result.status).toEqual(0);
      });

      then('shows no keys found message', () => {
        expect(result.stdout.toLowerCase()).toContain('no keys');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  /**
   * test case: specific key not found
   * verifies error when --key specifies non-existent key
   */
  given('[case5] repo with keyrack manifest', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-manifest' }),
    );

    when('[t0] rhx keyrack fill --env test --key NONEXISTENT', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'fill', '--env', 'test', '--key', 'NONEXISTENT'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('shows error about key not found', () => {
        expect(result.stderr.toLowerCase()).toContain('not found');
      });
    });
  });

  /**
   * test case: fill skips keys satisfied by env=all
   * verifies that when a key is declared in env.test but exists as env=all,
   * fill recognizes the env=all key satisfies the requirement and skips
   */
  given('[case6] repo with env.test key already set as env=all', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-env-all-fallback' }),
    );

    when('[t0] rhx keyrack fill --env test', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'fill', '--env', 'test'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('shows skip message for FILL_TEST_KEY with env=all slug', () => {
        expect(result.stdout).toContain('found vaulted under');
        expect(result.stdout).toContain('testorg.all.FILL_TEST_KEY');
      });

      then('shows skip message for ANOTHER_TEST_KEY with env=all slug', () => {
        expect(result.stdout).toContain('testorg.all.ANOTHER_TEST_KEY');
      });

      then('shows keyrack fill complete message', () => {
        expect(result.stdout).toContain('keyrack fill complete');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });
});
