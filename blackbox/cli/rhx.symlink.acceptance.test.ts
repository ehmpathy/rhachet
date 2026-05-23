import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';

/**
 * .what = tests rhx symlink resolution when installed via npm vs pnpm
 * .why = npm creates symlinks in node_modules/.bin/ that require readlink -f to follow
 *        pnpm uses a different link strategy that works without this issue
 *
 * .context
 *   npm creates: node_modules/.bin/rhx -> ../rhachet/bin/rhx (symlink)
 *   pnpm creates: different structure that works without symlink dereference
 *
 *   without readlink -f in bin/rhx, npm-installed rhx fails with "run: not found"
 *   with readlink -f, both npm and pnpm work correctly
 */
describe('rhx symlink resolution (acceptance)', () => {
  given('[case1] rhachet installed via npm (creates symlinks)', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({
        fixture: 'with-rhx-symlink-test',
        install: true,
        packageManager: 'npm',
      }),
    );

    when('[t0] rhx say-hello invoked via node_modules/.bin symlink', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['say-hello'],
          cwd: repo.path,
          viaSymlink: true,
        }),
      );

      then('does not error with "run: not found"', () => {
        expect(result.stderr).not.toContain('run: not found');
        expect(result.stderr).not.toContain('not found');
      });

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('outputs hello world', () => {
        expect(result.stdout).toContain('hello world');
      });
    });

    when('[t1] rhx say-hello with arg invoked via symlink', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['say-hello', 'npm-test'],
          cwd: repo.path,
          viaSymlink: true,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('outputs hello npm-test', () => {
        expect(result.stdout).toContain('hello npm-test');
      });
    });
  });

  given('[case2] rhachet installed via pnpm (different link structure)', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({
        fixture: 'with-rhx-symlink-test',
        install: true,
        packageManager: 'pnpm',
      }),
    );

    when('[t0] rhx say-hello invoked via node_modules/.bin symlink', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['say-hello'],
          cwd: repo.path,
          viaSymlink: true,
        }),
      );

      then('does not error with "run: not found"', () => {
        expect(result.stderr).not.toContain('run: not found');
        expect(result.stderr).not.toContain('not found');
      });

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('outputs hello world', () => {
        expect(result.stdout).toContain('hello world');
      });
    });

    when('[t1] rhx say-hello with arg invoked via symlink', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['say-hello', 'pnpm-test'],
          cwd: repo.path,
          viaSymlink: true,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('outputs hello pnpm-test', () => {
        expect(result.stdout).toContain('hello pnpm-test');
      });
    });
  });
});
