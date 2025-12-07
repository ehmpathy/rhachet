import {
  existsSync,
  mkdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { Command } from 'commander';
import { getError, given, then, when } from 'test-fns';

import { Role } from '../../domain/objects/Role';
import { RoleRegistry } from '../../domain/objects/RoleRegistry';
import { invokeRolesBoot } from './invokeRolesBoot';

describe('invokeRolesBoot (integration)', () => {
  given('a CLI program with invokeRolesBoot registered', () => {
    const testDir = resolve(__dirname, './.temp/invokeRolesBoot');
    const originalCwd = process.cwd();

    beforeAll(() => {
      // Create test directory structure
      mkdirSync(testDir, { recursive: true });
      process.chdir(testDir);

      // Initialize a git repo (required by invokeRolesBoot for getGitRepoRoot)
      const { execSync } = require('node:child_process');
      try {
        execSync('git init', { cwd: testDir, stdio: 'ignore' });
        execSync('git config user.email "test@example.com"', {
          cwd: testDir,
          stdio: 'ignore',
        });
        execSync('git config user.name "Test User"', {
          cwd: testDir,
          stdio: 'ignore',
        });
      } catch {
        // Ignore errors if git is not available
      }
    });

    afterAll(() => {
      process.chdir(originalCwd);
    });

    // Create mock registries with roles
    const mockRole = new Role({
      slug: 'mechanic',
      name: 'Mechanic',
      purpose: 'Test mechanic role',
      readme: '# Mechanic Role\n\nThis is the mechanic role readme.',
      traits: [],
      skills: { dirs: [], refs: [] },
      briefs: { dirs: [] },
    });

    const mockRegistry = new RoleRegistry({
      slug: 'test',
      readme: 'Test registry',
      roles: [mockRole],
    });

    const rolesCommand = new Command('roles');
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    beforeEach(() => {
      logSpy.mockClear();
    });

    invokeRolesBoot({ command: rolesCommand, registries: [mockRegistry] });

    when(
      'invoked with "boot --repo test --role mechanic" after creating briefs and skills',
      () => {
        beforeAll(() => {
          // Clean up first to ensure fresh state
          const cleanAgentDir = resolve(testDir, '.agent');
          if (existsSync(cleanAgentDir)) {
            rmSync(cleanAgentDir, { recursive: true, force: true });
          }

          // Setup: Create mock role directory structure
          const roleDir = resolve(testDir, '.agent/repo=test/role=mechanic');
          const briefsDir = resolve(roleDir, 'briefs');
          const skillsDir = resolve(roleDir, 'skills');
          mkdirSync(briefsDir, { recursive: true });
          mkdirSync(skillsDir, { recursive: true });

          // Create mock briefs source directory and files
          const mockBriefsSourceDir = resolve(
            testDir,
            'node_modules/rhachet-roles-test/dist/logic/roles/mechanic/.briefs',
          );
          mkdirSync(mockBriefsSourceDir, { recursive: true });
          writeFileSync(
            resolve(mockBriefsSourceDir, 'brief1.md'),
            '# Brief 1\nThis is test brief 1',
          );
          writeFileSync(
            resolve(mockBriefsSourceDir, 'brief2.md'),
            '# Brief 2\nThis is test brief 2',
          );

          // Create mock skills source directory and files
          const mockSkillsSourceDir = resolve(
            testDir,
            'node_modules/rhachet-roles-test/dist/logic/roles/mechanic/.skills',
          );
          mkdirSync(mockSkillsSourceDir, { recursive: true });
          writeFileSync(
            resolve(mockSkillsSourceDir, 'skill1.sh'),
            '#!/bin/bash\n# Skill 1 - Test skill\n# This skill does something useful\necho "test skill 1"',
          );
          writeFileSync(
            resolve(mockSkillsSourceDir, 'skill2.sh'),
            '#!/bin/bash\n# Skill 2 - Another test skill\necho "test skill 2"',
          );

          // Create symlinks to the directories (following new directory-linking behavior)
          // Path is relative from briefsDir back to testDir, then to node_modules
          symlinkSync(
            '../../../../node_modules/rhachet-roles-test/dist/logic/roles/mechanic/.briefs',
            resolve(briefsDir, '.briefs'),
          );
          // Path is relative from skillsDir back to testDir, then to node_modules
          symlinkSync(
            '../../../../node_modules/rhachet-roles-test/dist/logic/roles/mechanic/.skills',
            resolve(skillsDir, '.skills'),
          );

          // Create a readme file in the role directory
          writeFileSync(
            resolve(roleDir, 'readme.md'),
            '# Mechanic Role\n\nThis is the mechanic role readme.',
          );
        });

        then('it should print all briefs and skills with stats', async () => {
          // Execute boot command
          await rolesCommand.parseAsync(
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
            expect.stringContaining('files = 5'), // 1 readme + 2 briefs + 2 skills
          );
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('briefs = 2'),
          );
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('skills = 2'),
          );
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('other = 1'), // readme.md
          );

          // Check that brief file contents were printed
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining(
              'began:.agent/repo=test/role=mechanic/briefs/.briefs/brief1.md',
            ),
          );
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('This is test brief 1'),
          );
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining(
              'began:.agent/repo=test/role=mechanic/briefs/.briefs/brief2.md',
            ),
          );
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('This is test brief 2'),
          );

          // Check that skill documentation was extracted (not full implementation)
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining(
              'began:.agent/repo=test/role=mechanic/skills/.skills/skill1.sh',
            ),
          );
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('Skill 1 - Test skill'),
          );
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining(
              '[implementation hidden - use skill to execute]',
            ),
          );

          // Check that implementation is NOT printed for skills
          expect(logSpy).not.toHaveBeenCalledWith(
            expect.stringContaining('echo "test skill 1"'),
          );

          // Check that readme was printed
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining(
              'began:.agent/repo=test/role=mechanic/readme.md',
            ),
          );
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('Mechanic Role'),
          );
        });
      },
    );

    when(
      'invoked with "boot --role mechanic" without --repo (single registry has the role)',
      () => {
        beforeAll(() => {
          // Clean up first to ensure fresh state
          const cleanAgentDir = resolve(testDir, '.agent');
          if (existsSync(cleanAgentDir)) {
            rmSync(cleanAgentDir, { recursive: true, force: true });
          }

          // Setup: Create role directory for the inferred repo
          const roleDir = resolve(testDir, '.agent/repo=test/role=mechanic');
          mkdirSync(roleDir, { recursive: true });

          // Create a readme file in the role directory
          writeFileSync(
            resolve(roleDir, 'readme.md'),
            '# Inferred Mechanic Role\n\nThis role was auto-inferred.',
          );
        });

        then(
          'it should auto-infer the repo and boot successfully',
          async () => {
            // Execute boot command WITHOUT --repo
            await rolesCommand.parseAsync(['boot', '--role', 'mechanic'], {
              from: 'user',
            });

            // Check that the role was booted from the inferred repo
            expect(logSpy).toHaveBeenCalledWith(
              expect.stringContaining(
                'began:.agent/repo=test/role=mechanic/readme.md',
              ),
            );
            expect(logSpy).toHaveBeenCalledWith(
              expect.stringContaining('Inferred Mechanic Role'),
            );
          },
        );
      },
    );

    when(
      'invoked with "boot" without --repo and role not in any registry',
      () => {
        then('it should throw an error about role not found', async () => {
          const error = await getError(() =>
            rolesCommand.parseAsync(['boot', '--role', 'nonexistent'], {
              from: 'user',
            }),
          );

          expect(error?.message).toContain('No repo has role "nonexistent"');
        });
      },
    );

    when('invoked with "boot" without --role', () => {
      then('it should throw an error requiring --role', async () => {
        const error = await getError(() =>
          rolesCommand.parseAsync(['boot', '--repo', 'test'], {
            from: 'user',
          }),
        );

        expect(error?.message).toContain('--role is required');
      });
    });

    when(
      'invoked with "boot --repo test --role mechanic" before creating role directory',
      () => {
        beforeAll(() => {
          // Clean up to ensure no role directory exists
          const agentDir = resolve(testDir, '.agent');
          if (existsSync(agentDir)) {
            rmSync(agentDir, { recursive: true, force: true });
          }
        });

        then(
          'it should throw an error about missing role directory',
          async () => {
            const error = await getError(() =>
              rolesCommand.parseAsync(
                ['boot', '--repo', 'test', '--role', 'mechanic'],
                {
                  from: 'user',
                },
              ),
            );

            expect(error?.message).toContain('Role directory not found');
            expect(error?.message).toContain('roles link');
          },
        );
      },
    );

    when(
      'invoked with "boot --repo test --role mechanic" with empty role directory',
      () => {
        beforeAll(() => {
          // Clean up first, then create empty role directory
          const cleanAgentDir = resolve(testDir, '.agent');
          if (existsSync(cleanAgentDir)) {
            rmSync(cleanAgentDir, { recursive: true, force: true });
          }

          // Setup: Create empty role directory
          const roleDir = resolve(testDir, '.agent/repo=test/role=mechanic');
          mkdirSync(roleDir, { recursive: true });
        });

        then('it should warn about no resources found', async () => {
          await rolesCommand.parseAsync(
            ['boot', '--repo', 'test', '--role', 'mechanic'],
            {
              from: 'user',
            },
          );

          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('No resources found'),
          );
        });
      },
    );
  });

  given('multiple registries have the same role', () => {
    const testDir = resolve(__dirname, './.temp/invokeRolesBoot-ambiguous');
    const originalCwd = process.cwd();

    beforeAll(() => {
      mkdirSync(testDir, { recursive: true });
      process.chdir(testDir);
    });

    afterAll(() => {
      process.chdir(originalCwd);
    });

    const mockRole = new Role({
      slug: 'mechanic',
      name: 'Mechanic',
      purpose: 'Test mechanic role',
      readme: '# Mechanic',
      traits: [],
      skills: { dirs: [], refs: [] },
      briefs: { dirs: [] },
    });

    const registry1 = new RoleRegistry({
      slug: 'repo-one',
      readme: 'Repo one',
      roles: [mockRole],
    });

    const registry2 = new RoleRegistry({
      slug: 'repo-two',
      readme: 'Repo two',
      roles: [mockRole],
    });

    const rolesCommand = new Command('roles');

    invokeRolesBoot({
      command: rolesCommand,
      registries: [registry1, registry2],
    });

    when('invoked with "boot --role mechanic" without --repo', () => {
      then('it should throw an error about ambiguous repos', async () => {
        const error = await getError(() =>
          rolesCommand.parseAsync(['boot', '--role', 'mechanic'], {
            from: 'user',
          }),
        );

        expect(error?.message).toContain('Multiple repos have role "mechanic"');
        expect(error?.message).toContain('repo-one');
        expect(error?.message).toContain('repo-two');
        expect(error?.message).toContain('--repo');
      });
    });
  });
});
