import { Command } from 'commander';
import { getError, given, then, when } from 'test-fns';

import { Role } from '@src/domain.objects/Role';
import { RoleRegistry } from '@src/domain.objects/RoleRegistry';

import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
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
      readme: '# Mechanic Role',
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
      readme: '# Designer Role',
      traits: [],
      skills: { dirs: [], refs: [] },
      briefs: { dirs: [] },
    });

    const mockRegistry = new RoleRegistry({
      slug: 'test',
      readme: 'Test readme',
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

    invokeRolesInit({ command: rolesCommand, registries: [mockRegistry] });

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
          expect.stringContaining('Init role "mechanic"'),
        );
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('initialized successfully'),
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
            expect.stringContaining('Init role "mechanic" from repo "test"'),
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

        expect(error?.message).toContain('no role named "nonexistent"');
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
      readme: '# Mechanic',
      traits: [],
      skills: { dirs: [], refs: [] },
      briefs: { dirs: [] },
      inits: { exec: [{ cmd: 'echo "repo1"' }] },
    });

    const mockRole2 = new Role({
      slug: 'mechanic',
      name: 'Mechanic',
      purpose: 'Mechanic from repo2',
      readme: '# Mechanic',
      traits: [],
      skills: { dirs: [], refs: [] },
      briefs: { dirs: [] },
      inits: { exec: [{ cmd: 'echo "repo2"' }] },
    });

    const registry1 = new RoleRegistry({
      slug: 'repo1',
      readme: 'Repo 1',
      roles: [mockRole1],
    });

    const registry2 = new RoleRegistry({
      slug: 'repo2',
      readme: 'Repo 2',
      roles: [mockRole2],
    });

    const rolesCommand = new Command('roles');
    jest.spyOn(console, 'log').mockImplementation(() => {});

    invokeRolesInit({
      command: rolesCommand,
      registries: [registry1, registry2],
    });

    when('invoked with "init --role mechanic" without --repo', () => {
      then('it should throw an error about ambiguous repos', async () => {
        const error = await getError(() =>
          rolesCommand.parseAsync(['init', '--role', 'mechanic'], {
            from: 'user',
          }),
        );

        expect(error?.message).toContain('multiple roles named "mechanic"');
      });
    });
  });

  given('linked roles with inits directory', () => {
    const testDir = resolve(__dirname, './.temp/invokeRolesInit-command');
    const originalCwd = process.cwd();

    beforeAll(() => {
      rmSync(testDir, { recursive: true, force: true });
      mkdirSync(testDir, { recursive: true });
      process.chdir(testDir);

      // create .agent directory structure with init scripts
      const initsDir = resolve(
        testDir,
        '.agent/repo=ehmpathy/role=mechanic/inits',
      );
      mkdirSync(initsDir, { recursive: true });

      // create a flat init script
      writeFileSync(
        resolve(initsDir, 'init.claude.sh'),
        '#!/usr/bin/env bash\necho "init.claude executed" > init-claude-output.txt',
      );
      chmodSync(resolve(initsDir, 'init.claude.sh'), '755');

      // create a nested init script (key usecase for --command)
      const nestedDir = resolve(initsDir, 'claude.hooks');
      mkdirSync(nestedDir, { recursive: true });
      writeFileSync(
        resolve(nestedDir, 'sessionstart.notify-permissions.sh'),
        '#!/usr/bin/env bash\necho "sessionstart.notify-permissions executed" > nested-init-output.txt',
      );
      chmodSync(
        resolve(nestedDir, 'sessionstart.notify-permissions.sh'),
        '755',
      );
    });

    afterAll(() => {
      process.chdir(originalCwd);
    });

    // empty registries since --command discovers from .agent directory
    const rolesCommand = new Command('roles');
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    beforeEach(() => {
      logSpy.mockClear();
      rmSync(resolve(testDir, 'init-claude-output.txt'), { force: true });
      rmSync(resolve(testDir, 'nested-init-output.txt'), { force: true });
    });

    invokeRolesInit({ command: rolesCommand, registries: [] });

    when('invoked with --command init.claude', () => {
      then('it discovers and executes that specific init', async () => {
        await rolesCommand.parseAsync(['init', '--command', 'init.claude'], {
          from: 'user',
        });

        // check that the init script ran
        expect(existsSync(resolve(testDir, 'init-claude-output.txt'))).toBe(
          true,
        );
        const content = readFileSync(
          resolve(testDir, 'init-claude-output.txt'),
          'utf-8',
        );
        expect(content.trim()).toBe('init.claude executed');

        // check log output
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('init "init.claude"'),
        );
      });
    });

    when(
      'invoked with --command claude.hooks/sessionstart.notify-permissions',
      () => {
        then('it discovers and executes the nested init', async () => {
          await rolesCommand.parseAsync(
            [
              'init',
              '--command',
              'claude.hooks/sessionstart.notify-permissions',
            ],
            { from: 'user' },
          );

          // check that the nested init script ran
          expect(existsSync(resolve(testDir, 'nested-init-output.txt'))).toBe(
            true,
          );
          const content = readFileSync(
            resolve(testDir, 'nested-init-output.txt'),
            'utf-8',
          );
          expect(content.trim()).toBe(
            'sessionstart.notify-permissions executed',
          );

          // check log output includes full path slug
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining(
              'init "claude.hooks/sessionstart.notify-permissions"',
            ),
          );
        });
      },
    );

    when(
      'invoked with --command claude.hooks/sessionstart.notify-permissions --repo ehmpathy --role mechanic',
      () => {
        then('it executes with explicit disambiguation', async () => {
          await rolesCommand.parseAsync(
            [
              'init',
              '--command',
              'claude.hooks/sessionstart.notify-permissions',
              '--repo',
              'ehmpathy',
              '--role',
              'mechanic',
            ],
            { from: 'user' },
          );

          // check that the nested init script ran
          expect(existsSync(resolve(testDir, 'nested-init-output.txt'))).toBe(
            true,
          );

          // check log output mentions repo and role
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('repo=ehmpathy'),
          );
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('role=mechanic'),
          );
        });
      },
    );

    when('invoked with --command nonexistent', () => {
      then('it throws error with available inits', async () => {
        const error = await getError(() =>
          rolesCommand.parseAsync(['init', '--command', 'nonexistent'], {
            from: 'user',
          }),
        );

        expect(error?.message).toContain('no init "nonexistent" found');
        expect(error?.message).toContain('available inits:');
        expect(error?.message).toContain('init.claude');
      });
    });

    when(
      'invoked with --command nonexistent --repo ehmpathy --role mechanic',
      () => {
        then('it throws error mentioning the filters', async () => {
          const error = await getError(() =>
            rolesCommand.parseAsync(
              [
                'init',
                '--command',
                'nonexistent',
                '--repo',
                'ehmpathy',
                '--role',
                'mechanic',
              ],
              { from: 'user' },
            ),
          );

          expect(error?.message).toContain('no init "nonexistent" found');
          expect(error?.message).toContain('--repo ehmpathy');
          expect(error?.message).toContain('--role mechanic');
        });
      },
    );
  });
});
