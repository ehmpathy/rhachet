import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Command } from 'commander';
import { getError, given, then, when } from 'test-fns';

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
      skills: {
        dirs: [],
        refs: [],
      },
      briefs: { dirs: [{ uri: 'test-briefs' }] },
    });

    const mockRegistry = new RoleRegistry({
      slug: 'test',
      readme: 'Test readme',
      roles: [mockRole],
    });

    const briefsCommand = new Command('briefs');
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    beforeEach(() => {
      logSpy.mockClear();
      // Clean up any existing .agent directory
      const agentDir = resolve(testDir, '.agent');
      if (existsSync(agentDir)) {
        rmSync(agentDir, { recursive: true, force: true });
      }
    });

    invokeBriefsLink({ command: briefsCommand, registries: [mockRegistry] });

    when('invoked with "link --repo test --role mechanic"', () => {
      then('it should create symlinks to briefs directory', async () => {
        await briefsCommand.parseAsync(
          ['link', '--repo', 'test', '--role', 'mechanic'],
          {
            from: 'user',
          },
        );

        // Check that .agent/repo=test/role=mechanic/briefs directory was created
        expect(
          existsSync(resolve(testDir, '.agent/repo=test/role=mechanic/briefs')),
        ).toBe(true);

        // Check that the directory symlink was created (pointing to test-briefs)
        expect(
          existsSync(
            resolve(
              testDir,
              '.agent/repo=test/role=mechanic/briefs/test-briefs',
            ),
          ),
        ).toBe(true);

        // Check that files are accessible through the symlinked directory
        expect(
          existsSync(
            resolve(
              testDir,
              '.agent/repo=test/role=mechanic/briefs/test-briefs/brief1.md',
            ),
          ),
        ).toBe(true);
        expect(
          existsSync(
            resolve(
              testDir,
              '.agent/repo=test/role=mechanic/briefs/test-briefs/brief2.md',
            ),
          ),
        ).toBe(true);

        // Check log output
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('Linking briefs for role "mechanic"'),
        );
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('2 brief(s)'),
        );
      });
    });

    when(
      'invoked with "link --role mechanic" without --repo (single registry has the role)',
      () => {
        then('it should auto-infer the repo and create symlinks', async () => {
          await briefsCommand.parseAsync(['link', '--role', 'mechanic'], {
            from: 'user',
          });

          // Check that .agent/repo=test/role=mechanic/briefs directory was created
          expect(
            existsSync(
              resolve(testDir, '.agent/repo=test/role=mechanic/briefs'),
            ),
          ).toBe(true);

          // Check log output mentions the inferred repo
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('Linking briefs for role "mechanic"'),
          );
        });
      },
    );

    when('invoked with "link --role nonexistent"', () => {
      then(
        'it should throw an error about role not found in registries',
        async () => {
          const error = await getError(() =>
            briefsCommand.parseAsync(['link', '--role', 'nonexistent'], {
              from: 'user',
            }),
          );

          expect(error?.message).toContain('no role named "nonexistent"');
        },
      );
    });

    when('invoked with "link" without --role', () => {
      then('it should throw an error requiring --role', async () => {
        const error = await getError(() =>
          briefsCommand.parseAsync(['link', '--repo', 'test'], {
            from: 'user',
          }),
        );

        expect(error?.message).toContain('--role is required');
      });
    });

    when('invoked with "link --repo test --role nonexistent"', () => {
      then('it should throw an error about role not found', async () => {
        const error = await getError(() =>
          briefsCommand.parseAsync(
            ['link', '--repo', 'test', '--role', 'nonexistent'],
            {
              from: 'user',
            },
          ),
        );

        expect(error?.message).toContain('no role named "nonexistent"');
      });
    });
  });
});
