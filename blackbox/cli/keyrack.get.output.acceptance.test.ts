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

  given('[case6] --unlock opt-in flows through the built binary', () => {
    const envKey = '__TEST_OUTPUT_UNLOCK__';
    const envValue = 'unlock-opt-in-value-cli';

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

    // note: acceptance keys are env-backed, so a true vault unlock is
    // unobservable here — this case proves the built binary ACCEPTS --unlock
    // and still returns the granted secret, not a genuine vault unlock
    when('[t0] --unlock on an env-backed available key', () => {
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
            '--unlock',
            '--value',
          ],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            [envKey]: envValue,
          },
        }),
      );

      then('exits with status 0 (opt-in does not break an available get)', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout is raw secret value', () => {
        expect(result.stdout).toEqual(envValue);
      });
    });
  });

  /**
   * [case7] CLI get --env camp — the wish's new env
   * proves the CLI get single-key path (getOneKeyrackGrantByKey → isValidKeyrackEnv)
   * accepts camp and grants the camp-tagged key. mirrors the SDK get camp case; closes
   * the CLI side of the get parity.
   */
  given('[case7] key granted via env passthrough, --env camp', () => {
    const envKey = '__TEST_OUTPUT_CAMP_GRANTED__';
    const envValue = 'camp-secret-value-123';

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-keyrack-manifest' });

      writeFileSync(
        join(r.path, '.agent', 'keyrack.yml'),
        `org: testorg

env.camp:
  - ${envKey}
`,
      );

      return r;
    });

    when('[t0] get --key --env camp --value', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'get', '--key', envKey, '--env', 'camp', '--value'],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            [envKey]: envValue,
          },
        }),
      );

      then('exits with status 0 (camp is accepted, not rejected)', () => {
        expect(result.status).toEqual(0);
      });

      then('output does not reject camp as an invalid env', () => {
        expect(result.stderr).not.toContain('invalid --env');
      });

      then('stdout is the raw camp secret value', () => {
        expect(result.stdout).toEqual(envValue);
      });
    });

    when('[t1] get --key --env camp --output json', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: [
            'keyrack',
            'get',
            '--key',
            envKey,
            '--env',
            'camp',
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

      then('json carries the camp-tagged slug', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.slug).toEqual(`testorg.camp.${envKey}`);
        expect(parsed.grant.env).toEqual('camp');
      });

      then('stdout matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });
});
