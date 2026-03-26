import { Command } from 'commander';
import { given, then, when } from 'test-fns';

import type { ClaudeCodeSettings } from '@src/_topublish/rhachet-brains-anthropic/src/hooks/config.dao';

import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { invokeEnroll } from './invokeEnroll';

/**
 * .what = acceptance tests for enroll command that actually spawn Claude
 * .why = verify end-to-end behavior with real Claude CLI
 *
 * .note = these tests require:
 *   - ANTHROPIC_API_KEY in environment
 *   - claude CLI installed with --setting-sources support (v2026-03-20+)
 *   - NOT running inside a Claude session (nested sessions blocked)
 */

/**
 * .what = finds the generated enrollment config file
 * .why = config files have unique hash in name (settings.enroll.$hash.local.json)
 */
const findEnrollmentConfig = (claudeDir: string): string | null => {
  if (!existsSync(claudeDir)) return null;
  const files = readdirSync(claudeDir);
  const enrollConfig = files.find((f) =>
    /^settings\.enroll\.[a-f0-9]+\.local\.json$/.test(f),
  );
  return enrollConfig ? resolve(claudeDir, enrollConfig) : null;
};

// unskip when you need to test locally
describe.skip('invokeEnroll (acceptance)', () => {
  /**
   * .what = creates a test directory with .agent/ and .claude/ structure
   * .why = isolated test environment with mock roles
   */
  const createTestEnv = (input: {
    testDir: string;
    roles: string[];
    settings?: ClaudeCodeSettings;
  }): void => {
    const { testDir, roles, settings } = input;

    // clean up first
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }

    // create test directory
    mkdirSync(testDir, { recursive: true });

    // create .agent/ structure with specified roles
    for (const role of roles) {
      const roleDir = resolve(testDir, `.agent/repo=.this/role=${role}`);
      mkdirSync(roleDir, { recursive: true });

      // create a readme for the role
      writeFileSync(resolve(roleDir, 'readme.md'), `# ${role} role\n`);
    }

    // create .claude/settings.json if settings provided
    if (settings) {
      const claudeDir = resolve(testDir, '.claude');
      mkdirSync(claudeDir, { recursive: true });
      writeFileSync(
        resolve(claudeDir, 'settings.json'),
        JSON.stringify(settings, null, 2),
      );
    }
  };

  given('[case1] real Claude spawn with --roles mechanic', () => {
    const testDir = resolve(__dirname, './.temp/invokeEnroll-acceptance-case1');
    const originalCwd = process.cwd();

    // real hook structure: only mechanic, driver, ergonomist hooks
    const settingsWithHooks: ClaudeCodeSettings = {
      hooks: {
        SessionStart: [
          {
            matcher: '*',
            hooks: [
              {
                type: 'command',
                command:
                  'echo "🐢 booted with role: mechanic" && echo "ROLE_BOOTED=mechanic"',
                author: 'repo=.this/role=mechanic',
              },
              {
                type: 'command',
                command:
                  'echo "🐢 booted with role: driver" && echo "ROLE_BOOTED=driver"',
                author: 'repo=.this/role=driver',
              },
              {
                type: 'command',
                command:
                  'echo "🐢 booted with role: ergonomist" && echo "ROLE_BOOTED=ergonomist"',
                author: 'repo=.this/role=ergonomist',
              },
            ],
          },
        ],
      },
    };

    beforeAll(() => {
      createTestEnv({
        testDir,
        roles: ['mechanic', 'driver', 'ergonomist'],
        settings: settingsWithHooks,
      });
      process.chdir(testDir);
    });

    afterAll(() => {
      process.chdir(originalCwd);
    });

    when('[t0] generate config with --roles mechanic then spawn Claude', () => {
      then('Claude boots with ONLY mechanic hooks', async () => {
        // skip if no API key
        if (!process.env['ANTHROPIC_API_KEY']) {
          console.log('SKIP: ANTHROPIC_API_KEY not set');
          return;
        }

        // step 1: generate the enrollment config
        const program = new Command();
        invokeEnroll({ program });

        // prevent process.exit from killing test
        const originalExit = process.exit;
        // @ts-expect-error - mock
        process.exit = jest.fn();

        try {
          await program
            .parseAsync(['enroll', 'claude', '--roles', 'mechanic'], {
              from: 'user',
            })
            .catch(() => {
              // swallow spawn error - config should be generated
            });
        } finally {
          process.exit = originalExit;
        }

        // step 2: find the generated config
        const claudeDir = resolve(testDir, '.claude');
        const configPath = findEnrollmentConfig(claudeDir);
        expect(configPath).not.toBeNull();

        // step 3: verify config has only mechanic hooks
        const configContent = readFileSync(configPath!, 'utf-8');
        const config = JSON.parse(configContent) as ClaudeCodeSettings;

        const innerHooks = config.hooks?.SessionStart?.[0]?.hooks ?? [];
        const authors = innerHooks.map(
          (h) => (h as { author?: string }).author,
        );
        expect(authors).toHaveLength(1);
        expect(authors[0]).toContain('role=mechanic');

        // step 4: actually spawn Claude with --setting-sources user and the config
        // this asks Claude which roles it was booted with
        const prompt =
          'Based on the SessionStart hooks in your settings, which roles were you booted with? List only the role names.';
        const spawnResult = spawnSync(
          'claude',
          [
            '--setting-sources',
            'local',
            '--settings',
            configPath!,
            '--output-format',
            'json',
            '--allowedTools',
            'Read',
            '-p',
            prompt,
          ],
          {
            cwd: testDir,
            encoding: 'utf-8',
            timeout: 60000,
            env: {
              ...process.env,
              CLAUDECODE: undefined, // clear to avoid nested session error
            },
          },
        );

        if (spawnResult.error) throw spawnResult.error;

        const response = JSON.parse(spawnResult.stdout);

        // skip if credit balance is too low
        if (response.result === 'Credit balance is too low') {
          console.log('SKIP: Credit balance is too low');
          return;
        }

        if (spawnResult.status !== 0) {
          throw new Error(
            `claude exited with ${spawnResult.status}: ${spawnResult.stderr}\nstdout: ${spawnResult.stdout}`,
          );
        }

        const text = (response.result ?? response.content ?? '').toLowerCase();

        // verify Claude only sees mechanic
        expect(text).toContain('mechanic');
        expect(text).not.toContain('driver');
        expect(text).not.toContain('ergonomist');
      });
    });

    when('[t1] generate config with --roles -driver then spawn Claude', () => {
      then('Claude boots without driver hooks', async () => {
        // skip if no API key
        if (!process.env['ANTHROPIC_API_KEY']) {
          console.log('SKIP: no API key');
          return;
        }

        // generate config
        const program = new Command();
        invokeEnroll({ program });

        const originalExit = process.exit;
        // @ts-expect-error - mock
        process.exit = jest.fn();

        try {
          await program
            .parseAsync(['enroll', 'claude', '--roles', '-driver'], {
              from: 'user',
            })
            .catch(() => {});
        } finally {
          process.exit = originalExit;
        }

        // find config
        const claudeDir = resolve(testDir, '.claude');
        const configPath = findEnrollmentConfig(claudeDir);
        expect(configPath).not.toBeNull();

        // verify config excludes driver
        const configContent = readFileSync(configPath!, 'utf-8');
        const config = JSON.parse(configContent) as ClaudeCodeSettings;

        const innerHooks = config.hooks?.SessionStart?.[0]?.hooks ?? [];
        const authors = innerHooks.map(
          (h) => (h as { author?: string }).author,
        );
        expect(authors.some((a) => a?.includes('role=driver'))).toBe(false);
        expect(authors.some((a) => a?.includes('role=mechanic'))).toBe(true);
        expect(authors.some((a) => a?.includes('role=ergonomist'))).toBe(true);

        // spawn Claude
        const prompt =
          'Based on the SessionStart hooks in your settings, which roles were you booted with? List only the role names.';
        const spawnResult = spawnSync(
          'claude',
          [
            '--setting-sources',
            'local',
            '--settings',
            configPath!,
            '--output-format',
            'json',
            '--allowedTools',
            'Read',
            '-p',
            prompt,
          ],
          {
            cwd: testDir,
            encoding: 'utf-8',
            timeout: 60000,
            env: {
              ...process.env,
              CLAUDECODE: undefined,
            },
          },
        );

        if (spawnResult.error) throw spawnResult.error;

        const response = JSON.parse(spawnResult.stdout);

        // skip if credit balance is too low
        if (response.result === 'Credit balance is too low') {
          console.log('SKIP: Credit balance is too low');
          return;
        }

        if (spawnResult.status !== 0) {
          throw new Error(
            `claude exited with ${spawnResult.status}: ${spawnResult.stderr}\nstdout: ${spawnResult.stdout}`,
          );
        }

        const text = (response.result ?? response.content ?? '').toLowerCase();

        // verify Claude sees mechanic and ergonomist but not driver
        expect(text).toContain('mechanic');
        expect(text).toContain('ergonomist');
        expect(text).not.toContain('driver');
      });
    });
  });
});
