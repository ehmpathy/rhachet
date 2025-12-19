import { execSync } from 'child_process';
import { Command } from 'commander';
import { given, then, when } from 'test-fns';

import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { invokeInit } from './invokeInit';

describe('invokeInit (integration)', () => {
  given('a CLI program with invokeInit registered', () => {
    const testDir = resolve(__dirname, './.temp/invokeInit');
    const originalCwd = process.cwd();

    beforeAll(() => {
      // Create test directory structure
      mkdirSync(testDir, { recursive: true });

      // Initialize as a git repo for getGitRepoRoot to work
      try {
        execSync('git init', { cwd: testDir, stdio: 'pipe' });
      } catch {
        // already a git repo
      }
    });

    afterAll(() => {
      process.chdir(originalCwd);
    });

    const program = new Command('rhachet');
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    beforeEach(() => {
      logSpy.mockClear();
      process.chdir(testDir);

      // Clean up any existing rhachet.use.ts
      const configPath = resolve(testDir, 'rhachet.use.ts');
      if (existsSync(configPath)) {
        rmSync(configPath);
      }
    });

    invokeInit({ program });

    when(
      'invoked with package.json containing rhachet-roles-* packages',
      () => {
        beforeEach(() => {
          // Create package.json with rhachet-roles packages
          writeFileSync(
            resolve(testDir, 'package.json'),
            JSON.stringify({
              name: 'test-project',
              dependencies: {
                'rhachet-roles-ehmpathy': '1.0.0',
              },
            }),
          );
        });

        then(
          'it should create rhachet.use.ts with discovered packages',
          async () => {
            await program.parseAsync(['init'], { from: 'user' });

            const configPath = resolve(testDir, 'rhachet.use.ts');
            expect(existsSync(configPath)).toBe(true);

            const content = readFileSync(configPath, 'utf8');
            expect(content).toContain('getRoleRegistryEhmpathy');
            expect(content).toContain('getInvokeHooksEhmpathy');
            expect(content).toContain("from 'rhachet-roles-ehmpathy'");

            // Check log output
            expect(logSpy).toHaveBeenCalledWith(
              expect.stringContaining('rhachet-roles-ehmpathy'),
            );
            expect(logSpy).toHaveBeenCalledWith(
              expect.stringContaining('Done'),
            );
          },
        );
      },
    );

    when('invoked with multiple rhachet-roles-* packages', () => {
      beforeEach(() => {
        writeFileSync(
          resolve(testDir, 'package.json'),
          JSON.stringify({
            name: 'test-project',
            dependencies: {
              'rhachet-roles-ehmpathy': '1.0.0',
            },
            devDependencies: {
              'rhachet-roles-other': '1.0.0',
            },
          }),
        );
      });

      then('it should include all packages in config', async () => {
        await program.parseAsync(['init'], { from: 'user' });

        const configPath = resolve(testDir, 'rhachet.use.ts');
        const content = readFileSync(configPath, 'utf8');

        expect(content).toContain('getRoleRegistryEhmpathy');
        expect(content).toContain('getRoleRegistryOther');
        expect(content).toContain(
          'getInvokeHooksEhmpathy(), getInvokeHooksOther()',
        );
      });
    });

    when('invoked with no rhachet-roles-* packages', () => {
      beforeEach(() => {
        writeFileSync(
          resolve(testDir, 'package.json'),
          JSON.stringify({
            name: 'test-project',
            dependencies: {
              lodash: '4.0.0',
            },
          }),
        );
      });

      then('it should warn and not create config', async () => {
        await program.parseAsync(['init'], { from: 'user' });

        const configPath = resolve(testDir, 'rhachet.use.ts');
        expect(existsSync(configPath)).toBe(false);

        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('No rhachet-roles-* packages found'),
        );
      });
    });

    when('invoked successfully', () => {
      beforeEach(() => {
        writeFileSync(
          resolve(testDir, 'package.json'),
          JSON.stringify({
            name: 'test-project',
            dependencies: { 'rhachet-roles-ehmpathy': '1.0.0' },
          }),
        );

        // Clean up agent dirs
        const agentDir = resolve(testDir, '.agent');
        if (existsSync(agentDir)) rmSync(agentDir, { recursive: true });
      });

      then(
        'it should create .agent/repo=.this/role=any/briefs and skills directories',
        async () => {
          await program.parseAsync(['init'], { from: 'user' });

          const briefsDir = resolve(
            testDir,
            '.agent/repo=.this/role=any/briefs',
          );
          const skillsDir = resolve(
            testDir,
            '.agent/repo=.this/role=any/skills',
          );

          expect(existsSync(briefsDir)).toBe(true);
          expect(existsSync(skillsDir)).toBe(true);
        },
      );

      then(
        'it should create .agent/repo=.this/role=any/readme.md with correct content',
        async () => {
          await program.parseAsync(['init'], { from: 'user' });

          const readmePath = resolve(
            testDir,
            '.agent/repo=.this/role=any/readme.md',
          );

          expect(existsSync(readmePath)).toBe(true);
          expect(readFileSync(readmePath, 'utf8')).toBe(
            'this role applies to any agent that works within this repo\n',
          );
        },
      );

      then(
        'it should not overwrite existing agent directories or readme (findsert)',
        async () => {
          // Pre-create with custom content
          const roleAnyDir = resolve(testDir, '.agent/repo=.this/role=any');
          const briefsDir = resolve(roleAnyDir, 'briefs');
          const readmePath = resolve(roleAnyDir, 'readme.md');

          mkdirSync(briefsDir, { recursive: true });
          writeFileSync(readmePath, 'custom content');

          await program.parseAsync(['init'], { from: 'user' });

          // Should preserve custom content
          expect(readFileSync(readmePath, 'utf8')).toBe('custom content');
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('○ [found]'),
          );
        },
      );
    });

    when('rhachet.use.ts already exists', () => {
      beforeEach(() => {
        writeFileSync(
          resolve(testDir, 'package.json'),
          JSON.stringify({
            name: 'test-project',
            dependencies: {
              'rhachet-roles-ehmpathy': '1.0.0',
            },
          }),
        );
        writeFileSync(resolve(testDir, 'rhachet.use.ts'), '// existing config');
      });

      then(
        'it should report [found] and preserve existing content (findsert)',
        async () => {
          await program.parseAsync(['init'], { from: 'user' });

          // should preserve existing content
          const configPath = resolve(testDir, 'rhachet.use.ts');
          const content = readFileSync(configPath, 'utf8');
          expect(content).toBe('// existing config');

          // should report found
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('○ [found]'),
          );
        },
      );
    });
  });
});
