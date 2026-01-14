import { Command } from 'commander';
import { getError, given, then, when } from 'test-fns';

import { genMockContextConfigOfUsage } from '@src/.test/genMockContextConfigOfUsage';
import { Role } from '@src/domain.objects/Role';
import { RoleRegistry } from '@src/domain.objects/RoleRegistry';

import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { invokeRolesInit } from './invokeRolesInit';

describe('invokeRolesInit (integration)', () => {
  given('a CLI program with invokeRolesInit registered', () => {
    const testDir = resolve(__dirname, './.temp/invokeRolesInit');
    const originalCwd = process.cwd();

    beforeAll(() => {
      rmSync(testDir, { recursive: true, force: true });
      mkdirSync(testDir, { recursive: true });
      process.chdir(testDir);
    });

    afterAll(() => {
      process.chdir(originalCwd);
    });

    // create mock role with init commands that write to a file
    const mockRoleWithInits = new Role({
      slug: 'mechanic',
      name: 'Mechanic',
      purpose: 'Test mechanic role',
      readme: { uri: '.test/readme.md' }, // '# Mechanic Role',
      traits: [],
      skills: { dirs: [], refs: [] },
      briefs: { dirs: [] },
      inits: {
        exec: [
          { cmd: 'echo "init1" > init-output-1.txt' },
          { cmd: 'echo "init2" > init-output-2.txt' },
        ],
      },
    });

    // create mock role without init commands
    const mockRoleWithoutInits = new Role({
      slug: 'designer',
      name: 'Designer',
      purpose: 'Test designer role',
      readme: { uri: '.test/readme.md' }, // '# Designer Role',
      traits: [],
      skills: { dirs: [], refs: [] },
      briefs: { dirs: [] },
    });

    const mockRegistry = new RoleRegistry({
      slug: 'test',
      readme: { uri: '.test/readme.md' },
      roles: [mockRoleWithInits, mockRoleWithoutInits],
    });

    const rolesCommand = new Command('roles');
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    beforeEach(() => {
      logSpy.mockClear();

      // clean up any output files from previous runs
      rmSync(resolve(testDir, 'init-output-1.txt'), { force: true });
      rmSync(resolve(testDir, 'init-output-2.txt'), { force: true });
    });

    // register with mock context that provides the mock registry
    const mockContext = genMockContextConfigOfUsage({
      isExplicit: true,
      registries: [mockRegistry],
    });
    invokeRolesInit({ command: rolesCommand }, mockContext);

    when('invoked with "init --repo test --role mechanic"', () => {
      then('it should execute all init commands sequentially', async () => {
        await rolesCommand.parseAsync(
          ['init', '--repo', 'test', '--role', 'mechanic'],
          { from: 'user' },
        );

        // check that init commands executed and created files
        expect(existsSync(resolve(testDir, 'init-output-1.txt'))).toBe(true);
        expect(existsSync(resolve(testDir, 'init-output-2.txt'))).toBe(true);

        // check file contents
        const content1 = readFileSync(
          resolve(testDir, 'init-output-1.txt'),
          'utf-8',
        );
        expect(content1.trim()).toBe('init1');

        const content2 = readFileSync(
          resolve(testDir, 'init-output-2.txt'),
          'utf-8',
        );
        expect(content2.trim()).toBe('init2');

        // check log output
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('init role repo=test/role=mechanic'),
        );
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('init complete'),
        );
      });
    });

    when(
      'invoked with "init --role mechanic" without --repo (single registry has the role)',
      () => {
        then('it should auto-infer the repo and execute commands', async () => {
          await rolesCommand.parseAsync(['init', '--role', 'mechanic'], {
            from: 'user',
          });

          // check that init commands executed
          expect(existsSync(resolve(testDir, 'init-output-1.txt'))).toBe(true);
          expect(existsSync(resolve(testDir, 'init-output-2.txt'))).toBe(true);

          // check log output mentions the inferred repo
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('init role repo=test/role=mechanic'),
          );
        });
      },
    );

    when(
      'invoked with "init --role designer" (role has no init commands)',
      () => {
        then('it should warn and exit without error', async () => {
          await rolesCommand.parseAsync(
            ['init', '--repo', 'test', '--role', 'designer'],
            { from: 'user' },
          );

          // check that no files were created
          expect(existsSync(resolve(testDir, 'init-output-1.txt'))).toBe(false);
          expect(existsSync(resolve(testDir, 'init-output-2.txt'))).toBe(false);

          // check log output shows warning
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('has no initialization commands'),
          );
        });
      },
    );

    when('invoked with "init" without --role', () => {
      then('it should throw an error requiring --role', async () => {
        const error = await getError(() =>
          rolesCommand.parseAsync(['init', '--repo', 'test'], {
            from: 'user',
          }),
        );

        expect(error?.message).toContain('--role is required');
      });
    });

    when('invoked with "init --role nonexistent"', () => {
      then('it should throw an error about role not found', async () => {
        const error = await getError(() =>
          rolesCommand.parseAsync(['init', '--role', 'nonexistent'], {
            from: 'user',
          }),
        );

        expect(error?.message).toContain('role "nonexistent" not found');
      });
    });
  });

  given('multiple registries have the same role', () => {
    const testDir = resolve(__dirname, './.temp/invokeRolesInit-multi');
    const originalCwd = process.cwd();

    beforeAll(() => {
      rmSync(testDir, { recursive: true, force: true });
      mkdirSync(testDir, { recursive: true });
      process.chdir(testDir);
    });

    afterAll(() => {
      process.chdir(originalCwd);
    });

    const mockRole1 = new Role({
      slug: 'mechanic',
      name: 'Mechanic',
      purpose: 'Mechanic from repo1',
      readme: { uri: '.test/readme.md' }, // '# Mechanic',
      traits: [],
      skills: { dirs: [], refs: [] },
      briefs: { dirs: [] },
      inits: { exec: [{ cmd: 'echo "repo1"' }] },
    });

    const mockRole2 = new Role({
      slug: 'mechanic',
      name: 'Mechanic',
      purpose: 'Mechanic from repo2',
      readme: { uri: '.test/readme.md' }, // '# Mechanic',
      traits: [],
      skills: { dirs: [], refs: [] },
      briefs: { dirs: [] },
      inits: { exec: [{ cmd: 'echo "repo2"' }] },
    });

    const registry1 = new RoleRegistry({
      slug: 'repo1',
      readme: { uri: '.test/readme.md' },
      roles: [mockRole1],
    });

    const registry2 = new RoleRegistry({
      slug: 'repo2',
      readme: { uri: '.test/readme.md' },
      roles: [mockRole2],
    });

    const rolesCommand = new Command('roles');
    jest.spyOn(console, 'log').mockImplementation(() => {});

    // register with mock context that provides both registries
    const multiContext = genMockContextConfigOfUsage({
      isExplicit: true,
      registries: [registry1, registry2],
    });
    invokeRolesInit({ command: rolesCommand }, multiContext);

    when('invoked with "init --role mechanic" without --repo', () => {
      then('it should throw an error about ambiguous repos', async () => {
        const error = await getError(() =>
          rolesCommand.parseAsync(['init', '--role', 'mechanic'], {
            from: 'user',
          }),
        );

        expect(error?.message).toContain('role "mechanic" is ambiguous');
      });
    });
  });
});
