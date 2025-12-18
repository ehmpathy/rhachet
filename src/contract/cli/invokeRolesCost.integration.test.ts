import { Command } from 'commander';
import { getError, given, then, when } from 'test-fns';

import { Role } from '@src/domain.objects/Role';
import { RoleRegistry } from '@src/domain.objects/RoleRegistry';

import {
  existsSync,
  mkdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { invokeRolesCost } from './invokeRolesCost';

describe('invokeRolesCost (integration)', () => {
  given('a CLI program with invokeRolesCost registered', () => {
    const testDir = resolve(__dirname, './.temp/invokeRolesCost');
    const originalCwd = process.cwd();

    beforeAll(() => {
      // create test directory structure
      mkdirSync(testDir, { recursive: true });
      process.chdir(testDir);
    });

    afterAll(() => {
      process.chdir(originalCwd);
    });

    // create mock registries with roles
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

    invokeRolesCost({ command: rolesCommand, registries: [mockRegistry] });

    when(
      'invoked with "cost --repo test --role mechanic" after creating briefs and skills',
      () => {
        beforeAll(() => {
          // clean up first to ensure fresh state
          const cleanAgentDir = resolve(testDir, '.agent');
          if (existsSync(cleanAgentDir)) {
            rmSync(cleanAgentDir, { recursive: true, force: true });
          }

          // setup: create mock role directory structure
          const roleDir = resolve(testDir, '.agent/repo=test/role=mechanic');
          const briefsDir = resolve(roleDir, 'briefs');
          const skillsDir = resolve(roleDir, 'skills');
          mkdirSync(briefsDir, { recursive: true });
          mkdirSync(skillsDir, { recursive: true });

          // create mock briefs source directory and files
          const mockBriefsSourceDir = resolve(
            testDir,
            'node_modules/rhachet-roles-test/dist/domain.operations/roles/mechanic/.briefs',
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

          // create mock skills source directory and files
          const mockSkillsSourceDir = resolve(
            testDir,
            'node_modules/rhachet-roles-test/dist/domain.operations/roles/mechanic/.skills',
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

          // create symlinks to the directories
          symlinkSync(
            '../../../../node_modules/rhachet-roles-test/dist/domain.operations/roles/mechanic/.briefs',
            resolve(briefsDir, '.briefs'),
          );
          symlinkSync(
            '../../../../node_modules/rhachet-roles-test/dist/domain.operations/roles/mechanic/.skills',
            resolve(skillsDir, '.skills'),
          );

          // create a readme file in the role directory
          writeFileSync(
            resolve(roleDir, 'readme.md'),
            '# Mechanic Role\n\nThis is the mechanic role readme.',
          );
        });

        then('it should output tree structure with costs', async () => {
          await rolesCommand.parseAsync(
            ['cost', '--repo', 'test', '--role', 'mechanic'],
            { from: 'user' },
          );

          // check header
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('Role Cost Report: mechanic @ test'),
          );

          // check tree structure has files
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('.agent/repo=test/role=mechanic'),
          );
        });

        then('it should show per-file token/cost annotations', async () => {
          await rolesCommand.parseAsync(
            ['cost', '--repo', 'test', '--role', 'mechanic'],
            { from: 'user' },
          );

          // check that token counts are shown
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('tokens'),
          );

          // check that costs are shown
          expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('$'));
        });

        then('it should show summary with file breakdown', async () => {
          await rolesCommand.parseAsync(
            ['cost', '--repo', 'test', '--role', 'mechanic'],
            { from: 'user' },
          );

          // check summary
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('Summary:'),
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
            expect.stringContaining('other = 1'),
          );
        });

        then('it should annotate skills with [docs only]', async () => {
          await rolesCommand.parseAsync(
            ['cost', '--repo', 'test', '--role', 'mechanic'],
            { from: 'user' },
          );

          // check that skills are marked as docs only
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('[docs only]'),
          );
        });
      },
    );

    when(
      'invoked with "cost --role mechanic" without --repo (single registry has the role)',
      () => {
        beforeAll(() => {
          // clean up first to ensure fresh state
          const cleanAgentDir = resolve(testDir, '.agent');
          if (existsSync(cleanAgentDir)) {
            rmSync(cleanAgentDir, { recursive: true, force: true });
          }

          // setup: create role directory for the inferred repo
          const roleDir = resolve(testDir, '.agent/repo=test/role=mechanic');
          mkdirSync(roleDir, { recursive: true });

          // create a readme file in the role directory
          writeFileSync(
            resolve(roleDir, 'readme.md'),
            '# Inferred Mechanic Role\n\nThis role was auto-inferred.',
          );
        });

        then('it should auto-infer the repo and show costs', async () => {
          await rolesCommand.parseAsync(['cost', '--role', 'mechanic'], {
            from: 'user',
          });

          // check that the role was cost-analyzed from the inferred repo
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('Role Cost Report: mechanic @ test'),
          );
        });
      },
    );

    when('invoked with "cost" without --role', () => {
      then('it should throw an error requiring --role', async () => {
        const error = await getError(() =>
          rolesCommand.parseAsync(['cost', '--repo', 'test'], {
            from: 'user',
          }),
        );

        expect(error?.message).toContain('--role is required');
      });
    });

    when(
      'invoked with "cost --repo test --role mechanic" before creating role directory',
      () => {
        beforeAll(() => {
          // clean up to ensure no role directory exists
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
                ['cost', '--repo', 'test', '--role', 'mechanic'],
                { from: 'user' },
              ),
            );

            expect(error?.message).toContain('Role directory not found');
            expect(error?.message).toContain('roles link');
          },
        );
      },
    );

    when(
      'invoked with "cost --repo test --role mechanic" with empty role directory',
      () => {
        beforeAll(() => {
          // clean up first, then create empty role directory
          const cleanAgentDir = resolve(testDir, '.agent');
          if (existsSync(cleanAgentDir)) {
            rmSync(cleanAgentDir, { recursive: true, force: true });
          }

          // setup: create empty role directory
          const roleDir = resolve(testDir, '.agent/repo=test/role=mechanic');
          mkdirSync(roleDir, { recursive: true });
        });

        then('it should warn about no resources found', async () => {
          await rolesCommand.parseAsync(
            ['cost', '--repo', 'test', '--role', 'mechanic'],
            { from: 'user' },
          );

          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('No resources found'),
          );
        });
      },
    );
  });

  given('multiple registries have the same role', () => {
    const testDir = resolve(__dirname, './.temp/invokeRolesCost-ambiguous');
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

    invokeRolesCost({
      command: rolesCommand,
      registries: [registry1, registry2],
    });

    when('invoked with "cost --role mechanic" without --repo', () => {
      then('it should throw an error about ambiguous repos', async () => {
        const error = await getError(() =>
          rolesCommand.parseAsync(['cost', '--role', 'mechanic'], {
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
