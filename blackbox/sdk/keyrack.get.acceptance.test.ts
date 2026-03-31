import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

/**
 * .what = acceptance tests for SDK keyrack.get
 * .why = verify slug construction and allow.dangerous option via SDK
 */
describe('keyrack.get', () => {
  // kill any stale daemon to ensure fresh daemon with current code
  beforeAll(() => killKeyrackDaemonForTests());

  // path to rhachet dist (for import in test module)
  const rhachetDistPath = resolve(
    process.cwd(),
    'dist',
    'contract',
    'sdk.keyrack.js',
  );

  given('[case1] slug construction for env=sudo', () => {
    const envKey = '__TEST_SDK_SUDO_KEY__';
    const envValue = 'sudo-secret-value';

    when('[t0] keyrack.get with env=sudo and key in env', () => {
      const result = useBeforeAll(async () => {
        // create temp repo with node_modules symlink and git init
        const testDir = genTempDir({
          slug: 'keyrack-sdk-sudo',
          symlink: [{ at: 'node_modules', to: 'node_modules' }],
          git: true,
        });

        // create .agent/keyrack.yml with key in env.sudo
        const agentDir = join(testDir, '.agent');
        spawnSync('mkdir', ['-p', agentDir]);
        writeFileSync(
          join(agentDir, 'keyrack.yml'),
          `org: testorg

env.sudo:
  - ${envKey}
`,
        );

        // commit keyrack.yml so git root detection works
        spawnSync('git', ['add', '.'], { cwd: testDir });
        spawnSync('git', ['commit', '-m', 'add keyrack.yml'], { cwd: testDir });

        // create test module that calls keyrack.get
        const modulePath = join(testDir, 'test-sudo.mjs');
        writeFileSync(
          modulePath,
          `
import { keyrack } from '${rhachetDistPath}';

const result = await keyrack.get({ for: { key: '${envKey}' }, env: 'sudo' });
console.log(JSON.stringify(result, null, 2));
`,
        );

        // run module with env var set
        const spawnResult = spawnSync('node', [modulePath], {
          cwd: testDir,
          encoding: 'utf8', // eslint-disable-line @cspell/spellchecker -- node api
          env: {
            ...process.env,
            HOME: testDir,
            XDG_RUNTIME_DIR: join(testDir, '.xdg-runtime'),
            [envKey]: envValue,
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

      then('slug uses sudo env', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant?.slug).toEqual(`testorg.sudo.${envKey}`);
      });

      then('status is granted', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('granted');
      });

      then('secret value matches env var', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant?.key?.secret).toEqual(envValue);
      });

      then('emit.stdout contains formatted output', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.emit?.stdout).toBeDefined();
        expect(parsed.emit.stdout).toContain('🔐 keyrack');
        expect(parsed.emit.stdout).toContain('granted');
      });
    });
  });

  given('[case2] slug construction for env=prep', () => {
    const envKey = '__TEST_SDK_PREP_KEY__';
    const envValue = 'prep-secret-value';

    when('[t0] keyrack.get with env=prep and key in env', () => {
      const result = useBeforeAll(async () => {
        // create temp repo with node_modules symlink and git init
        const testDir = genTempDir({
          slug: 'keyrack-sdk-prep',
          symlink: [{ at: 'node_modules', to: 'node_modules' }],
          git: true,
        });

        // create .agent/keyrack.yml with key in env.prep
        const agentDir = join(testDir, '.agent');
        spawnSync('mkdir', ['-p', agentDir]);
        writeFileSync(
          join(agentDir, 'keyrack.yml'),
          `org: testorg

env.prep:
  - ${envKey}
`,
        );

        // commit keyrack.yml so git root detection works
        spawnSync('git', ['add', '.'], { cwd: testDir });
        spawnSync('git', ['commit', '-m', 'add keyrack.yml'], { cwd: testDir });

        // create test module that calls keyrack.get
        const modulePath = join(testDir, 'test-prep.mjs');
        writeFileSync(
          modulePath,
          `
import { keyrack } from '${rhachetDistPath}';

const result = await keyrack.get({ for: { key: '${envKey}' }, env: 'prep' });
console.log(JSON.stringify(result, null, 2));
`,
        );

        // run module with env var set
        const spawnResult = spawnSync('node', [modulePath], {
          cwd: testDir,
          encoding: 'utf8', // eslint-disable-line @cspell/spellchecker -- node api
          env: {
            ...process.env,
            HOME: testDir,
            XDG_RUNTIME_DIR: join(testDir, '.xdg-runtime'),
            [envKey]: envValue,
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

      then('slug uses prep env', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant?.slug).toEqual(`testorg.prep.${envKey}`);
      });

      then('status is granted', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('granted');
      });
    });
  });

  given('[case3] allow.dangerous bypasses firewall', () => {
    // use a key that looks like a github pat (ghp_*) which triggers firewall
    // pattern: /^ghp_[a-zA-Z0-9]{36}$/ - exactly 36 alphanumeric chars after ghp_
    const dangerousKey = 'GHP_DANGEROUS_TOKEN';
    const dangerousValue = 'ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij';

    when('[t0] keyrack.get without allow.dangerous on dangerous token', () => {
      const result = useBeforeAll(async () => {
        // create temp repo with node_modules symlink and git init
        const testDir = genTempDir({
          slug: 'keyrack-sdk-blocked',
          symlink: [{ at: 'node_modules', to: 'node_modules' }],
          git: true,
        });

        // create .agent/keyrack.yml with dangerous key
        const agentDir = join(testDir, '.agent');
        spawnSync('mkdir', ['-p', agentDir]);
        writeFileSync(
          join(agentDir, 'keyrack.yml'),
          `org: testorg

env.test:
  - ${dangerousKey}
`,
        );

        // commit keyrack.yml so git root detection works
        spawnSync('git', ['add', '.'], { cwd: testDir });
        spawnSync('git', ['commit', '-m', 'add keyrack.yml'], { cwd: testDir });

        // create test module that calls keyrack.get WITHOUT allow.dangerous
        const modulePath = join(testDir, 'test-blocked.mjs');
        writeFileSync(
          modulePath,
          `
import { keyrack } from '${rhachetDistPath}';

const result = await keyrack.get({ for: { key: '${dangerousKey}' }, env: 'test' });
console.log(JSON.stringify(result, null, 2));
`,
        );

        // run module with dangerous-looking env var
        const spawnResult = spawnSync('node', [modulePath], {
          cwd: testDir,
          encoding: 'utf8', // eslint-disable-line @cspell/spellchecker -- node api
          env: {
            ...process.env,
            HOME: testDir,
            XDG_RUNTIME_DIR: join(testDir, '.xdg-runtime'),
            [dangerousKey]: dangerousValue,
          },
        });

        return {
          status: spawnResult.status,
          stdout: spawnResult.stdout,
          stderr: spawnResult.stderr,
        };
      });

      then('exits with code 0', () => {
        // sdk returns result, does not exit non-zero
        expect(result.status).toEqual(0);
      });

      then('status is blocked', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('blocked');
      });

      then('reasons mention dangerous token', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.reasons).toBeDefined();
        expect(parsed.reasons.length).toBeGreaterThan(0);
        expect(parsed.reasons.some((r: string) => r.includes('ghp_'))).toBe(
          true,
        );
      });

      then('emit.stdout contains blocked status', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.emit?.stdout).toBeDefined();
        expect(parsed.emit.stdout).toContain('🔐 keyrack');
        expect(parsed.emit.stdout).toContain('blocked');
      });
    });

    when('[t1] keyrack.get WITH allow.dangerous on dangerous token', () => {
      const result = useBeforeAll(async () => {
        // create temp repo with node_modules symlink and git init
        const testDir = genTempDir({
          slug: 'keyrack-sdk-allowed',
          symlink: [{ at: 'node_modules', to: 'node_modules' }],
          git: true,
        });

        // create .agent/keyrack.yml with dangerous key
        const agentDir = join(testDir, '.agent');
        spawnSync('mkdir', ['-p', agentDir]);
        writeFileSync(
          join(agentDir, 'keyrack.yml'),
          `org: testorg

env.test:
  - ${dangerousKey}
`,
        );

        // commit keyrack.yml so git root detection works
        spawnSync('git', ['add', '.'], { cwd: testDir });
        spawnSync('git', ['commit', '-m', 'add keyrack.yml'], { cwd: testDir });

        // create test module that calls keyrack.get WITH allow.dangerous
        const modulePath = join(testDir, 'test-allowed.mjs');
        writeFileSync(
          modulePath,
          `
import { keyrack } from '${rhachetDistPath}';

const result = await keyrack.get({
  for: { key: '${dangerousKey}' },
  env: 'test',
  allow: { dangerous: true },
});
console.log(JSON.stringify(result, null, 2));
`,
        );

        // run module with dangerous-looking env var
        const spawnResult = spawnSync('node', [modulePath], {
          cwd: testDir,
          encoding: 'utf8', // eslint-disable-line @cspell/spellchecker -- node api
          env: {
            ...process.env,
            HOME: testDir,
            XDG_RUNTIME_DIR: join(testDir, '.xdg-runtime'),
            [dangerousKey]: dangerousValue,
          },
        });

        return {
          status: spawnResult.status,
          stdout: spawnResult.stdout,
          stderr: spawnResult.stderr,
          dangerousValue,
        };
      });

      then('exits with code 0', () => {
        expect(result.status).toEqual(0);
      });

      then('status is granted', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('granted');
      });

      then('secret value is returned', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant?.key?.secret).toEqual(result.dangerousValue);
      });
    });
  });

  given('[case4] no manifest throws ConstraintError', () => {
    when('[t0] keyrack.get with raw key and no keyrack.yml', () => {
      const result = useBeforeAll(async () => {
        // create temp repo with node_modules symlink and git init - NO keyrack.yml
        const testDir = genTempDir({
          slug: 'keyrack-sdk-no-manifest',
          symlink: [{ at: 'node_modules', to: 'node_modules' }],
          git: true,
        });

        // create .agent dir but no keyrack.yml
        const agentDir = join(testDir, '.agent');
        spawnSync('mkdir', ['-p', agentDir]);

        // commit so git root detection works
        spawnSync('git', ['add', '.'], { cwd: testDir });
        spawnSync('git', ['commit', '-m', 'init'], {
          cwd: testDir,
          env: { ...process.env, GIT_AUTHOR_NAME: 'test', GIT_AUTHOR_EMAIL: 'test@test.com', GIT_COMMITTER_NAME: 'test', GIT_COMMITTER_EMAIL: 'test@test.com' },
        });

        // create test module that calls keyrack.get without manifest
        const modulePath = join(testDir, 'test-no-manifest.mjs');
        writeFileSync(
          modulePath,
          `
import { keyrack } from '${rhachetDistPath}';

try {
  const result = await keyrack.get({ for: { key: 'SOME_KEY' }, env: 'test' });
  console.log('unexpected success:', JSON.stringify(result));
} catch (error) {
  console.log('error.name:', error.name);
  console.log('error.message:', error.message);
  process.exit(error.code?.exit ?? 1);
}
`,
        );

        // run module
        const spawnResult = spawnSync('node', [modulePath], {
          cwd: testDir,
          encoding: 'utf8', // eslint-disable-line @cspell/spellchecker -- node api
          env: {
            ...process.env,
            HOME: testDir,
            XDG_RUNTIME_DIR: join(testDir, '.xdg-runtime'),
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

      then('error is ConstraintError', () => {
        // error.message contains ConstraintError prefix from helpful-errors
        expect(result.stdout).toContain('ConstraintError');
      });

      then('error message mentions keyrack.yml', () => {
        expect(result.stdout).toContain('keyrack.yml');
      });

      then('error message mentions full slug format', () => {
        expect(result.stdout).toContain('full slug format');
      });
    });

    when('[t1] keyrack.get with raw key, env=sudo, and no keyrack.yml', () => {
      const result = useBeforeAll(async () => {
        // create temp repo with node_modules symlink and git init - NO keyrack.yml
        const testDir = genTempDir({
          slug: 'keyrack-sdk-no-manifest-sudo',
          symlink: [{ at: 'node_modules', to: 'node_modules' }],
          git: true,
        });

        // create .agent dir but no keyrack.yml
        const agentDir = join(testDir, '.agent');
        spawnSync('mkdir', ['-p', agentDir]);

        // commit so git root detection works
        spawnSync('git', ['add', '.'], { cwd: testDir });
        spawnSync('git', ['commit', '-m', 'init'], {
          cwd: testDir,
          env: { ...process.env, GIT_AUTHOR_NAME: 'test', GIT_AUTHOR_EMAIL: 'test@test.com', GIT_COMMITTER_NAME: 'test', GIT_COMMITTER_EMAIL: 'test@test.com' },
        });

        // create test module that calls keyrack.get with env=sudo
        const modulePath = join(testDir, 'test-no-manifest-sudo.mjs');
        writeFileSync(
          modulePath,
          `
import { keyrack } from '${rhachetDistPath}';

try {
  const result = await keyrack.get({ for: { key: 'SUDO_KEY' }, env: 'sudo' });
  console.log('unexpected success:', JSON.stringify(result));
} catch (error) {
  console.log('error.name:', error.name);
  console.log('error.message:', error.message);
  process.exit(error.code?.exit ?? 1);
}
`,
        );

        // run module
        const spawnResult = spawnSync('node', [modulePath], {
          cwd: testDir,
          encoding: 'utf8', // eslint-disable-line @cspell/spellchecker -- node api
          env: {
            ...process.env,
            HOME: testDir,
            XDG_RUNTIME_DIR: join(testDir, '.xdg-runtime'),
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

      then('error message mentions --org @all', () => {
        expect(result.stdout).toContain('--org @all');
      });
    });
  });
});
