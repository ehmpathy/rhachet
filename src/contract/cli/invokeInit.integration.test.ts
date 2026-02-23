import { execSync } from 'child_process';
import { Command } from 'commander';
import { genTempDir, given, then, when } from 'test-fns';

import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { invokeInit } from './invokeInit';

describe('invokeInit (integration)', () => {
  given('a CLI program with invokeInit registered', () => {
    const testDir = genTempDir({ slug: 'invokeInit' });
    const originalCwd = process.cwd();

    beforeAll(() => {
      // Initialize as a git repo for getGitRepoRoot to work
      try {
        execSync('git init', { cwd: testDir, stdio: 'pipe' });
      } catch {
        // already a git repo
      }

      // Symlink node_modules so rhachet-roles-* packages are discoverable
      const nodeModulesLink = join(testDir, 'node_modules');
      const nodeModulesTarget = resolve(__dirname, '../../..', 'node_modules');
      if (!existsSync(nodeModulesLink)) {
        symlinkSync(nodeModulesTarget, nodeModulesLink, 'dir');
      }
    });

    afterAll(() => {
      process.chdir(originalCwd);
    });

    const program = new Command('rhachet');
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const exitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);

    beforeEach(() => {
      logSpy.mockClear();
      exitSpy.mockClear();
      process.chdir(testDir);

      // Clean up any extant rhachet.use.ts
      const configPath = resolve(testDir, 'rhachet.use.ts');
      if (existsSync(configPath)) {
        rmSync(configPath);
      }
    });

    // register the init command
    invokeInit({ program });

    when(
      'invoked with --config and package.json that has rhachet-roles-* packages',
      () => {
        beforeEach(() => {
          // create package.json with rhachet-roles packages
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
            await program.parseAsync(['init', '--config'], { from: 'user' });

            const configPath = resolve(testDir, 'rhachet.use.ts');
            expect(existsSync(configPath)).toBe(true);

            const content = readFileSync(configPath, 'utf8');
            expect(content).toContain('getRoleRegistryEhmpathy');
            expect(content).toContain('getInvokeHooksEhmpathy');
            expect(content).toContain("from 'rhachet-roles-ehmpathy'");

            // check log output
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

    when('invoked with --config and multiple rhachet-roles-* packages', () => {
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
        await program.parseAsync(['init', '--config'], { from: 'user' });

        const configPath = resolve(testDir, 'rhachet.use.ts');
        const content = readFileSync(configPath, 'utf8');

        expect(content).toContain('getRoleRegistryEhmpathy');
        expect(content).toContain('getRoleRegistryOther');
        expect(content).toContain(
          'getInvokeHooksEhmpathy(), getInvokeHooksOther()',
        );
      });
    });

    when('invoked with --config and no rhachet-roles-* packages', () => {
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
        await program.parseAsync(['init', '--config'], { from: 'user' });

        const configPath = resolve(testDir, 'rhachet.use.ts');
        expect(existsSync(configPath)).toBe(false);

        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('No rhachet-roles-* packages found'),
        );
      });
    });

    when('invoked with --config successfully', () => {
      beforeEach(() => {
        writeFileSync(
          resolve(testDir, 'package.json'),
          JSON.stringify({
            name: 'test-project',
            dependencies: { 'rhachet-roles-ehmpathy': '1.0.0' },
          }),
        );

        // clean up agent dirs
        const agentDir = resolve(testDir, '.agent');
        if (existsSync(agentDir)) rmSync(agentDir, { recursive: true });
      });

      then(
        'it should create .agent/repo=.this/role=any/briefs and skills directories',
        async () => {
          await program.parseAsync(['init', '--config'], { from: 'user' });

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
          await program.parseAsync(['init', '--config'], { from: 'user' });

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
        'it should not overwrite prior agent directories or readme (findsert)',
        async () => {
          // pre-create with custom content
          const roleAnyDir = resolve(testDir, '.agent/repo=.this/role=any');
          const briefsDir = resolve(roleAnyDir, 'briefs');
          const readmePath = resolve(roleAnyDir, 'readme.md');

          mkdirSync(briefsDir, { recursive: true });
          writeFileSync(readmePath, 'custom content');

          await program.parseAsync(['init', '--config'], { from: 'user' });

          // should preserve custom content
          expect(readFileSync(readmePath, 'utf8')).toBe('custom content');
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('○ [found]'),
          );
        },
      );
    });

    when('rhachet.use.ts already exists and --config is used', () => {
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
        writeFileSync(resolve(testDir, 'rhachet.use.ts'), '// prior config');
      });

      then(
        'it should report [found] and preserve prior content (findsert)',
        async () => {
          await program.parseAsync(['init', '--config'], { from: 'user' });

          // should preserve prior content
          const configPath = resolve(testDir, 'rhachet.use.ts');
          const content = readFileSync(configPath, 'utf8');
          expect(content).toBe('// prior config');

          // should report found
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('○ [found]'),
          );
        },
      );
    });

    when(
      'rhachet.use.ts already exists and --config --mode upsert is used',
      () => {
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
          writeFileSync(resolve(testDir, 'rhachet.use.ts'), '// prior config');
        });

        then(
          'it should report [updated] and overwrite prior content',
          async () => {
            await program.parseAsync(['init', '--config', '--mode', 'upsert'], {
              from: 'user',
            });

            // should overwrite with new content
            const configPath = resolve(testDir, 'rhachet.use.ts');
            const content = readFileSync(configPath, 'utf8');
            expect(content).not.toBe('// prior config');
            expect(content).toContain('getRoleRegistryEhmpathy');

            // should report updated
            expect(logSpy).toHaveBeenCalledWith(
              expect.stringContaining('↻ [updated]'),
            );
          },
        );
      },
    );

    when(
      'rhachet.use.ts does not exist and --config --mode upsert is used',
      () => {
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
        });

        then('it should report [created] and create the file', async () => {
          await program.parseAsync(['init', '--config', '--mode', 'upsert'], {
            from: 'user',
          });

          // should create with new content
          const configPath = resolve(testDir, 'rhachet.use.ts');
          expect(existsSync(configPath)).toBe(true);
          const content = readFileSync(configPath, 'utf8');
          expect(content).toContain('getRoleRegistryEhmpathy');

          // should report created
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('+ [created]'),
          );
        });
      },
    );

    when(
      '--config --mode findsert is explicitly used (default behavior)',
      () => {
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
          writeFileSync(resolve(testDir, 'rhachet.use.ts'), '// prior config');
        });

        then('it should preserve prior content like default', async () => {
          await program.parseAsync(['init', '--config', '--mode', 'findsert'], {
            from: 'user',
          });

          // should preserve prior content
          const configPath = resolve(testDir, 'rhachet.use.ts');
          const content = readFileSync(configPath, 'utf8');
          expect(content).toBe('// prior config');

          // should report found
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('○ [found]'),
          );
        });
      },
    );

    when('invoked without flags', () => {
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
      });

      then('it should show usage instructions', async () => {
        await program.parseAsync(['init'], { from: 'user' });

        // should show usage header
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('usage: rhachet init --roles'),
        );
      });
    });

    when('invoked with --prep but without --roles', () => {
      beforeEach(() => {
        writeFileSync(
          resolve(testDir, 'package.json'),
          JSON.stringify({
            name: 'test-project',
            scripts: {},
          }),
        );
      });

      then('it should throw BadRequestError', async () => {
        let thrownError: Error | null = null;
        try {
          await program.parseAsync(['init', '--prep'], { from: 'user' });
        } catch (error) {
          if (error instanceof Error) thrownError = error;
        }

        expect(thrownError).not.toBeNull();
        expect(thrownError?.message).toContain('--prep requires --roles');
      });
    });

    when('invoked with --prep --roles mechanic (no hooks)', () => {
      beforeEach(() => {
        writeFileSync(
          resolve(testDir, 'package.json'),
          JSON.stringify({
            name: 'test-project',
            scripts: {},
            dependencies: {
              'rhachet-roles-ehmpathy': '1.0.0',
            },
          }),
        );
      });

      then('it should upsert prepare:rhachet without --hooks', async () => {
        await program.parseAsync(['init', '--prep', '--roles', 'mechanic'], {
          from: 'user',
        });

        const pkg = JSON.parse(
          readFileSync(resolve(testDir, 'package.json'), 'utf8'),
        );
        expect(pkg.scripts['prepare:rhachet']).toEqual(
          'rhachet init --roles mechanic',
        );
        expect(pkg.scripts['prepare:rhachet']).not.toContain('--hooks');
      });

      then(
        'it should findsert prepare with npm run prepare:rhachet',
        async () => {
          await program.parseAsync(['init', '--prep', '--roles', 'mechanic'], {
            from: 'user',
          });

          const pkg = JSON.parse(
            readFileSync(resolve(testDir, 'package.json'), 'utf8'),
          );
          expect(pkg.scripts.prepare).toEqual('npm run prepare:rhachet');
        },
      );
    });

    when('invoked with --prep --hooks --roles mechanic', () => {
      beforeEach(() => {
        writeFileSync(
          resolve(testDir, 'package.json'),
          JSON.stringify({
            name: 'test-project',
            scripts: {},
            dependencies: {
              'rhachet-roles-ehmpathy': '1.0.0',
            },
          }),
        );
      });

      then('it should upsert prepare:rhachet with --hooks', async () => {
        await program.parseAsync(
          ['init', '--prep', '--hooks', '--roles', 'mechanic'],
          { from: 'user' },
        );

        const pkg = JSON.parse(
          readFileSync(resolve(testDir, 'package.json'), 'utf8'),
        );
        expect(pkg.scripts['prepare:rhachet']).toEqual(
          'rhachet init --hooks --roles mechanic',
        );
      });
    });

    when('invoked with --prep and prepare entry already extant', () => {
      beforeEach(() => {
        writeFileSync(
          resolve(testDir, 'package.json'),
          JSON.stringify({
            name: 'test-project',
            scripts: {
              prepare: 'husky install',
            },
            dependencies: {
              'rhachet-roles-ehmpathy': '1.0.0',
            },
          }),
        );
      });

      then('it should append to prepare entry', async () => {
        await program.parseAsync(['init', '--prep', '--roles', 'mechanic'], {
          from: 'user',
        });

        const pkg = JSON.parse(
          readFileSync(resolve(testDir, 'package.json'), 'utf8'),
        );
        expect(pkg.scripts.prepare).toEqual(
          'husky install && npm run prepare:rhachet',
        );
      });
    });
  });
});
