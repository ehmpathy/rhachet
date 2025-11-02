import { Command } from 'commander';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { given, when, then, getError } from 'test-fns';

import { Role } from '../../domain/objects/Role';
import { RoleRegistry } from '../../domain/objects/RoleRegistry';
import { invokeBriefsLink } from './invokeBriefsLink';

describe('invokeBriefsLink (integration)', () => {
  given('a CLI program with invokeBriefsLink registered', () => {
    const testDir = resolve(__dirname, './.temp/invokeBriefsLink');
    const originalCwd = process.cwd();

    beforeAll(() => {
      // Create test directory structure
      mkdirSync(testDir, { recursive: true });
      process.chdir(testDir);

      // Create mock briefs directory
      const briefsDir = resolve(testDir, 'test-briefs');
      mkdirSync(briefsDir, { recursive: true });

      // Create mock brief files
      writeFileSync(
        resolve(briefsDir, 'brief1.md'),
        '# Brief 1\nThis is test brief 1',
      );
      writeFileSync(
        resolve(briefsDir, 'brief2.md'),
        '# Brief 2\nThis is test brief 2',
      );
    });

    afterAll(() => {
      process.chdir(originalCwd);
    });

    // Create mock registries with a role that has briefs configured
    const mockRole = new Role({
      slug: 'mechanic',
      name: 'Mechanic',
      purpose: 'Test mechanic role',
      readme: 'Test readme',
      traits: [],
      skills: [],
      briefs: { dir: 'test-briefs' },
    });

    const mockRegistry = new RoleRegistry({
      slug: 'test-registry',
      readme: 'Test readme',
      roles: [mockRole],
    });

    const briefsCommand = new Command('briefs');
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    beforeEach(() => {
      logSpy.mockClear();
      // Clean up any existing .briefs directory
      const briefsDir = resolve(testDir, '.briefs');
      if (existsSync(briefsDir)) {
        rmSync(briefsDir, { recursive: true, force: true });
      }
    });

    invokeBriefsLink({ command: briefsCommand, registries: [mockRegistry] });

    when('invoked with "link --role mechanic"', () => {
      then('it should create symlinks to briefs', async () => {
        await briefsCommand.parseAsync(['link', '--role', 'mechanic'], {
          from: 'user',
        });

        // Check that .briefs/mechanic directory was created
        expect(existsSync(resolve(testDir, '.briefs/mechanic'))).toBe(true);

        // Check that symlinks were created
        expect(existsSync(resolve(testDir, '.briefs/mechanic/brief1.md'))).toBe(
          true,
        );
        expect(existsSync(resolve(testDir, '.briefs/mechanic/brief2.md'))).toBe(
          true,
        );

        // Check log output
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('Linking briefs for role "mechanic"'),
        );
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('Linked 2 brief(s)'),
        );
      });
    });

    when('invoked with "link" without --role', () => {
      then('it should throw an error requiring --role', async () => {
        const error = await getError(() =>
          briefsCommand.parseAsync(['link'], { from: 'user' }),
        );

        expect(error?.message).toContain('--role is required');
      });
    });

    when('invoked with "link --role nonexistent"', () => {
      then('it should throw an error about role not found', async () => {
        const error = await getError(() =>
          briefsCommand.parseAsync(['link', '--role', 'nonexistent'], {
            from: 'user',
          }),
        );

        expect(error?.message).toContain('no role named "nonexistent"');
      });
    });
  });
});
