import { spawnSync } from 'node:child_process';
import { mkdirSync, symlinkSync } from 'node:fs';
import { resolve } from 'node:path';

import { given, then, useBeforeAll, useThen, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';

/**
 * .what = test bin/rhx and bin/run when invoked via /bin/sh
 * .why = pnpm hoisted mode creates wrappers that call `exec /bin/sh "$target" "$@"`
 *        this ignores the shebang and forces POSIX shell execution
 *        these tests verify the binaries work under /bin/sh
 */
describe('rhx pnpm hoisted compatibility', () => {
  const BIN_DIR = resolve(__dirname, '../../bin');
  const RHX_BIN = resolve(BIN_DIR, 'rhx');
  const RUN_BIN = resolve(BIN_DIR, 'run');

  given('[case1] bin/rhx invoked via /bin/sh', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-skills' }),
    );

    when('[t0] say-hello skill is called', () => {
      const result = useThen('call succeeds', () => {
        return spawnSync('/bin/sh', [RHX_BIN, 'say-hello'], {
          cwd: repo.path,
          encoding: 'utf-8',
        });
      });

      then('exit code is 0', () => {
        expect(result.status).toBe(0);
      });

      then('output contains hello', () => {
        expect(result.stdout).toContain('hello');
      });

      then('output matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] say-hello skill with positional arg', () => {
      const shResult = useThen('/bin/sh call succeeds', () => {
        return spawnSync('/bin/sh', [RHX_BIN, 'say-hello', 'claude'], {
          cwd: repo.path,
          encoding: 'utf-8',
        });
      });
      const directResult = useThen('direct call succeeds', () => {
        return spawnSync(RHX_BIN, ['say-hello', 'claude'], {
          cwd: repo.path,
          encoding: 'utf-8',
        });
      });

      then('/bin/sh exit code is 0', () => {
        expect(shResult.status).toBe(0);
      });

      then('/bin/sh output matches direct invocation', () => {
        expect(shResult.stdout).toEqual(directResult.stdout);
      });

      then('output matches snapshot', () => {
        expect(shResult.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case2] bin/run invoked via /bin/sh', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-skills' }),
    );

    when('[t0] --help is called', () => {
      const result = useThen('call succeeds', () => {
        return spawnSync('/bin/sh', [RUN_BIN, '--help'], {
          cwd: repo.path,
          encoding: 'utf-8',
        });
      });

      then('exit code is 0', () => {
        expect(result.status).toBe(0);
      });

      then('output contains usage info', () => {
        const combined = result.stdout + result.stderr;
        expect(combined).toMatch(/usage|rhachet/i);
      });

      then('output matches snapshot', () => {
        expect(result.stdout + result.stderr).toMatchSnapshot();
      });
    });

    when('[t1] run --skill say-hello is called', () => {
      const result = useThen('call succeeds', () => {
        return spawnSync('/bin/sh', [RUN_BIN, 'run', '--skill', 'say-hello'], {
          cwd: repo.path,
          encoding: 'utf-8',
        });
      });

      then('exit code is 0', () => {
        expect(result.status).toBe(0);
      });

      then('output contains hello', () => {
        expect(result.stdout).toContain('hello');
      });

      then('output matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case3] symlink chain via /bin/sh', () => {
    // create symlink chain: link1 -> link2 -> RHX_BIN
    // this tests that the shell script correctly follows nested symlinks
    const scene = useBeforeAll(async () => {
      const repo = await genTestTempRepo({ fixture: 'with-skills' });
      const testDir = resolve(repo.path, '.test-symlinks');
      mkdirSync(testDir, { recursive: true });
      const link2 = resolve(testDir, 'link2');
      symlinkSync(RHX_BIN, link2);
      const link1 = resolve(testDir, 'link1');
      symlinkSync(link2, link1);
      return { repo, link1 };
    });

    when('[t0] rhx follows symlink chain under /bin/sh', () => {
      const result = useThen('call via symlink chain succeeds', () => {
        return spawnSync('/bin/sh', [scene.link1, 'say-hello'], {
          cwd: scene.repo.path,
          encoding: 'utf-8',
        });
      });

      then('exit code is 0', () => {
        expect(result.status).toBe(0);
      });

      then('output matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case4] error paths via /bin/sh', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-skills' }),
    );

    when('[t0] nonexistent skill is called', () => {
      const result = useThen('call completes', () => {
        return spawnSync('/bin/sh', [RHX_BIN, 'nonexistent-skill-xyz'], {
          cwd: repo.path,
          encoding: 'utf-8',
        });
      });

      then('exit code is non-zero', () => {
        expect(result.status).not.toBe(0);
      });

      then('error does not say run not found', () => {
        const stderr = result.stderr;
        expect(stderr).not.toContain('run: not found');
      });

      then('error contains helpful message', () => {
        const stderr = result.stderr;
        // verify the error is from rhachet domain logic, not shell
        expect(stderr).toContain('BadRequestError');
        expect(stderr).toContain('no skill');
        expect(stderr).toContain('available skills');
      });
    });
  });
});
