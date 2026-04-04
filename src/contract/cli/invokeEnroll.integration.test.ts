import { Command } from 'commander';
import { getError, given, then, when } from 'test-fns';

import type { ClaudeCodeSettings } from '@src/_topublish/rhachet-brains-anthropic/src/hooks/config.dao';

/**
 * .what = skip in CI, run locally
 * .why = these tests spawn `claude` CLI; provisioning claude in CI costs
 *        more than the value of running these tests in CI. locally,
 *        tests fail fast if claude is absent — no silent passes.
 */
const isCI = process.env['CI'] === 'true';
const describeUnlessCI = isCI ? describe.skip : describe;

import {
  chmodSync,
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

/**
 * .what = extracts role slugs from settings hooks via author field
 * .why = real hooks have author on inner hook objects, not on entry.matcher
 */
const getRolesFromSettings = (settings: ClaudeCodeSettings): string[] => {
  const roles: string[] = [];
  const entries = settings.hooks?.SessionStart ?? [];
  for (const entry of entries) {
    for (const hook of entry.hooks) {
      const author = (hook as { author?: string }).author;
      if (author) {
        const match = author.match(/role=([^/]+)/);
        if (match) roles.push(match[1]!);
      }
    }
  }
  return roles;
};

describeUnlessCI('invokeEnroll (integration)', () => {
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

    // create a mock brain executable that just echoes args
    const mockBrainPath = resolve(testDir, 'mock-claude');
    writeFileSync(
      mockBrainPath,
      '#!/usr/bin/env bash\necho "mock-claude args: $@"\n',
    );
    chmodSync(mockBrainPath, '755');
  };

  given('[case1] repo with roles linked', () => {
    const testDir = resolve(__dirname, './.temp/invokeEnroll-case1');
    const originalCwd = process.cwd();

    // real hook structure: matcher is generic, author is on inner hooks
    const settingsWithHooks: ClaudeCodeSettings = {
      hooks: {
        SessionStart: [
          {
            matcher: '*',
            hooks: [
              {
                type: 'command',
                command: 'echo mechanic boot',
                author: 'repo=.this/role=mechanic',
              },
              {
                type: 'command',
                command: 'echo driver boot',
                author: 'repo=.this/role=driver',
              },
              {
                type: 'command',
                command: 'echo ergonomist boot',
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

    when('[t0] enroll claude --roles mechanic', () => {
      then(
        'generates unique enrollment config with only mechanic hooks',
        async () => {
          const program = new Command();
          invokeEnroll({ program });

          // run the command - enrollBrainCli is mocked, so no spawn happens
          await program.parseAsync(
            ['enroll', 'claude', '--roles', 'mechanic'],
            {
              from: 'user',
            },
          );

          // check that settings.enroll.$hash.local.json was created
          const claudeDir = resolve(testDir, '.claude');
          const enrollConfigPath = findEnrollmentConfig(claudeDir);
          expect(enrollConfigPath).not.toBeNull();
          expect(enrollConfigPath).toMatch(
            /settings\.enroll\.[a-f0-9]+\.local\.json$/,
          );

          // parse and verify content
          const content = readFileSync(enrollConfigPath!, 'utf-8');
          const settings = JSON.parse(content) as ClaudeCodeSettings;

          // with real structure: 1 entry, 1 inner hook for mechanic
          expect(settings.hooks?.SessionStart).toHaveLength(1);
          const roles = getRolesFromSettings(settings);
          expect(roles).toEqual(['mechanic']);

          // note: no snapshot since tests skip in CI (describeUnlessCI)
        },
      );
    });

    when('[t1] enroll claude --roles -driver', () => {
      then('generates config without driver hooks', async () => {
        const program = new Command();
        invokeEnroll({ program });

        // run the command - enrollBrainCli is mocked, so no spawn happens
        await program.parseAsync(['enroll', 'claude', '--roles', '-driver'], {
          from: 'user',
        });

        const claudeDir = resolve(testDir, '.claude');
        const enrollConfigPath = findEnrollmentConfig(claudeDir);
        expect(enrollConfigPath).not.toBeNull();

        const content = readFileSync(enrollConfigPath!, 'utf-8');
        const settings = JSON.parse(content) as ClaudeCodeSettings;

        // should have mechanic and ergonomist, not driver
        // with real structure: 1 entry, 2 inner hooks
        expect(settings.hooks?.SessionStart).toHaveLength(1);
        const roles = getRolesFromSettings(settings);
        expect(roles).toContain('mechanic');
        expect(roles).toContain('ergonomist');
        expect(roles).not.toContain('driver');

        // note: no snapshot since tests skip in CI (describeUnlessCI)
      });
    });
  });

  given('[case2] repo with no .agent/ directory', () => {
    const testDir = resolve(__dirname, './.temp/invokeEnroll-case2');
    const originalCwd = process.cwd();

    beforeAll(() => {
      if (existsSync(testDir)) {
        rmSync(testDir, { recursive: true, force: true });
      }
      mkdirSync(testDir, { recursive: true });
      process.chdir(testDir);
    });

    afterAll(() => {
      process.chdir(originalCwd);
    });

    when('[t0] enroll claude --roles mechanic', () => {
      then('throws error about no .agent/ found', async () => {
        const program = new Command();
        invokeEnroll({ program });

        const error = await getError(() =>
          program.parseAsync(['enroll', 'claude', '--roles', 'mechanic'], {
            from: 'user',
          }),
        );

        expect(error?.message).toContain('no .agent/ found');
      });
    });
  });

  given('[case3] repo with empty .agent/', () => {
    const testDir = resolve(__dirname, './.temp/invokeEnroll-case3');
    const originalCwd = process.cwd();

    beforeAll(() => {
      if (existsSync(testDir)) {
        rmSync(testDir, { recursive: true, force: true });
      }
      mkdirSync(testDir, { recursive: true });
      mkdirSync(resolve(testDir, '.agent'), { recursive: true });
      process.chdir(testDir);
    });

    afterAll(() => {
      process.chdir(originalCwd);
    });

    when('[t0] enroll claude --roles mechanic', () => {
      then('throws error about no roles found', async () => {
        const program = new Command();
        invokeEnroll({ program });

        const error = await getError(() =>
          program.parseAsync(['enroll', 'claude', '--roles', 'mechanic'], {
            from: 'user',
          }),
        );

        expect(error?.message).toContain('no roles found');
      });
    });
  });

  given('[case4] spec parse errors', () => {
    const testDir = resolve(__dirname, './.temp/invokeEnroll-case4');
    const originalCwd = process.cwd();

    beforeAll(() => {
      createTestEnv({
        testDir,
        roles: ['mechanic', 'driver'],
        settings: {},
      });
      process.chdir(testDir);
    });

    afterAll(() => {
      process.chdir(originalCwd);
    });

    when('[t0] enroll claude --roles ""', () => {
      then('throws error about empty spec', async () => {
        const program = new Command();
        invokeEnroll({ program });

        const error = await getError(() =>
          program.parseAsync(['enroll', 'claude', '--roles', ''], {
            from: 'user',
          }),
        );

        expect(error?.message).toContain('--roles is empty');
      });
    });

    when('[t1] enroll claude --roles +mechanic,-mechanic', () => {
      then('throws error about conflict', async () => {
        const program = new Command();
        invokeEnroll({ program });

        const error = await getError(() =>
          program.parseAsync(
            ['enroll', 'claude', '--roles', '+mechanic,-mechanic'],
            { from: 'user' },
          ),
        );

        expect(error?.message).toContain('cannot both add and remove');
      });
    });

    when('[t2] enroll claude --roles mechnic (typo)', () => {
      then('throws error with suggestion', async () => {
        const program = new Command();
        invokeEnroll({ program });

        const error = await getError(() =>
          program.parseAsync(['enroll', 'claude', '--roles', 'mechnic'], {
            from: 'user',
          }),
        );

        expect(error?.message).toContain("role 'mechnic' not found");
        expect(error?.message).toContain("did you mean 'mechanic'");

        // note: no snapshot since tests skip in CI (describeUnlessCI)
      });
    });
  });

  given('[case5] unsupported brain', () => {
    const testDir = resolve(__dirname, './.temp/invokeEnroll-case5');
    const originalCwd = process.cwd();

    beforeAll(() => {
      createTestEnv({
        testDir,
        roles: ['mechanic'],
        settings: {},
      });
      process.chdir(testDir);
    });

    afterAll(() => {
      process.chdir(originalCwd);
    });

    when('[t0] enroll openai --roles mechanic', () => {
      then('throws error about unsupported brain', async () => {
        const program = new Command();
        invokeEnroll({ program });

        const error = await getError(() =>
          program.parseAsync(['enroll', 'openai', '--roles', 'mechanic'], {
            from: 'user',
          }),
        );

        expect(error?.message).toContain("brain 'openai' not supported");
      });
    });
  });

  given('[case6] additional spec modes', () => {
    const testDir = resolve(__dirname, './.temp/invokeEnroll-case6');
    const originalCwd = process.cwd();

    // real hook structure: matcher is generic, author is on inner hooks
    const settingsWithHooks: ClaudeCodeSettings = {
      hooks: {
        SessionStart: [
          {
            matcher: '*',
            hooks: [
              {
                type: 'command',
                command: 'echo mechanic boot',
                author: 'repo=.this/role=mechanic',
              },
              {
                type: 'command',
                command: 'echo driver boot',
                author: 'repo=.this/role=driver',
              },
              {
                type: 'command',
                command: 'echo architect boot',
                author: 'repo=.this/role=architect',
              },
            ],
          },
        ],
      },
    };

    beforeAll(() => {
      createTestEnv({
        testDir,
        roles: ['mechanic', 'driver', 'architect'],
        settings: settingsWithHooks,
      });
      process.chdir(testDir);
    });

    afterAll(() => {
      process.chdir(originalCwd);
    });

    when('[t0] enroll claude --roles +architect (append)', () => {
      then('generates config with defaults plus architect', async () => {
        const program = new Command();
        invokeEnroll({ program });

        // run the command - enrollBrainCli is mocked, so no spawn happens
        await program.parseAsync(
          ['enroll', 'claude', '--roles', '+architect'],
          {
            from: 'user',
          },
        );

        const claudeDir = resolve(testDir, '.claude');
        const enrollConfigPath = findEnrollmentConfig(claudeDir);
        expect(enrollConfigPath).not.toBeNull();

        const content = readFileSync(enrollConfigPath!, 'utf-8');
        const settings = JSON.parse(content) as ClaudeCodeSettings;

        // all three roles should be present (1 entry with 3 inner hooks)
        expect(settings.hooks?.SessionStart).toHaveLength(1);
        const roles = getRolesFromSettings(settings);
        expect(roles).toContain('mechanic');
        expect(roles).toContain('driver');
        expect(roles).toContain('architect');
        expect(roles).toHaveLength(3); // no extras, no duplicates
      });
    });

    when(
      '[t1] enroll claude --roles mechanic,architect (explicit multi)',
      () => {
        then('generates config with only specified roles', async () => {
          const program = new Command();
          invokeEnroll({ program });

          // run the command - enrollBrainCli is mocked, so no spawn happens
          await program.parseAsync(
            ['enroll', 'claude', '--roles', 'mechanic,architect'],
            { from: 'user' },
          );

          const claudeDir = resolve(testDir, '.claude');
          const enrollConfigPath = findEnrollmentConfig(claudeDir);
          expect(enrollConfigPath).not.toBeNull();

          const content = readFileSync(enrollConfigPath!, 'utf-8');
          const settings = JSON.parse(content) as ClaudeCodeSettings;

          // only mechanic and architect, no driver (1 entry with 2 inner hooks)
          expect(settings.hooks?.SessionStart).toHaveLength(1);
          const roles = getRolesFromSettings(settings);
          expect(roles).toContain('mechanic');
          expect(roles).toContain('architect');
          expect(roles).not.toContain('driver');
        });
      },
    );

    when('[t2] enroll claude (no --roles flag)', () => {
      then('errors about required option (usecase.7)', async () => {
        const program = new Command();
        program.exitOverride(); // throw instead of process.exit
        invokeEnroll({ program });

        // commander throws CommanderError for required options
        const error = await getError(() =>
          program.parseAsync(['enroll', 'claude'], { from: 'user' }),
        );

        // commander errors contain the absent option name
        expect(error?.message).toContain('--roles');
      });
    });
  });

  given('[case7] idempotent operations', () => {
    const testDir = resolve(__dirname, './.temp/invokeEnroll-case7');
    const originalCwd = process.cwd();

    // real hook structure: matcher is generic, author is on inner hooks
    const settingsWithHooks: ClaudeCodeSettings = {
      hooks: {
        SessionStart: [
          {
            matcher: '*',
            hooks: [
              {
                type: 'command',
                command: 'echo mechanic boot',
                author: 'repo=.this/role=mechanic',
              },
              {
                type: 'command',
                command: 'echo driver boot',
                author: 'repo=.this/role=driver',
              },
              {
                type: 'command',
                command: 'echo architect boot',
                author: 'repo=.this/role=architect',
              },
            ],
          },
        ],
      },
    };

    beforeAll(() => {
      // include architect in linked roles so -architect is valid
      createTestEnv({
        testDir,
        roles: ['mechanic', 'driver', 'architect'],
        settings: settingsWithHooks,
      });
      process.chdir(testDir);
    });

    afterAll(() => {
      process.chdir(originalCwd);
    });

    when('[t0] enroll claude --roles -architect (subtract linked role)', () => {
      then('generates config without architect', async () => {
        const program = new Command();
        invokeEnroll({ program });

        // run the command - enrollBrainCli is mocked, so no spawn happens
        await program.parseAsync(
          ['enroll', 'claude', '--roles', '-architect'],
          {
            from: 'user',
          },
        );

        const claudeDir = resolve(testDir, '.claude');
        const enrollConfigPath = findEnrollmentConfig(claudeDir);
        expect(enrollConfigPath).not.toBeNull();

        const content = readFileSync(enrollConfigPath!, 'utf-8');
        const settings = JSON.parse(content) as ClaudeCodeSettings;

        // mechanic and driver present, architect removed (1 entry with 2 inner hooks)
        expect(settings.hooks?.SessionStart).toHaveLength(1);
        const roles = getRolesFromSettings(settings);
        expect(roles).toContain('mechanic');
        expect(roles).toContain('driver');
        expect(roles).not.toContain('architect');
      });
    });

    when('[t1] enroll claude --roles +mechanic (append present role)', () => {
      then('no error, returns defaults unchanged (no duplicates)', async () => {
        const program = new Command();
        invokeEnroll({ program });

        // run the command - enrollBrainCli is mocked, so no spawn happens
        await program.parseAsync(['enroll', 'claude', '--roles', '+mechanic'], {
          from: 'user',
        });

        const claudeDir = resolve(testDir, '.claude');
        const enrollConfigPath = findEnrollmentConfig(claudeDir);
        expect(enrollConfigPath).not.toBeNull();

        const content = readFileSync(enrollConfigPath!, 'utf-8');
        const settings = JSON.parse(content) as ClaudeCodeSettings;

        // all three roles still present (no duplicates from re-adding mechanic)
        // 1 entry with 3 inner hooks
        expect(settings.hooks?.SessionStart).toHaveLength(1);
        const roles = getRolesFromSettings(settings);
        expect(roles).toContain('mechanic');
        expect(roles).toContain('driver');
        expect(roles).toContain('architect');
        expect(roles).toHaveLength(3); // no duplicates of mechanic
      });
    });
  });
});
