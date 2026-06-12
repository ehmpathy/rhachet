import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { genTempDir, given, then, useThen, when } from 'test-fns';

import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';
import { asSnapshotSafe } from '@/blackbox/.test/infra/invokeRhachetCliBinary';

/**
 * .what = SDK acceptance tests for is-optional-if-has keyrack feature
 * .why = verify that keyrack.source() SDK respects is-optional-if-has waivers
 *
 * .note = parity with blackbox/cli/keyrack.source.is-optional-if-has.acceptance.test.ts
 */
describe('keyrack.source SDK is-optional-if-has', () => {
  // kill any stale daemon to ensure fresh daemon with current code
  beforeAll(() => killKeyrackDaemonForTests());

  const rhachetDistPath = resolve(
    process.cwd(),
    'dist',
    'contract',
    'sdk.keyrack.js',
  );

  given('[case1] absent key with alternative present', () => {
    /**
     * .scenario = primary key has is-optional-if-has, alternative IS present
     * .expected = strict mode should pass (waiver satisfied)
     */
    const primaryKey = '__TEST_SDK_OPT_PRIMARY__';
    const alternativeKey = '__TEST_SDK_OPT_ALTERNATIVE__';
    const alternativeValue = 'alternative-secret-value';

    when('[t0] keyrack.source() strict mode with alternative present', () => {
      const result = useThen('sdk call succeeds', async () => {
        const testDir = genTempDir({
          slug: 'keyrack-sdk-opt-alt-present',
          symlink: [{ at: 'node_modules', to: 'node_modules' }],
          git: true,
        });

        const agentDir = join(testDir, '.agent');
        spawnSync('mkdir', ['-p', agentDir]);
        writeFileSync(
          join(agentDir, 'keyrack.yml'),
          `org: testorg

env.test:
  - key: ${primaryKey}
    is-optional-if-has: ${alternativeKey}
  - ${alternativeKey}
`,
        );

        spawnSync('git', ['add', '.'], { cwd: testDir });
        spawnSync('git', ['commit', '-m', 'add keyrack.yml'], { cwd: testDir });

        const modulePath = join(testDir, 'test-opt-alt-present.mjs');
        writeFileSync(
          modulePath,
          `
import { keyrack } from '${rhachetDistPath}';

keyrack.source({ env: 'test', owner: 'testorg' });
console.log('strict mode passed with alternative present');
console.log('alternative value:', process.env.${alternativeKey});
`,
        );

        const spawnResult = spawnSync('node', [modulePath], {
          cwd: testDir,
          encoding: 'utf8', // eslint-disable-line @cspell/spellchecker -- node api
          env: {
            ...process.env,
            HOME: testDir,
            XDG_RUNTIME_DIR: join(testDir, '.xdg-runtime'),
            [alternativeKey]: alternativeValue,
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
        expect(result.stdout).toContain('strict mode passed with alternative present');
      });

      then('alternative key is injected into process.env', () => {
        expect(result.stdout).toContain(`alternative value: ${alternativeValue}`);
      });

      then('stdout matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t1] keyrack.source() strict mode without alternative', () => {
      const result = useThen('sdk call fails', async () => {
        const testDir = genTempDir({
          slug: 'keyrack-sdk-opt-no-alt',
          symlink: [{ at: 'node_modules', to: 'node_modules' }],
          git: true,
        });

        const agentDir = join(testDir, '.agent');
        spawnSync('mkdir', ['-p', agentDir]);
        writeFileSync(
          join(agentDir, 'keyrack.yml'),
          `org: testorg

env.test:
  - key: ${primaryKey}
    is-optional-if-has: ${alternativeKey}
  - ${alternativeKey}
`,
        );

        spawnSync('git', ['add', '.'], { cwd: testDir });
        spawnSync('git', ['commit', '-m', 'add keyrack.yml'], { cwd: testDir });

        const modulePath = join(testDir, 'test-opt-no-alt.mjs');
        writeFileSync(
          modulePath,
          `
import { keyrack } from '${rhachetDistPath}';

keyrack.source({ env: 'test', owner: 'testorg' });
console.log('should not reach here');
`,
        );

        const spawnResult = spawnSync('node', [modulePath], {
          cwd: testDir,
          encoding: 'utf8', // eslint-disable-line @cspell/spellchecker -- node api
          env: {
            ...process.env,
            HOME: testDir,
            XDG_RUNTIME_DIR: join(testDir, '.xdg-runtime'),
            // neither key set
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
  });

  given('[case2] both keys present', () => {
    /**
     * .scenario = both primary and alternative keys are present
     * .expected = both should be sourced normally
     */
    const primaryKey = '__TEST_SDK_OPT_BOTH_PRIMARY__';
    const alternativeKey = '__TEST_SDK_OPT_BOTH_ALT__';
    const primaryValue = 'primary-value';
    const alternativeValue = 'alternative-value';

    when('[t0] keyrack.source() with both keys present', () => {
      const result = useThen('sdk call succeeds', async () => {
        const testDir = genTempDir({
          slug: 'keyrack-sdk-opt-both',
          symlink: [{ at: 'node_modules', to: 'node_modules' }],
          git: true,
        });

        const agentDir = join(testDir, '.agent');
        spawnSync('mkdir', ['-p', agentDir]);
        writeFileSync(
          join(agentDir, 'keyrack.yml'),
          `org: testorg

env.test:
  - key: ${primaryKey}
    is-optional-if-has: ${alternativeKey}
  - ${alternativeKey}
`,
        );

        spawnSync('git', ['add', '.'], { cwd: testDir });
        spawnSync('git', ['commit', '-m', 'add keyrack.yml'], { cwd: testDir });

        const modulePath = join(testDir, 'test-opt-both.mjs');
        writeFileSync(
          modulePath,
          `
import { keyrack } from '${rhachetDistPath}';

keyrack.source({ env: 'test', owner: 'testorg' });
console.log('primary value:', process.env.${primaryKey});
console.log('alternative value:', process.env.${alternativeKey});
`,
        );

        const spawnResult = spawnSync('node', [modulePath], {
          cwd: testDir,
          encoding: 'utf8', // eslint-disable-line @cspell/spellchecker -- node api
          env: {
            ...process.env,
            HOME: testDir,
            XDG_RUNTIME_DIR: join(testDir, '.xdg-runtime'),
            [primaryKey]: primaryValue,
            [alternativeKey]: alternativeValue,
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

      then('both keys are in process.env', () => {
        expect(result.stdout).toContain(`primary value: ${primaryValue}`);
        expect(result.stdout).toContain(`alternative value: ${alternativeValue}`);
      });

      then('stdout matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case3] alternative key with empty string value', () => {
    /**
     * .scenario = alternative key is present but empty string
     * .expected = empty string does NOT waive requirement (falsy)
     */
    const primaryKey = '__TEST_SDK_OPT_EMPTY_PRIMARY__';
    const alternativeKey = '__TEST_SDK_OPT_EMPTY_ALT__';

    when('[t0] keyrack.source() with empty alternative', () => {
      const result = useThen('sdk call fails', async () => {
        const testDir = genTempDir({
          slug: 'keyrack-sdk-opt-empty',
          symlink: [{ at: 'node_modules', to: 'node_modules' }],
          git: true,
        });

        const agentDir = join(testDir, '.agent');
        spawnSync('mkdir', ['-p', agentDir]);
        writeFileSync(
          join(agentDir, 'keyrack.yml'),
          `org: testorg

env.test:
  - key: ${primaryKey}
    is-optional-if-has: ${alternativeKey}
  - ${alternativeKey}
`,
        );

        spawnSync('git', ['add', '.'], { cwd: testDir });
        spawnSync('git', ['commit', '-m', 'add keyrack.yml'], { cwd: testDir });

        const modulePath = join(testDir, 'test-opt-empty.mjs');
        writeFileSync(
          modulePath,
          `
import { keyrack } from '${rhachetDistPath}';

keyrack.source({ env: 'test', owner: 'testorg' });
console.log('should not reach here');
`,
        );

        const spawnResult = spawnSync('node', [modulePath], {
          cwd: testDir,
          encoding: 'utf8', // eslint-disable-line @cspell/spellchecker -- node api
          env: {
            ...process.env,
            HOME: testDir,
            XDG_RUNTIME_DIR: join(testDir, '.xdg-runtime'),
            [alternativeKey]: '', // empty string
          },
        });

        return {
          status: spawnResult.status,
          stdout: spawnResult.stdout,
          stderr: spawnResult.stderr,
        };
      });

      then('exits with code 2 (empty string does not waive)', () => {
        expect(result.status).toEqual(2);
      });

      then('stderr matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case4] key with is-optional-if-has AND grade', () => {
    /**
     * .scenario = key has both is-optional-if-has and grade: ephemeral
     * .expected = both should be parsed correctly
     */
    const primaryKey = '__TEST_SDK_OPT_GRADED_PRIMARY__';
    const alternativeKey = '__TEST_SDK_OPT_GRADED_ALT__';
    const alternativeValue = 'alternative-graded-value';

    when('[t0] keyrack.source() with graded key and alternative present', () => {
      const result = useThen('sdk call succeeds', async () => {
        const testDir = genTempDir({
          slug: 'keyrack-sdk-opt-graded',
          symlink: [{ at: 'node_modules', to: 'node_modules' }],
          git: true,
        });

        const agentDir = join(testDir, '.agent');
        spawnSync('mkdir', ['-p', agentDir]);
        writeFileSync(
          join(agentDir, 'keyrack.yml'),
          `org: testorg

env.test:
  - key: ${primaryKey}
    is-optional-if-has: ${alternativeKey}
    grade: ephemeral
  - ${alternativeKey}
`,
        );

        spawnSync('git', ['add', '.'], { cwd: testDir });
        spawnSync('git', ['commit', '-m', 'add keyrack.yml'], { cwd: testDir });

        const modulePath = join(testDir, 'test-opt-graded.mjs');
        writeFileSync(
          modulePath,
          `
import { keyrack } from '${rhachetDistPath}';

keyrack.source({ env: 'test', owner: 'testorg' });
console.log('graded key waived');
console.log('alternative value:', process.env.${alternativeKey});
`,
        );

        const spawnResult = spawnSync('node', [modulePath], {
          cwd: testDir,
          encoding: 'utf8', // eslint-disable-line @cspell/spellchecker -- node api
          env: {
            ...process.env,
            HOME: testDir,
            XDG_RUNTIME_DIR: join(testDir, '.xdg-runtime'),
            [alternativeKey]: alternativeValue,
          },
        });

        return {
          status: spawnResult.status,
          stdout: spawnResult.stdout,
          stderr: spawnResult.stderr,
        };
      });

      then('exits with code 0 (graded key waived)', () => {
        expect(result.status).toEqual(0);
      });

      then('alternative key is in process.env', () => {
        expect(result.stdout).toContain(`alternative value: ${alternativeValue}`);
      });

      then('stdout matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case5] alternative key NOT in manifest but present in env', () => {
    /**
     * .scenario = primary key has is-optional-if-has for a key NOT in manifest
     *             but that key IS present in process.env
     * .expected = waiver should still apply (check env, not manifest)
     */
    const primaryKey = '__TEST_SDK_OPT_ENV_ONLY_PRIMARY__';
    const alternativeKey = '__TEST_SDK_OPT_ENV_ONLY_ALT__'; // NOT in manifest
    const alternativeValue = 'env-only-alternative-value';

    when('[t0] keyrack.source() with alternative in env but not in manifest', () => {
      const result = useThen('sdk call succeeds', async () => {
        const testDir = genTempDir({
          slug: 'keyrack-sdk-opt-env-only',
          symlink: [{ at: 'node_modules', to: 'node_modules' }],
          git: true,
        });

        const agentDir = join(testDir, '.agent');
        spawnSync('mkdir', ['-p', agentDir]);
        writeFileSync(
          join(agentDir, 'keyrack.yml'),
          `org: testorg

env.test:
  - key: ${primaryKey}
    is-optional-if-has: ${alternativeKey}
`,
        );
        // note: alternativeKey is NOT listed in manifest

        spawnSync('git', ['add', '.'], { cwd: testDir });
        spawnSync('git', ['commit', '-m', 'add keyrack.yml'], { cwd: testDir });

        const modulePath = join(testDir, 'test-opt-env-only.mjs');
        writeFileSync(
          modulePath,
          `
import { keyrack } from '${rhachetDistPath}';

keyrack.source({ env: 'test', owner: 'testorg' });
console.log('waiver checks env, not manifest');
`,
        );

        const spawnResult = spawnSync('node', [modulePath], {
          cwd: testDir,
          encoding: 'utf8', // eslint-disable-line @cspell/spellchecker -- node api
          env: {
            ...process.env,
            HOME: testDir,
            XDG_RUNTIME_DIR: join(testDir, '.xdg-runtime'),
            [alternativeKey]: alternativeValue, // in env but not manifest
          },
        });

        return {
          status: spawnResult.status,
          stdout: spawnResult.stdout,
          stderr: spawnResult.stderr,
        };
      });

      then('exits with code 0 (waiver checks env, not manifest)', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout shows completion', () => {
        expect(result.stdout).toContain('waiver checks env, not manifest');
      });

      then('stdout matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t1] keyrack.source() without alternative in env', () => {
      const result = useThen('sdk call fails', async () => {
        const testDir = genTempDir({
          slug: 'keyrack-sdk-opt-env-only-absent',
          symlink: [{ at: 'node_modules', to: 'node_modules' }],
          git: true,
        });

        const agentDir = join(testDir, '.agent');
        spawnSync('mkdir', ['-p', agentDir]);
        writeFileSync(
          join(agentDir, 'keyrack.yml'),
          `org: testorg

env.test:
  - key: ${primaryKey}
    is-optional-if-has: ${alternativeKey}
`,
        );

        spawnSync('git', ['add', '.'], { cwd: testDir });
        spawnSync('git', ['commit', '-m', 'add keyrack.yml'], { cwd: testDir });

        const modulePath = join(testDir, 'test-opt-env-only-absent.mjs');
        writeFileSync(
          modulePath,
          `
import { keyrack } from '${rhachetDistPath}';

keyrack.source({ env: 'test', owner: 'testorg' });
console.log('should not reach here');
`,
        );

        const spawnResult = spawnSync('node', [modulePath], {
          cwd: testDir,
          encoding: 'utf8', // eslint-disable-line @cspell/spellchecker -- node api
          env: {
            ...process.env,
            HOME: testDir,
            XDG_RUNTIME_DIR: join(testDir, '.xdg-runtime'),
            // neither key set
          },
        });

        return {
          status: spawnResult.status,
          stdout: spawnResult.stdout,
          stderr: spawnResult.stderr,
        };
      });

      then('exits with code 2 (no waiver, primary required)', () => {
        expect(result.status).toEqual(2);
      });

      then('stderr mentions absent key', () => {
        expect(result.stderr).toContain('absent');
        expect(result.stderr).toContain(primaryKey);
      });

      then('stderr matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case6] primary key directly supplied (happy path)', () => {
    /**
     * .scenario = primary key has is-optional-if-has, but primary IS supplied
     * .expected = primary is sourced, no waiver needed
     */
    const primaryKey = '__TEST_SDK_OPT_DIRECT_PRIMARY__';
    const alternativeKey = '__TEST_SDK_OPT_DIRECT_ALT__';
    const primaryValue = 'direct-primary-value';

    when('[t0] keyrack.source() with primary key supplied', () => {
      const result = useThen('sdk call succeeds', async () => {
        const testDir = genTempDir({
          slug: 'keyrack-sdk-opt-direct',
          symlink: [{ at: 'node_modules', to: 'node_modules' }],
          git: true,
        });

        const agentDir = join(testDir, '.agent');
        spawnSync('mkdir', ['-p', agentDir]);
        // note: alternativeKey is NOT in manifest - is-optional-if-has only checks process.env
        writeFileSync(
          join(agentDir, 'keyrack.yml'),
          `org: testorg

env.test:
  - key: ${primaryKey}
    is-optional-if-has: ${alternativeKey}
`,
        );

        spawnSync('git', ['add', '.'], { cwd: testDir });
        spawnSync('git', ['commit', '-m', 'add keyrack.yml'], { cwd: testDir });

        const modulePath = join(testDir, 'test-opt-direct.mjs');
        writeFileSync(
          modulePath,
          `
import { keyrack } from '${rhachetDistPath}';

keyrack.source({ env: 'test', owner: 'testorg' });
console.log('primary directly supplied');
console.log('primary value:', process.env.${primaryKey});
`,
        );

        const spawnResult = spawnSync('node', [modulePath], {
          cwd: testDir,
          encoding: 'utf8', // eslint-disable-line @cspell/spellchecker -- node api
          env: {
            ...process.env,
            HOME: testDir,
            XDG_RUNTIME_DIR: join(testDir, '.xdg-runtime'),
            [primaryKey]: primaryValue, // primary IS set
            // alternative NOT set
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

      then('primary key is in process.env', () => {
        expect(result.stdout).toContain(`primary value: ${primaryValue}`);
      });

      then('stdout matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });
});
