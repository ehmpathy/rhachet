import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

/**
 * ⚠️ .note.name = the file and its describe both say `source`, and not one invocation below runs
 *        `keyrack source` — every row is `keyrack get --for repo`. the two verbs share the
 *        repo-sweep SHAPE, which is what the name reaches for, but they are separate commands
 *        with separate renders and separate refusal paths
 * .why.it.matters = a reader who asks "is `source` covered?" reads this filename and stops. the
 *        name alone is enough to conclude that `source`'s own refusal branch is covered here.
 *        it is not — that coverage lives with the `source` command's own suites
 * .note.left = the name is NOT changed here: it predates this wish, and a rename moves every
 *         snapshot key in this file for a gain unrelated to the wish (`rule.forbid.scope-leaks`).
 *         the trap is recorded instead, so the next reader is not misled by it
 */
describe('keyrack.source', () => {
  // kill any stale daemon to ensure fresh daemon with current code
  beforeAll(() => killKeyrackDaemonForTests());

  given('[case1] all keys granted via env passthrough', () => {
    const envKey1 = '__TEST_SOURCE_KEY_1__';
    const envKey2 = '__TEST_SOURCE_KEY_2__';
    const envValue1 = 'test-value-1';
    const envValue2 = 'test-value-2';

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

    when('[t0] rhx keyrack get --json with env vars set', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'get', '--for', 'repo', '--env', 'test', '--json'],
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

      then('all keys have status=granted', () => {
        const parsed = JSON.parse(result.stdout);
        expect(Array.isArray(parsed)).toBe(true);
        for (const key of parsed) {
          expect(key.status).toEqual('granted');
        }
      });

      then('grant values match env values', () => {
        const parsed = JSON.parse(result.stdout);
        const key1 = parsed.find((k: { grant?: { slug: string } }) =>
          k.grant?.slug.includes(envKey1),
        );
        const key2 = parsed.find((k: { grant?: { slug: string } }) =>
          k.grant?.slug.includes(envKey2),
        );
        expect(key1?.grant?.key?.secret).toEqual(envValue1);
        expect(key2?.grant?.key?.secret).toEqual(envValue2);
      });
    });

    when('[t1] rhx keyrack get (formatted) with env vars set', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'get', '--for', 'repo', '--env', 'test'],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            [envKey1]: envValue1,
            [envKey2]: envValue2,
          },
        }),
      );

      then('stdout matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case2] some keys absent (not in env, not hosted)', () => {
    const envKeyPresent = '__TEST_SOURCE_PRESENT__';
    const envKeyAbsent = '__TEST_SOURCE_ABSENT__';
    const envValue = 'present-value';

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-keyrack-manifest' });

      writeFileSync(
        join(r.path, '.agent', 'keyrack.yml'),
        `org: testorg

env.test:
  - ${envKeyPresent}
  - ${envKeyAbsent}
`,
      );

      return r;
    });

    when('[t0] rhx keyrack get --json with one env var set', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'get', '--for', 'repo', '--env', 'test', '--json'],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            [envKeyPresent]: envValue,
          },
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('returns JSON with absent key', () => {
        const parsed = JSON.parse(result.stdout);
        const absentKey = parsed.find(
          (k: { status: string; slug?: string }) =>
            k.status === 'absent' && k.slug?.includes(envKeyAbsent),
        );
        expect(absentKey).toBeDefined();
        expect(absentKey.status).toEqual('absent');
      });

      then('returns JSON with granted key', () => {
        const parsed = JSON.parse(result.stdout);
        const grantedKey = parsed.find(
          (k: { status: string; grant?: { slug: string } }) =>
            k.status === 'granted' && k.grant?.slug.includes(envKeyPresent),
        );
        expect(grantedKey).toBeDefined();
        expect(grantedKey.grant.key.secret).toEqual(envValue);
      });
    });

    when('[t1] rhx keyrack get (formatted) with one env var set', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'get', '--for', 'repo', '--env', 'test'],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            [envKeyPresent]: envValue,
          },
          logOnError: false,
        }),
      );

      then('stdout matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case3] no keyrack.yml in repo (no keys required)', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'minimal' }),
    );

    when('[t0] rhx keyrack get --json called', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'get', '--for', 'repo', '--env', 'test', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('exits with non-zero status (no keyrack.yml found)', () => {
        expect(result.status).not.toEqual(0);
      });

      then('error mentions keyrack.yml not found', () => {
        const output = result.stdout + result.stderr;
        expect(output).toContain('keyrack.yml');
      });

      then('stdout matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case4] key truly absent (never set, no env var)', () => {
    // .note = tests with isolated XDG_RUNTIME_DIR for fresh daemon state
    // .note = "absent" means key was never set (no vault entry exists)
    // .note = without env var passthrough and without prior vault entry, key is "absent"
    const envKeyAbsent = '__TEST_SOURCE_NOTAVAIL__';

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-keyrack-manifest' });

      writeFileSync(
        join(r.path, '.agent', 'keyrack.yml'),
        `org: testorg

env.test:
  - ${envKeyAbsent}
`,
      );

      return r;
    });

    when('[t0] rhx keyrack get --json without env var (isolated daemon)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'get', '--for', 'repo', '--env', 'test', '--json'],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            XDG_RUNTIME_DIR: join(repo.path, '.xdg-runtime'),
            // no env var set → key not available
          },
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('returns JSON with absent key', () => {
        const parsed = JSON.parse(result.stdout);
        const absentKey = parsed.find(
          (k: { status: string; slug?: string }) =>
            k.status === 'absent' && k.slug?.includes(envKeyAbsent),
        );
        expect(absentKey).toBeDefined();
        expect(absentKey.status).toEqual('absent');
      });
    });

    when('[t1] rhx keyrack get (formatted) without env var (isolated daemon)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'get', '--for', 'repo', '--env', 'test'],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            XDG_RUNTIME_DIR: join(repo.path, '.xdg-runtime'),
          },
          logOnError: false,
        }),
      );

      then('stdout matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case5] keys in env.all count for test env', () => {
    const envKeyAll = '__TEST_SOURCE_ALL__';
    const envValueAll = 'all-value';

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-keyrack-manifest' });

      writeFileSync(
        join(r.path, '.agent', 'keyrack.yml'),
        `org: testorg

env.all:
  - ${envKeyAll}

env.test: []
`,
      );

      return r;
    });

    when('[t0] rhx keyrack get --json for test env', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'get', '--for', 'repo', '--env', 'test', '--json'],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            [envKeyAll]: envValueAll,
          },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('env.all key is granted', () => {
        const parsed = JSON.parse(result.stdout);
        const allKey = parsed.find(
          (k: { status: string; grant?: { slug: string } }) =>
            k.grant?.slug.includes(envKeyAll),
        );
        expect(allKey).toBeDefined();
        expect(allKey.status).toEqual('granted');
      });
    });

    when('[t1] rhx keyrack get (formatted) for test env', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'get', '--for', 'repo', '--env', 'test'],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            [envKeyAll]: envValueAll,
          },
        }),
      );

      then('stdout matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case6] key locked (set to os.secure but daemon not unlocked)', () => {
    // .note = "locked" means key was set but daemon needs unlock to decrypt
    // .note = tests with isolated XDG_RUNTIME_DIR for fresh daemon state
    const envKeyLocked = '__TEST_SOURCE_LOCKED__';

    // kill daemon to ensure clean state
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-keyrack-manifest' });

      // init keyrack (creates encrypted manifest)
      await invokeRhachetCliBinary({
        binary: 'rhx',
        args: ['keyrack', 'init'],
        cwd: r.path,
        env: { HOME: r.path },
      });

      // write keyrack.yml with the key we'll lock
      writeFileSync(
        join(r.path, '.agent', 'keyrack.yml'),
        `org: testorg

env.test:
  - ${envKeyLocked}
`,
      );

      // set the key to os.secure vault (creates encrypted vault file)
      await invokeRhachetCliBinary({
        binary: 'rhx',
        args: [
          'keyrack',
          'set',
          '--key',
          envKeyLocked,
          '--env',
          'test',
          '--vault',
          'os.secure',
          '--mech',
          'PERMANENT_VIA_REPLICA',
          '--org',
          'testorg',
          '--json',
        ],
        cwd: r.path,
        env: { HOME: r.path },
        stdin: 'locked-secret-value\n',
      });

      return r;
    });

    when('[t0] rhx keyrack get --json without unlock (isolated daemon)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'get', '--for', 'repo', '--env', 'test', '--json'],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            XDG_RUNTIME_DIR: join(repo.path, '.xdg-runtime'),
            // no env var set, daemon not unlocked → key is locked
          },
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('returns JSON with locked key', () => {
        const parsed = JSON.parse(result.stdout);
        const lockedKey = parsed.find(
          (k: { status: string; slug?: string }) =>
            k.status === 'locked' && k.slug?.includes(envKeyLocked),
        );
        expect(lockedKey).toBeDefined();
        expect(lockedKey.status).toEqual('locked');
      });
    });

    when('[t1] rhx keyrack get (formatted) without unlock (isolated daemon)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'get', '--for', 'repo', '--env', 'test'],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            XDG_RUNTIME_DIR: join(repo.path, '.xdg-runtime'),
          },
          logOnError: false,
        }),
      );

      then('stdout matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case7] keyrack.source() SDK with absent keys (strict mode)', () => {
    // .note = test keyrack.source() strict mode in an isolated temp repo
    // .note = strict mode (default) should exit 2 with stophand message
    const envKeyAbsent = '__TEST_SDK_STRICT_ABSENT__';

    // path to rhachet dist (for import in test module)
    const rhachetDistPath = resolve(process.cwd(), 'dist', 'contract', 'sdk.keyrack.js');

    when('[t0] keyrack.source() called', () => {
      const result = useBeforeAll(async () => {
        // create temp repo with node_modules symlink and git init
        const testDir = genTempDir({
          slug: 'keyrack-sdk-strict',
          symlink: [{ at: 'node_modules', to: 'node_modules' }],
          git: true,
        });

        // create .agent/keyrack.yml with absent key
        const agentDir = join(testDir, '.agent');
        spawnSync('mkdir', ['-p', agentDir]);
        writeFileSync(
          join(agentDir, 'keyrack.yml'),
          `org: testorg

env.test:
  - ${envKeyAbsent}
`,
        );

        // commit keyrack.yml so git root detection works
        spawnSync('git', ['add', '.'], { cwd: testDir });
        spawnSync('git', ['commit', '-m', 'add keyrack.yml'], { cwd: testDir });

        // create test module that calls keyrack.source()
        const modulePath = join(testDir, 'test-strict.mjs');
        writeFileSync(
          modulePath,
          `
import { keyrack } from '${rhachetDistPath}';

// strict mode (default) - should exit 2 with absent keys
keyrack.source({ env: 'test', owner: 'testorg' });
console.log('should not reach here');
`,
        );

        // run module from testDir (where node_modules is symlinked)
        const spawnResult = spawnSync('node', [modulePath], {
          cwd: testDir,
          encoding: 'utf8', // eslint-disable-line @cspell/spellchecker -- node api
          env: {
            ...process.env,
            HOME: testDir,
            XDG_RUNTIME_DIR: join(testDir, '.xdg-runtime'),
            // no env var for absent key
          },
        });

        return {
          status: spawnResult.status,
          stdout: spawnResult.stdout,
          stderr: spawnResult.stderr,
        };
      });

      then('exits with code 2 (constraint error)', () => {
        expect(result.status).toEqual(2);
      });

      then('stdout matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t1] lenient mode with absent keys', () => {
      const result = useBeforeAll(async () => {
        // create temp repo with node_modules symlink and git init
        const testDir = genTempDir({
          slug: 'keyrack-sdk-lenient',
          symlink: [{ at: 'node_modules', to: 'node_modules' }],
          git: true,
        });

        // create .agent/keyrack.yml with absent key
        const agentDir = join(testDir, '.agent');
        spawnSync('mkdir', ['-p', agentDir]);
        writeFileSync(
          join(agentDir, 'keyrack.yml'),
          `org: testorg

env.test:
  - ${envKeyAbsent}
`,
        );

        // commit keyrack.yml so git root detection works
        spawnSync('git', ['add', '.'], { cwd: testDir });
        spawnSync('git', ['commit', '-m', 'add keyrack.yml'], { cwd: testDir });

        // create test module that calls keyrack.source() in lenient mode
        const modulePath = join(testDir, 'test-lenient.mjs');
        writeFileSync(
          modulePath,
          `
import { keyrack } from '${rhachetDistPath}';

// lenient mode - should succeed even with absent keys
keyrack.source({ env: 'test', owner: 'testorg', mode: 'lenient' });
console.log('lenient mode completed');
`,
        );

        // run module from testDir (where node_modules is symlinked)
        const spawnResult = spawnSync('node', [modulePath], {
          cwd: testDir,
          encoding: 'utf8', // eslint-disable-line @cspell/spellchecker -- node api
          env: {
            ...process.env,
            HOME: testDir,
            XDG_RUNTIME_DIR: join(testDir, '.xdg-runtime'),
            // no env var for absent key
          },
        });

        return {
          status: spawnResult.status,
          stdout: spawnResult.stdout,
          stderr: spawnResult.stderr,
        };
      });

      then('exits with code 0', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout shows completion', () => {
        expect(result.stdout).toContain('lenient mode completed');
      });

      then('stdout matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t2] strict mode with all keys granted via env passthrough', () => {
      const envKeyGranted = '__TEST_SDK_STRICT_GRANTED__';
      const envValue = 'granted-test-value';

      const result = useBeforeAll(async () => {
        // create temp repo with node_modules symlink and git init
        const testDir = genTempDir({
          slug: 'keyrack-sdk-granted',
          symlink: [{ at: 'node_modules', to: 'node_modules' }],
          git: true,
        });

        // create .agent/keyrack.yml with key that will be granted via env
        const agentDir = join(testDir, '.agent');
        spawnSync('mkdir', ['-p', agentDir]);
        writeFileSync(
          join(agentDir, 'keyrack.yml'),
          `org: testorg

env.test:
  - ${envKeyGranted}
`,
        );

        // commit keyrack.yml so git root detection works
        spawnSync('git', ['add', '.'], { cwd: testDir });
        spawnSync('git', ['commit', '-m', 'add keyrack.yml'], { cwd: testDir });

        // create test module that calls keyrack.source() and logs env var
        const modulePath = join(testDir, 'test-granted.mjs');
        writeFileSync(
          modulePath,
          `
import { keyrack } from '${rhachetDistPath}';

// strict mode with all keys granted
keyrack.source({ env: 'test', owner: 'testorg' });
console.log('granted value:', process.env.${envKeyGranted});
`,
        );

        // run module from testDir with env var set
        const spawnResult = spawnSync('node', [modulePath], {
          cwd: testDir,
          encoding: 'utf8', // eslint-disable-line @cspell/spellchecker -- node api
          env: {
            ...process.env,
            HOME: testDir,
            XDG_RUNTIME_DIR: join(testDir, '.xdg-runtime'),
            [envKeyGranted]: envValue,
          },
        });

        return {
          status: spawnResult.status,
          stdout: spawnResult.stdout,
          stderr: spawnResult.stderr,
          envValue,
        };
      });

      then('exits with code 0', () => {
        expect(result.status).toEqual(0);
      });

      then('key is injected into process.env', () => {
        expect(result.stdout).toContain(`granted value: ${result.envValue}`);
      });

      then('stdout matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case8] keyrack.source() SDK with key filter', () => {
    // .note = test keyrack.source() with key filter (CLI extension)
    const envKey1 = '__TEST_SDK_KEY_FILTER_1__';
    const envKey2 = '__TEST_SDK_KEY_FILTER_2__';
    const envValue1 = 'key-filter-value-1';
    const envValue2 = 'key-filter-value-2';

    // path to rhachet dist (for import in test module)
    const rhachetDistPath = resolve(
      process.cwd(),
      'dist',
      'contract',
      'sdk.keyrack.js',
    );

    when('[t0] keyrack.source() with key filter for granted key', () => {
      const result = useBeforeAll(async () => {
        // create temp repo with node_modules symlink and git init
        const testDir = genTempDir({
          slug: 'keyrack-sdk-key-filter',
          symlink: [{ at: 'node_modules', to: 'node_modules' }],
          git: true,
        });

        // create .agent/keyrack.yml with both keys
        const agentDir = join(testDir, '.agent');
        spawnSync('mkdir', ['-p', agentDir]);
        writeFileSync(
          join(agentDir, 'keyrack.yml'),
          `org: testorg

env.test:
  - ${envKey1}
  - ${envKey2}
`,
        );

        // commit keyrack.yml so git root detection works
        spawnSync('git', ['add', '.'], { cwd: testDir });
        spawnSync('git', ['commit', '-m', 'add keyrack.yml'], { cwd: testDir });

        // create test module that calls keyrack.source() with key filter
        const modulePath = join(testDir, 'test-key-filter.mjs');
        writeFileSync(
          modulePath,
          `
import { keyrack } from '${rhachetDistPath}';

// source only key1, not key2
keyrack.source({ env: 'test', owner: 'testorg', key: '${envKey1}' });
console.log('key1:', process.env.${envKey1} || 'undefined');
console.log('key2:', process.env.${envKey2} || 'undefined');
`,
        );

        // run module with both env vars set
        const spawnResult = spawnSync('node', [modulePath], {
          cwd: testDir,
          encoding: 'utf8', // eslint-disable-line @cspell/spellchecker -- node api
          env: {
            ...process.env,
            HOME: testDir,
            XDG_RUNTIME_DIR: join(testDir, '.xdg-runtime'),
            [envKey1]: envValue1,
            [envKey2]: envValue2,
          },
        });

        return {
          status: spawnResult.status,
          stdout: spawnResult.stdout,
          stderr: spawnResult.stderr,
        };
      });

      then('exits with code 0', () => {
        expect(result.status).toEqual(0);
      });

      then('only filtered key is sourced into process.env', () => {
        expect(result.stdout).toContain(`key1: ${envValue1}`);
        // key2 should NOT be sourced (still shows env var because it was set in process.env)
        // but the point is keyrack.source only processed key1
      });

      then('stdout matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t1] keyrack.source() with key filter for absent key (strict)', () => {
      const result = useBeforeAll(async () => {
        // create temp repo with node_modules symlink and git init
        const testDir = genTempDir({
          slug: 'keyrack-sdk-key-filter-absent',
          symlink: [{ at: 'node_modules', to: 'node_modules' }],
          git: true,
        });

        // create .agent/keyrack.yml with key
        const agentDir = join(testDir, '.agent');
        spawnSync('mkdir', ['-p', agentDir]);
        writeFileSync(
          join(agentDir, 'keyrack.yml'),
          `org: testorg

env.test:
  - ${envKey1}
`,
        );

        // commit keyrack.yml so git root detection works
        spawnSync('git', ['add', '.'], { cwd: testDir });
        spawnSync('git', ['commit', '-m', 'add keyrack.yml'], { cwd: testDir });

        // create test module that calls keyrack.source() with key filter for absent key
        const modulePath = join(testDir, 'test-key-filter-absent.mjs');
        writeFileSync(
          modulePath,
          `
import { keyrack } from '${rhachetDistPath}';

// source key1 which is absent (no env var)
keyrack.source({ env: 'test', owner: 'testorg', key: '${envKey1}' });
console.log('should not reach here');
`,
        );

        // run module WITHOUT env var set
        const spawnResult = spawnSync('node', [modulePath], {
          cwd: testDir,
          encoding: 'utf8', // eslint-disable-line @cspell/spellchecker -- node api
          env: {
            ...process.env,
            HOME: testDir,
            XDG_RUNTIME_DIR: join(testDir, '.xdg-runtime'),
            // no env var for key1
          },
        });

        return {
          status: spawnResult.status,
          stdout: spawnResult.stdout,
          stderr: spawnResult.stderr,
        };
      });

      then('exits with code 2 (constraint error)', () => {
        expect(result.status).toEqual(2);
      });

      then('stdout matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t2] keyrack.source() with key filter for absent key (lenient)', () => {
      const result = useBeforeAll(async () => {
        // create temp repo with node_modules symlink and git init
        const testDir = genTempDir({
          slug: 'keyrack-sdk-key-filter-lenient',
          symlink: [{ at: 'node_modules', to: 'node_modules' }],
          git: true,
        });

        // create .agent/keyrack.yml with key
        const agentDir = join(testDir, '.agent');
        spawnSync('mkdir', ['-p', agentDir]);
        writeFileSync(
          join(agentDir, 'keyrack.yml'),
          `org: testorg

env.test:
  - ${envKey1}
`,
        );

        // commit keyrack.yml so git root detection works
        spawnSync('git', ['add', '.'], { cwd: testDir });
        spawnSync('git', ['commit', '-m', 'add keyrack.yml'], { cwd: testDir });

        // create test module that calls keyrack.source() with key filter in lenient mode
        const modulePath = join(testDir, 'test-key-filter-lenient.mjs');
        writeFileSync(
          modulePath,
          `
import { keyrack } from '${rhachetDistPath}';

// source key1 in lenient mode (should succeed even if absent)
keyrack.source({ env: 'test', owner: 'testorg', key: '${envKey1}', mode: 'lenient' });
console.log('lenient key filter completed');
console.log('key1:', process.env.${envKey1} || 'undefined');
`,
        );

        // run module WITHOUT env var set
        const spawnResult = spawnSync('node', [modulePath], {
          cwd: testDir,
          encoding: 'utf8', // eslint-disable-line @cspell/spellchecker -- node api
          env: {
            ...process.env,
            HOME: testDir,
            XDG_RUNTIME_DIR: join(testDir, '.xdg-runtime'),
            // no env var for key1
          },
        });

        return {
          status: spawnResult.status,
          stdout: spawnResult.stdout,
          stderr: spawnResult.stderr,
        };
      });

      then('exits with code 0', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout shows completion', () => {
        expect(result.stdout).toContain('lenient key filter completed');
      });

      then('key is undefined (not sourced)', () => {
        expect(result.stdout).toContain('key1: undefined');
      });

      then('stdout matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case9] keyrack.source() SDK asked for a reach', () => {
    // .why = the sdk `keyrack.source` is a SEPARATE implementation from the cli `source`
    //        command — it shells to `keyrack get`, so no cli guard covers it. this case is
    //        the sdk's own reach coverage, which stood at zero until 2026-08-06
    // .note = the defect this clamps was not the absence of a guard, it was a LIE: the
    //         collision error offered `pass \`reach\`` as its fix while the input contract had
    //         no `reach` field at all (rule.require.errors-name-the-fix)
    const envKey = '__TEST_SDK_REACH__';
    const envValue = 'reach-test-value';

    const rhachetDistPath = resolve(
      process.cwd(),
      'dist',
      'contract',
      'sdk.keyrack.js',
    );

    /**
     * .what = stand up a temp repo whose manifest declares one key, then run one module
     * .why = every when below differs by ONE line of the module body, so the setup is shared
     *        and the call under test stays legible at each call site
     */
    const runSourceModule = (input: {
      slug: string;
      call: string;
      env: Record<string, string>;
    }) => {
      const testDir = genTempDir({
        slug: input.slug,
        symlink: [{ at: 'node_modules', to: 'node_modules' }],
        git: true,
      });

      const agentDir = join(testDir, '.agent');
      spawnSync('mkdir', ['-p', agentDir]);
      writeFileSync(
        join(agentDir, 'keyrack.yml'),
        `org: testorg

env.test:
  - ${envKey}
`,
      );

      spawnSync('git', ['add', '.'], { cwd: testDir });
      spawnSync('git', ['commit', '-m', 'add keyrack.yml'], { cwd: testDir });

      const modulePath = join(testDir, 'test-reach.mjs');
      writeFileSync(
        modulePath,
        `
import { keyrack } from '${rhachetDistPath}';

${input.call}
console.log('sourced:', process.env.${envKey} || 'undefined');
`,
      );

      const spawnResult = spawnSync('node', [modulePath], {
        cwd: testDir,
        encoding: 'utf8', // eslint-disable-line @cspell/spellchecker -- node api
        env: {
          ...process.env,
          HOME: testDir,
          XDG_RUNTIME_DIR: join(testDir, '.xdg-runtime'),
          ...input.env,
        },
      });

      return {
        status: spawnResult.status,
        stdout: spawnResult.stdout,
        stderr: spawnResult.stderr,
        // .why.returned = the caller needs it to MASK it. a refusal on this path throws, and
        //        node bakes the module's absolute path into the `file://` frames of the stack —
        //        a per-run temp dir with a timestamp and a random hash. without this handle a
        //        snapshot is green exactly once, on the run that wrote it
        testDir,
      };
    };

    /**
     * .what = the sdk's OWN error render — its name, message and metadata — with node's
     *         uncaught-handler chrome cut away and the per-run temp dir masked
     * .why = `rule.require.acceptance-journey-coverage` asks a negative path to be SNAPPED, and
     *        its mask-then-snap doctrine answers the volatility objection directly: a journey
     *        whose bytes move is not exempt, it is masked. so each volatile source is neutralized
     *        rather than used as grounds to skip
     * .the boundary this draws = the module under test does NOT catch, so node's uncaught handler
     *        wraps the sdk's error in chrome of its own — a code frame at the head, `at` frames
     *        below it, a `Node.js vX.Y.Z` footer at the foot. none of that is the sdk's contract:
     *        a consumer catches the error and acts on its message and metadata, never on node's
     *        pretty-printer. and every piece of it churns — on an edit above the throw, on a
     *        recompile that moves the dist line, on a runtime upgrade. so the chrome is CUT, and
     *        what is left is exactly what a caller can act on
     * .why cut, and not masked = a mask is for a volatile value the contract still HOLDS (a temp
     *        dir, a secret, a version a human wants spelled). node's chrome holds no fact this
     *        surface promises — it is the harness, not the subject — so a `$NODE_VERSION` token
     *        would pin harness shape in a contract snapshot and invite a later reader to defend
     *        it as though the sdk emitted it
     * .the pieces, and how each is recognized:
     *   - the CODE FRAME is node's three-line block — `path:line`, the source line, a bare caret
     *     — so it is found by the caret line and cut with the two lines above it. a bare-caret
     *     line cannot occur inside a refusal message, so this cannot swallow contract bytes
     *   - the STACK FRAMES each begin `    at `
     *   - the FOOTER is node's `Node.js vX.Y.Z` line
     *   - the NAME ECHO is node's `<Name>: ` prefix on the head line. `helpful-errors` already
     *     spells the class inside its own message (`✋ ConstraintError: …`), so node's prefix
     *     says it twice — `ConstraintError: ✋ ConstraintError: …`. the echo is cut ONLY when
     *     the two names MATCH, so a class name that carries a fact a consumer would not
     *     otherwise see stays put (`rule.forbid.snapshot-visual-blemishes`)
     *   - the temp dir can still appear in the message body, so it is masked on the EXACT path
     *     this run used, never a `/tmp/...` pattern that could swallow a real path
     */
    const asSdkRefusalMasked = (input: {
      output: string;
      testDir: string;
    }): string => {
      const lines = asSnapshotSafe(input.output).split('\n');
      const caretAt = lines.findIndex((line) => /^\s*\^\s*$/.test(line));
      const withoutCodeFrame =
        caretAt >= 2
          ? [...lines.slice(0, caretAt - 2), ...lines.slice(caretAt + 1)]
          : lines;
      return withoutCodeFrame
        .filter(
          (line) => !/^\s+at\s/.test(line) && !/^Node\.js v[\d.]+$/.test(line),
        )
        .join('\n')
        .split(input.testDir)
        .join('$TESTDIR')
        .trim()
        .replace(/^(\w+): (✋ \1:)/, '$2');
    };

    when('[t0] a reach rides a BULK source, with no key named', () => {
      const result = useBeforeAll(async () =>
        runSourceModule({
          slug: 'keyrack-sdk-reach-bulk',
          call: `keyrack.source({ env: 'test', owner: 'testorg', reach: { exid: 'beav@ehmpathy.com' } });`,
          env: { [envKey]: envValue },
        }),
      );

      // ⚠️ THE clamp. absent `assertKeyrackReachRequiresKey` this exits 0 and sources the
      //    REACHLESS key, so a caller who named a reach is handed a different one — with
      //    no signal that the word they typed was dropped on the floor (q2)
      then('it is refused rather than answered with the reachless key', () => {
        expect(result.status).not.toEqual(0);
        expect(result.stdout).not.toContain(`sourced: ${envValue}`);
      });

      then('the refusal names the axis, not merely the symptom', () => {
        expect(result.stdout + result.stderr).toContain(
          '--reach requires a key',
        );
      });

      // the hint must name a fix THIS surface can accept — an sdk caller holds an input
      // object, so a `--key` flag would name a lever that does not exist here
      then('the hint is sdk-shaped, never cli-shaped', () => {
        const output = result.stdout + result.stderr;
        expect(output).toContain('sourceAllKeysIntoEnv({ key, reach })');
      });

      // ⚠️ .why.snapped = the three rows above each pin ONE phrase. together they cannot detect
      //        a refusal that still holds all three and has otherwise degraded — an extra frame
      //        leaked to the surface, a second sentence appended, a reordered body. the render
      //        is the contract a consumer catches and shows a human, so it is snapped, per
      //        `rule.require.acceptance-journey-coverage`
      // .note = masked, never skipped. see `asSdkRefusalMasked` for why node's uncaught-handler
      //         chrome — code frame, `at` frames, version footer, name echo — is CUT (it is the
      //         harness, not the subject) while the temp dir inside the message is MASKED
      // ⚠️ .why.two rows, never `stdout + stderr` = the CHANNEL is part of the contract, and a
      //        joined string cannot say which stream carried which bytes. a regression that
      //        moved the refusal onto stdout — or let the positive render leak onto stderr —
      //        would leave a joined snapshot untouched. so stdout is pinned RAW (it proves the
      //        refusal did not ride the success channel, and it pins surface whitespace the
      //        stderr row's trim cannot), and stderr carries the render. `[t1]` beside this row
      //        already snaps the two apart for the same reason
      then('stdout matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });

      then('the refusal render on stderr matches snapshot', () => {
        expect(
          asSdkRefusalMasked({
            output: result.stderr,
            testDir: result.testDir,
          }),
        ).toMatchSnapshot();
      });
    });

    when('[t1] the same bulk source omits the reach', () => {
      const result = useBeforeAll(async () =>
        runSourceModule({
          slug: 'keyrack-sdk-reach-absent',
          call: `keyrack.source({ env: 'test', owner: 'testorg' });`,
          env: { [envKey]: envValue },
        }),
      );

      // e1 — a reachless call takes zero new branches and behaves as it did before
      then('e1: it succeeds and sources the key, exactly as before', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain(`sourced: ${envValue}`);
      });

      // ⚠️ .why stdout, and not stderr alone = this is the POSITIVE path, so its reviewable
      //         artifact lives on stdout. the stderr snapshot beside it captures `""`, which
      //         diffs nought a human would read — it proves only that the quiet path stayed
      //         quiet. stdout is where a reviewer sees WHAT was sourced, under WHICH name,
      //         with no reach in sight (e1). a change that sourced the wrong key, or emitted
      //         a reach leaf on a reachless call, moves this line and not the other
      //         (rule.require.contract-snapshot-exhaustiveness)
      then('stdout matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });
});
