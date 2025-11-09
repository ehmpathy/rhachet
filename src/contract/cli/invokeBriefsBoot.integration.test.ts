import { Command } from 'commander';
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  symlinkSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { given, when, then, getError } from 'test-fns';

import { invokeBriefsBoot } from './invokeBriefsBoot';

describe('invokeBriefsBoot (integration)', () => {
  given('a CLI program with invokeBriefsBoot registered', () => {
    const testDir = resolve(__dirname, './.temp/invokeBriefsBoot');
    const originalCwd = process.cwd();

    beforeAll(() => {
      // Create test directory structure
      mkdirSync(testDir, { recursive: true });
      process.chdir(testDir);
    });

    afterAll(() => {
      process.chdir(originalCwd);
    });

    const briefsCommand = new Command('briefs');
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    beforeEach(() => {
      logSpy.mockClear();
    });

    invokeBriefsBoot({ command: briefsCommand });

    when(
      'invoked with "boot --repo test --role mechanic" after creating briefs',
      () => {
        beforeAll(() => {
          // Clean up first to ensure fresh state
          const cleanAgentDir = resolve(testDir, '.agent');
          if (existsSync(cleanAgentDir)) {
            rmSync(cleanAgentDir, { recursive: true, force: true });
          }

          // Setup: Create mock brief files in new structure
          const briefsDir = resolve(
            testDir,
            '.agent/repo=test/role=mechanic/briefs',
          );
          mkdirSync(briefsDir, { recursive: true });

          // Create mock node_modules structure for symlinks
          const mockRoleDir = resolve(
            testDir,
            'node_modules/rhachet-roles-ehmpathy/dist/logic/roles/mechanic/.briefs',
          );
          mkdirSync(mockRoleDir, { recursive: true });
          writeFileSync(
            resolve(mockRoleDir, 'brief1.md'),
            '# Brief 1\nThis is test brief 1',
          );
          writeFileSync(
            resolve(mockRoleDir, 'brief2.md'),
            '# Brief 2\nThis is test brief 2',
          );

          // Create symlinks (need to go up 4 levels from briefs/ to testDir root)
          symlinkSync(
            '../../../../node_modules/rhachet-roles-ehmpathy/dist/logic/roles/mechanic/.briefs/brief1.md',
            resolve(briefsDir, 'brief1.md'),
          );
          symlinkSync(
            '../../../../node_modules/rhachet-roles-ehmpathy/dist/logic/roles/mechanic/.briefs/brief2.md',
            resolve(briefsDir, 'brief2.md'),
          );
        });

        then('it should print all brief files with stats', async () => {
          // Execute boot command
          await briefsCommand.parseAsync(
            ['boot', '--repo', 'test', '--role', 'mechanic'],
            {
              from: 'user',
            },
          );

          // Check that stats were printed
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('began:stats'),
          );
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('files = 2'),
          );

          // Check that file contents were printed
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining(
              'began:.agent/repo=test/role=mechanic/briefs/brief1.md',
            ),
          );
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('This is test brief 1'),
          );
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining(
              'began:.agent/repo=test/role=mechanic/briefs/brief2.md',
            ),
          );
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('This is test brief 2'),
          );

          // Snapshot the full console output
          const allLogOutput = logSpy.mock.calls
            .map((call) => call[0])
            .join('\n');
          expect(allLogOutput).toMatchSnapshot();
        });
      },
    );

    when('invoked with "boot" without --repo', () => {
      then('it should throw an error requiring --repo', async () => {
        const error = await getError(() =>
          briefsCommand.parseAsync(['boot', '--role', 'mechanic'], {
            from: 'user',
          }),
        );

        expect(error?.message).toContain('--repo is required');
      });
    });

    when('invoked with "boot" without --role', () => {
      then('it should throw an error requiring --role', async () => {
        const error = await getError(() =>
          briefsCommand.parseAsync(['boot', '--repo', 'test'], {
            from: 'user',
          }),
        );

        expect(error?.message).toContain('--role is required');
      });
    });

    when(
      'invoked with "boot --repo test --role mechanic" before creating briefs',
      () => {
        beforeAll(() => {
          // Clean up to ensure no briefs directory exists
          const agentDir = resolve(testDir, '.agent');
          if (existsSync(agentDir)) {
            rmSync(agentDir, { recursive: true, force: true });
          }
        });

        then(
          'it should throw an error about missing briefs directory',
          async () => {
            const error = await getError(() =>
              briefsCommand.parseAsync(
                ['boot', '--repo', 'test', '--role', 'mechanic'],
                {
                  from: 'user',
                },
              ),
            );

            expect(error?.message).toContain('Briefs directory not found');
            expect(error?.message).toContain('briefs link');
          },
        );
      },
    );

    when(
      'invoked with "boot --repo test --role mechanic" with empty briefs directory',
      () => {
        beforeAll(() => {
          // Clean up first, then create empty briefs directory
          const cleanAgentDir = resolve(testDir, '.agent');
          if (existsSync(cleanAgentDir)) {
            rmSync(cleanAgentDir, { recursive: true, force: true });
          }

          // Setup: Create empty briefs directory
          const briefsDir = resolve(
            testDir,
            '.agent/repo=test/role=mechanic/briefs',
          );
          mkdirSync(briefsDir, { recursive: true });
        });

        then('it should warn about no briefs found', async () => {
          await briefsCommand.parseAsync(
            ['boot', '--repo', 'test', '--role', 'mechanic'],
            {
              from: 'user',
            },
          );

          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('No briefs found'),
          );
        });
      },
    );

    when(
      'invoked with "boot --repo test --role mechanic" with symlinked directory containing files',
      () => {
        beforeAll(() => {
          // Clean up first to ensure fresh state
          const cleanAgentDir = resolve(testDir, '.agent');
          if (existsSync(cleanAgentDir)) {
            rmSync(cleanAgentDir, { recursive: true, force: true });
          }

          // Setup: Create briefs directory
          const briefsDir = resolve(
            testDir,
            '.agent/repo=test/role=mechanic/briefs',
          );
          mkdirSync(briefsDir, { recursive: true });

          // Create a source directory with files and subdirectories
          const sourceDir = resolve(testDir, 'test-briefs/subdir');
          mkdirSync(sourceDir, { recursive: true });
          writeFileSync(
            resolve(sourceDir, 'nested1.md'),
            '# Nested Brief 1\nThis is nested brief 1',
          );
          writeFileSync(
            resolve(sourceDir, 'nested2.md'),
            '# Nested Brief 2\nThis is nested brief 2',
          );

          // Create a subdirectory within the source directory
          const nestedSubdir = resolve(sourceDir, 'deeper');
          mkdirSync(nestedSubdir, { recursive: true });
          writeFileSync(
            resolve(nestedSubdir, 'deep1.md'),
            '# Deep Brief 1\nThis is deep brief 1',
          );
          writeFileSync(
            resolve(nestedSubdir, 'deep2.md'),
            '# Deep Brief 2\nThis is deep brief 2',
          );

          // Create a symlink to the directory (need to go up 4 levels from briefs/ to testDir root)
          symlinkSync(
            '../../../../test-briefs/subdir',
            resolve(briefsDir, 'linked-dir'),
          );
        });

        then(
          'it should print all files including those in symlinked directories',
          async () => {
            // Execute boot command
            await briefsCommand.parseAsync(
              ['boot', '--repo', 'test', '--role', 'mechanic'],
              {
                from: 'user',
              },
            );

            // Check that stats show 4 files (2 in linked-dir, 2 in linked-dir/deeper)
            expect(logSpy).toHaveBeenCalledWith(
              expect.stringContaining('files = 4'),
            );

            // Check that nested file contents were printed
            expect(logSpy).toHaveBeenCalledWith(
              expect.stringContaining(
                'began:.agent/repo=test/role=mechanic/briefs/linked-dir/nested1.md',
              ),
            );
            expect(logSpy).toHaveBeenCalledWith(
              expect.stringContaining('This is nested brief 1'),
            );
            expect(logSpy).toHaveBeenCalledWith(
              expect.stringContaining(
                'began:.agent/repo=test/role=mechanic/briefs/linked-dir/nested2.md',
              ),
            );
            expect(logSpy).toHaveBeenCalledWith(
              expect.stringContaining('This is nested brief 2'),
            );

            // Check that deeply nested file contents were printed
            expect(logSpy).toHaveBeenCalledWith(
              expect.stringContaining(
                'began:.agent/repo=test/role=mechanic/briefs/linked-dir/deeper/deep1.md',
              ),
            );
            expect(logSpy).toHaveBeenCalledWith(
              expect.stringContaining('This is deep brief 1'),
            );
            expect(logSpy).toHaveBeenCalledWith(
              expect.stringContaining(
                'began:.agent/repo=test/role=mechanic/briefs/linked-dir/deeper/deep2.md',
              ),
            );
            expect(logSpy).toHaveBeenCalledWith(
              expect.stringContaining('This is deep brief 2'),
            );
          },
        );
      },
    );
  });
});
