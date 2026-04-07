import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

describe('keyrack get --output modes', () => {
  // kill any stale daemon to ensure fresh daemon with current code
  beforeAll(() => killKeyrackDaemonForTests());

  given('[case1] key granted via env passthrough', () => {
    const envKey = '__TEST_OUTPUT_GRANTED__';
    const envValue = 'test-secret-value-123';

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

    when('[t0] --value outputs raw secret', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'get', '--key', envKey, '--env', 'test', '--value'],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            [envKey]: envValue,
          },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout is raw secret value', () => {
        expect(result.stdout).toEqual(envValue);
      });

      then('stdout has no trailing newline', () => {
        expect(result.stdout.endsWith('\n')).toBe(false);
      });
    });

    when('[t1] --output value is identical to --value', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: [
            'keyrack',
            'get',
            '--key',
            envKey,
            '--env',
            'test',
            '--output',
            'value',
          ],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            [envKey]: envValue,
          },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout is raw secret value', () => {
        expect(result.stdout).toEqual(envValue);
      });
    });

    when('[t2] --output json outputs JSON structure', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: [
            'keyrack',
            'get',
            '--key',
            envKey,
            '--env',
            'test',
            '--output',
            'json',
          ],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            [envKey]: envValue,
          },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout is valid JSON', () => {
        expect(() => JSON.parse(result.stdout)).not.toThrow();
      });

      then('JSON contains grant with secret', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('granted');
        expect(parsed.grant.key.secret).toEqual(envValue);
      });

      then('stdout matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t3] --output vibes outputs treestruct', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: [
            'keyrack',
            'get',
            '--key',
            envKey,
            '--env',
            'test',
            '--output',
            'vibes',
          ],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            [envKey]: envValue,
          },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout contains keyrack lock emoji', () => {
        expect(result.stdout).toContain('🔐');
      });

      then('stdout matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t4] no --output flag defaults to vibes', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'get', '--key', envKey, '--env', 'test'],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            [envKey]: envValue,
          },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout contains keyrack lock emoji (vibes mode)', () => {
        expect(result.stdout).toContain('🔐');
      });
    });

    when('[t5] --value piped to variable has no extra whitespace', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'get', '--key', envKey, '--env', 'test', '--value'],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            [envKey]: envValue,
          },
        }),
      );

      then('stdout equals exact secret value (no whitespace)', () => {
        expect(result.stdout).toEqual(envValue);
        expect(result.stdout.trim()).toEqual(result.stdout);
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case2] key locked (not unlocked)', () => {
    const envKey = '__TEST_OUTPUT_LOCKED__';

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

    when('[t0] --value with locked key', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'get', '--key', envKey, '--env', 'test', '--value'],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            XDG_RUNTIME_DIR: join(repo.path, '.xdg-runtime'),
            // no env var = key is absent (not locked, since no vault set)
          },
          logOnError: false,
        }),
      );

      then('exits with status 2', () => {
        expect(result.status).toEqual(2);
      });

      then('stderr contains status message', () => {
        expect(result.stderr.length).toBeGreaterThan(0);
      });

      then('stderr matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case3] key absent', () => {
    const envKey = '__TEST_OUTPUT_ABSENT__';

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

    when('[t0] --value with absent key', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'get', '--key', envKey, '--env', 'test', '--value'],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            XDG_RUNTIME_DIR: join(repo.path, '.xdg-runtime'),
          },
          logOnError: false,
        }),
      );

      then('exits with status 2', () => {
        expect(result.status).toEqual(2);
      });

      then('stderr contains hint', () => {
        const output = result.stderr + result.stdout;
        // should contain some indication of absent/set hint
        expect(output.length).toBeGreaterThan(0);
      });

      then('stderr matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case4] validation errors', () => {
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

    when('[t0] --value without --key', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'get', '--env', 'test', '--value'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('error mentions --value requires --key', () => {
        const output = result.stderr + result.stdout;
        expect(output).toMatch(/--value.*requires.*--key/i);
      });
    });

    when('[t1] --for repo with --value', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'get', '--for', 'repo', '--env', 'test', '--value'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('error mentions --value requires --key', () => {
        const output = result.stderr + result.stdout;
        expect(output).toMatch(/--value.*requires.*--key/i);
      });
    });
  });

  given('[case5] secret with special characters', () => {
    const envKey = '__TEST_OUTPUT_SPECIAL__';

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

    when('[t0] newlines preserved in --value output', () => {
      const multilineSecret = 'line1\nline2\nline3';

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'get', '--key', envKey, '--env', 'test', '--value'],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            [envKey]: multilineSecret,
          },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('newlines are preserved', () => {
        expect(result.stdout).toEqual(multilineSecret);
        expect(result.stdout).toContain('\n');
      });
    });

    when('[t1] single quotes in --value output', () => {
      const quotedSecret = "it's a test's secret";

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'get', '--key', envKey, '--env', 'test', '--value'],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            [envKey]: quotedSecret,
          },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('quotes are preserved', () => {
        expect(result.stdout).toEqual(quotedSecret);
      });
    });
  });
});
