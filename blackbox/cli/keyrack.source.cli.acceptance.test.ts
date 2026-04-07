import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

describe('keyrack source CLI', () => {
  // kill any stale daemon to ensure fresh daemon with current code
  beforeAll(() => killKeyrackDaemonForTests());

  given('[case1] all keys granted via env passthrough', () => {
    const envKey1 = '__TEST_SOURCE_CLI_KEY1__';
    const envKey2 = '__TEST_SOURCE_CLI_KEY2__';
    const envValue1 = 'secret-value-1';
    const envValue2 = 'secret-value-2';

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-keyrack-manifest' });

      writeFileSync(
        join(r.path, '.agent', 'keyrack.yml'),
        `org: testorg

env.test:
  - ${envKey1}
  - ${envKey2}
`,
      );

      return r;
    });

    when('[t0] source outputs export statements', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'source', '--env', 'test', '--owner', 'testorg'],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            [envKey1]: envValue1,
            [envKey2]: envValue2,
          },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout contains export statements', () => {
        expect(result.stdout).toContain('export');
        expect(result.stdout).toContain(envKey1);
        expect(result.stdout).toContain(envKey2);
      });

      then('stdout matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] source --key outputs single export', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: [
            'keyrack',
            'source',
            '--key',
            envKey1,
            '--env',
            'test',
            '--owner',
            'testorg',
          ],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            [envKey1]: envValue1,
            [envKey2]: envValue2,
          },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout contains only specified key', () => {
        expect(result.stdout).toContain(envKey1);
        expect(result.stdout).not.toContain(envKey2);
      });

      then('stdout matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t2] eval source output sets env vars', () => {
      const result = useBeforeAll(async () => {
        // first get the source output
        const sourceResult = invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'source', '--env', 'test', '--owner', 'testorg'],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            [envKey1]: envValue1,
            [envKey2]: envValue2,
          },
        });

        // then eval it and echo the env vars
        const evalResult = spawnSync(
          'bash',
          [
            '-c',
            `eval "${sourceResult.stdout}" && echo "KEY1=$${envKey1}" && echo "KEY2=$${envKey2}"`,
          ],
          {
            encoding: 'utf-8',
          },
        );

        return {
          sourceStatus: sourceResult.status,
          evalStatus: evalResult.status,
          stdout: evalResult.stdout,
        };
      });

      then('source exits with status 0', () => {
        expect(result.sourceStatus).toEqual(0);
      });

      then('eval sets env vars correctly', () => {
        expect(result.stdout).toContain(`KEY1=${envValue1}`);
        expect(result.stdout).toContain(`KEY2=${envValue2}`);
      });
    });
  });

  given('[case2] some keys not granted (strict mode)', () => {
    const envKeyGranted = '__TEST_SOURCE_STRICT_GRANTED__';
    const envKeyAbsent = '__TEST_SOURCE_STRICT_ABSENT__';
    const envValue = 'granted-value';

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-keyrack-manifest' });

      writeFileSync(
        join(r.path, '.agent', 'keyrack.yml'),
        `org: testorg

env.test:
  - ${envKeyGranted}
  - ${envKeyAbsent}
`,
      );

      return r;
    });

    when('[t0] source exits 2 with no stdout', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'source', '--env', 'test', '--owner', 'testorg'],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            XDG_RUNTIME_DIR: join(repo.path, '.xdg-runtime'),
            [envKeyGranted]: envValue,
            // envKeyAbsent not set
          },
          logOnError: false,
        }),
      );

      then('exits with status 2', () => {
        expect(result.status).toEqual(2);
      });

      then('stdout is empty (no partial exports)', () => {
        expect(result.stdout.trim()).toEqual('');
      });
    });

    when('[t1] stderr shows which keys not granted', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'source', '--env', 'test', '--owner', 'testorg'],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            XDG_RUNTIME_DIR: join(repo.path, '.xdg-runtime'),
            [envKeyGranted]: envValue,
          },
          logOnError: false,
        }),
      );

      then('stderr contains absent key name', () => {
        expect(result.stderr).toContain(envKeyAbsent);
      });

      then('stderr matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t2] stderr contains --lenient hint', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'source', '--env', 'test', '--owner', 'testorg'],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            XDG_RUNTIME_DIR: join(repo.path, '.xdg-runtime'),
            [envKeyGranted]: envValue,
          },
          logOnError: false,
        }),
      );

      then('stderr contains lenient hint', () => {
        expect(result.stderr).toContain('--lenient');
      });
    });
  });

  given('[case3] some keys not granted (lenient mode)', () => {
    const envKeyGranted = '__TEST_SOURCE_LENIENT_GRANTED__';
    const envKeyAbsent = '__TEST_SOURCE_LENIENT_ABSENT__';
    const envValue = 'lenient-granted-value';

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-keyrack-manifest' });

      writeFileSync(
        join(r.path, '.agent', 'keyrack.yml'),
        `org: testorg

env.test:
  - ${envKeyGranted}
  - ${envKeyAbsent}
`,
      );

      return r;
    });

    when('[t0] source --lenient outputs partial exports', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: [
            'keyrack',
            'source',
            '--env',
            'test',
            '--owner',
            'testorg',
            '--lenient',
          ],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            XDG_RUNTIME_DIR: join(repo.path, '.xdg-runtime'),
            [envKeyGranted]: envValue,
          },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout contains only granted key', () => {
        expect(result.stdout).toContain(envKeyGranted);
        expect(result.stdout).not.toContain(envKeyAbsent);
      });

      then('stdout matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] eval partial output sets granted keys only', () => {
      const result = useBeforeAll(async () => {
        const sourceResult = invokeRhachetCliBinary({
          binary: 'rhx',
          args: [
            'keyrack',
            'source',
            '--env',
            'test',
            '--owner',
            'testorg',
            '--lenient',
          ],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            XDG_RUNTIME_DIR: join(repo.path, '.xdg-runtime'),
            [envKeyGranted]: envValue,
          },
        });

        const evalResult = spawnSync(
          'bash',
          [
            '-c',
            `eval "${sourceResult.stdout}" && echo "GRANTED=$${envKeyGranted}" && echo "ABSENT=$${envKeyAbsent}"`,
          ],
          {
            encoding: 'utf-8',
          },
        );

        return {
          sourceStatus: sourceResult.status,
          evalStatus: evalResult.status,
          stdout: evalResult.stdout,
        };
      });

      then('granted key is set', () => {
        expect(result.stdout).toContain(`GRANTED=${envValue}`);
      });

      then('absent key is not set', () => {
        expect(result.stdout).toContain('ABSENT=');
        expect(result.stdout).not.toContain(`ABSENT=${envValue}`);
      });
    });
  });

  given('[case4] no keys granted (lenient mode)', () => {
    const envKeyAbsent1 = '__TEST_SOURCE_NONE_ABSENT1__';
    const envKeyAbsent2 = '__TEST_SOURCE_NONE_ABSENT2__';

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-keyrack-manifest' });

      writeFileSync(
        join(r.path, '.agent', 'keyrack.yml'),
        `org: testorg

env.test:
  - ${envKeyAbsent1}
  - ${envKeyAbsent2}
`,
      );

      return r;
    });

    when('[t0] source --lenient with no keys granted', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: [
            'keyrack',
            'source',
            '--env',
            'test',
            '--owner',
            'testorg',
            '--lenient',
          ],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            XDG_RUNTIME_DIR: join(repo.path, '.xdg-runtime'),
            // no env vars set
          },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout is empty', () => {
        expect(result.stdout.trim()).toEqual('');
      });
    });

    when('[t1] eval empty output causes no error', () => {
      const result = useBeforeAll(async () => {
        const sourceResult = invokeRhachetCliBinary({
          binary: 'rhx',
          args: [
            'keyrack',
            'source',
            '--env',
            'test',
            '--owner',
            'testorg',
            '--lenient',
          ],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            XDG_RUNTIME_DIR: join(repo.path, '.xdg-runtime'),
          },
        });

        const evalResult = spawnSync(
          'bash',
          ['-c', `eval "${sourceResult.stdout}" && echo "eval succeeded"`],
          {
            encoding: 'utf-8',
          },
        );

        return {
          evalStatus: evalResult.status,
          stdout: evalResult.stdout,
        };
      });

      then('eval succeeds', () => {
        expect(result.evalStatus).toEqual(0);
        expect(result.stdout).toContain('eval succeeded');
      });
    });
  });

  given('[case5] validation errors', () => {
    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-keyrack-manifest' });

      writeFileSync(
        join(r.path, '.agent', 'keyrack.yml'),
        `org: testorg

env.test:
  - SOME_KEY
`,
      );

      return r;
    });

    when('[t0] no --env', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'source', '--owner', 'testorg'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('error mentions --env required', () => {
        const output = result.stderr + result.stdout;
        expect(output).toMatch(/(--env.*required|required.*'--env)/i);
      });
    });

    when('[t1] no --owner', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'source', '--env', 'test'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('error mentions --owner required', () => {
        const output = result.stderr + result.stdout;
        expect(output).toMatch(/(--owner.*required|required.*'--owner)/i);
      });
    });

    when('[t2] --strict and --lenient together', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: [
            'keyrack',
            'source',
            '--env',
            'test',
            '--owner',
            'testorg',
            '--strict',
            '--lenient',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('error mentions mutual exclusivity', () => {
        const output = result.stderr + result.stdout;
        expect(output).toMatch(/(strict.*lenient|mutually.*exclusive)/i);
      });
    });
  });

  given('[case6] shell escape edge cases', () => {
    const envKey = '__TEST_SOURCE_ESCAPE__';

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-keyrack-manifest' });

      writeFileSync(
        join(r.path, '.agent', 'keyrack.yml'),
        `org: testorg

env.test:
  - ${envKey}
`,
      );

      return r;
    });

    when('[t0] secret with single quote', () => {
      const quotedSecret = "sec'ret";

      const result = useBeforeAll(async () => {
        const sourceResult = invokeRhachetCliBinary({
          binary: 'rhx',
          args: [
            'keyrack',
            'source',
            '--key',
            envKey,
            '--env',
            'test',
            '--owner',
            'testorg',
          ],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            [envKey]: quotedSecret,
          },
        });

        // eval and verify
        const evalResult = spawnSync(
          'bash',
          [
            '-c',
            `eval "${sourceResult.stdout}" && [ "$${envKey}" = "sec'ret" ] && echo "MATCH"`,
          ],
          {
            encoding: 'utf-8',
          },
        );

        return {
          sourceStatus: sourceResult.status,
          sourceStdout: sourceResult.stdout,
          evalStatus: evalResult.status,
          evalStdout: evalResult.stdout,
        };
      });

      then('source exits with status 0', () => {
        expect(result.sourceStatus).toEqual(0);
      });

      then('eval works and value matches', () => {
        expect(result.evalStatus).toEqual(0);
        expect(result.evalStdout).toContain('MATCH');
      });

      then('export statement matches snapshot', () => {
        expect(asSnapshotSafe(result.sourceStdout)).toMatchSnapshot();
      });
    });

    when('[t1] secret with newline', () => {
      const multilineSecret = 'line1\nline2';

      const result = useBeforeAll(async () => {
        const sourceResult = invokeRhachetCliBinary({
          binary: 'rhx',
          args: [
            'keyrack',
            'source',
            '--key',
            envKey,
            '--env',
            'test',
            '--owner',
            'testorg',
          ],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            [envKey]: multilineSecret,
          },
        });

        // eval and verify newlines preserved
        const evalResult = spawnSync(
          'bash',
          [
            '-c',
            `eval "${sourceResult.stdout}" && [ "$${envKey}" = $'line1\\nline2' ] && echo "MATCH"`,
          ],
          {
            encoding: 'utf-8',
          },
        );

        return {
          sourceStatus: sourceResult.status,
          sourceStdout: sourceResult.stdout,
          evalStatus: evalResult.status,
          evalStdout: evalResult.stdout,
        };
      });

      then('source exits with status 0', () => {
        expect(result.sourceStatus).toEqual(0);
      });

      then('eval preserves newlines', () => {
        expect(result.evalStatus).toEqual(0);
        expect(result.evalStdout).toContain('MATCH');
      });

      then('export uses ANSI-C syntax', () => {
        expect(result.sourceStdout).toContain("$'");
      });

      then('export statement matches snapshot', () => {
        expect(asSnapshotSafe(result.sourceStdout)).toMatchSnapshot();
      });
    });

    when('[t2] secret with backslash', () => {
      const backslashSecret = 'path\\name';

      const result = useBeforeAll(async () => {
        const sourceResult = invokeRhachetCliBinary({
          binary: 'rhx',
          args: [
            'keyrack',
            'source',
            '--key',
            envKey,
            '--env',
            'test',
            '--owner',
            'testorg',
          ],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            [envKey]: backslashSecret,
          },
        });

        // eval and verify backslash preserved
        const evalResult = spawnSync(
          'bash',
          [
            '-c',
            `eval "${sourceResult.stdout}" && [ "$${envKey}" = 'path\\name' ] && echo "MATCH"`,
          ],
          {
            encoding: 'utf-8',
          },
        );

        return {
          sourceStatus: sourceResult.status,
          sourceStdout: sourceResult.stdout,
          evalStatus: evalResult.status,
          evalStdout: evalResult.stdout,
        };
      });

      then('source exits with status 0', () => {
        expect(result.sourceStatus).toEqual(0);
      });

      then('eval preserves backslash', () => {
        expect(result.evalStatus).toEqual(0);
        expect(result.evalStdout).toContain('MATCH');
      });

      then('export statement matches snapshot', () => {
        expect(asSnapshotSafe(result.sourceStdout)).toMatchSnapshot();
      });
    });
  });
});
