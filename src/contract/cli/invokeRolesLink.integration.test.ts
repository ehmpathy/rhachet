import { Command } from 'commander';
import { getError, given, then, when } from 'test-fns';

import { Role } from '@src/domain.objects/Role';
import { RoleRegistry } from '@src/domain.objects/RoleRegistry';

import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { invokeRolesLink } from './invokeRolesLink';

/**
 * .what = recursively makes all files and directories writable
 * .why = enables cleanup of readonly directories set by setDirectoryReadonly
 */
const makeDirectoryWritable = (dirPath: string): void => {
  if (!existsSync(dirPath)) return;
  const entries = readdirSync(dirPath);
  for (const entry of entries) {
    const fullPath = resolve(dirPath, entry);
    const lstats = lstatSync(fullPath);
    if (lstats.isSymbolicLink()) continue;
    if (lstats.isDirectory()) {
      // make directory writable first so we can recurse into it
      chmodSync(fullPath, 0o755);
      makeDirectoryWritable(fullPath);
    } else if (lstats.isFile()) {
      chmodSync(fullPath, 0o644);
    }
  }
  // make the root directory writable
  chmodSync(dirPath, 0o755);
};

describe('invokeRolesLink (integration)', () => {
  given('a CLI program with invokeRolesLink registered', () => {
    const testDir = resolve(__dirname, './.temp/invokeRolesLink');
    const originalCwd = process.cwd();

    beforeAll(() => {
      // make files writable first, then clean up (handles readonly files from previous runs)
      makeDirectoryWritable(testDir);
      rmSync(testDir, { recursive: true, force: true });

      // create test directory structure
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

      // Create mock skills directory
      const skillsDir = resolve(testDir, 'test-skills');
      mkdirSync(skillsDir, { recursive: true });

      // Create mock skill files
      writeFileSync(
        resolve(skillsDir, 'skill1.sh'),
        '#!/bin/bash\n# Skill 1\necho "test skill 1"',
      );
      writeFileSync(
        resolve(skillsDir, 'skill2.sh'),
        '#!/bin/bash\n# Skill 2\necho "test skill 2"',
      );

      // Create mock inits directory
      const initsDir = resolve(testDir, 'test-inits');
      mkdirSync(initsDir, { recursive: true });

      // Create mock init files
      writeFileSync(
        resolve(initsDir, 'init.claude.sh'),
        '#!/bin/bash\n# Init Claude\necho "init claude"',
      );
    });

    afterAll(() => {
      process.chdir(originalCwd);
    });

    // Create mock registries with a role that has briefs, skills, and inits configured
    const mockRole = new Role({
      slug: 'mechanic',
      name: 'Mechanic',
      purpose: 'Test mechanic role',
      readme: '# Mechanic Role\n\nThis is the mechanic role readme.',
      traits: [],
      skills: {
        dirs: [{ uri: 'test-skills' }],
        refs: [],
      },
      briefs: { dirs: [{ uri: 'test-briefs' }] },
      inits: { dirs: [{ uri: 'test-inits' }] },
    });

    const mockRegistry = new RoleRegistry({
      slug: 'test',
      readme: 'Test readme',
      roles: [mockRole],
    });

    const rolesCommand = new Command('roles');
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    beforeEach(() => {
      logSpy.mockClear();
      // Clean up any existing .agent directory
      const agentDir = resolve(testDir, '.agent');
      if (existsSync(agentDir)) {
        rmSync(agentDir, { recursive: true, force: true });
      }
    });

    invokeRolesLink({ command: rolesCommand, registries: [mockRegistry] });

    when('invoked with "link --repo test --role mechanic"', () => {
      then(
        'it should create .agent directory structure and link briefs and skills',
        async () => {
          await rolesCommand.parseAsync(
            ['link', '--repo', 'test', '--role', 'mechanic'],
            {
              from: 'user',
            },
          );

          // Check that .agent directory structure was created
          expect(existsSync(resolve(testDir, '.agent/readme.md'))).toBe(true);
          expect(
            existsSync(resolve(testDir, '.agent/repo=.this/readme.md')),
          ).toBe(true);
          expect(
            existsSync(
              resolve(testDir, '.agent/repo=test/role=mechanic/readme.md'),
            ),
          ).toBe(true);

          // Check that role readme was created
          const roleReadmeContent = require('fs').readFileSync(
            resolve(testDir, '.agent/repo=test/role=mechanic/readme.md'),
            'utf-8',
          );
          expect(roleReadmeContent).toContain('Mechanic Role');

          // Check that briefs directory symlink was created
          expect(
            existsSync(
              resolve(
                testDir,
                '.agent/repo=test/role=mechanic/briefs/test-briefs',
              ),
            ),
          ).toBe(true);

          // Check that files are accessible through the symlinked briefs directory
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

          // Check that skills directory symlink was created
          expect(
            existsSync(
              resolve(
                testDir,
                '.agent/repo=test/role=mechanic/skills/test-skills',
              ),
            ),
          ).toBe(true);

          // Check that files are accessible through the symlinked skills directory
          expect(
            existsSync(
              resolve(
                testDir,
                '.agent/repo=test/role=mechanic/skills/test-skills/skill1.sh',
              ),
            ),
          ).toBe(true);
          expect(
            existsSync(
              resolve(
                testDir,
                '.agent/repo=test/role=mechanic/skills/test-skills/skill2.sh',
              ),
            ),
          ).toBe(true);

          // Check that inits directory symlink was created
          expect(
            existsSync(
              resolve(
                testDir,
                '.agent/repo=test/role=mechanic/inits/test-inits',
              ),
            ),
          ).toBe(true);

          // Check that files are accessible through the symlinked inits directory
          expect(
            existsSync(
              resolve(
                testDir,
                '.agent/repo=test/role=mechanic/inits/test-inits/init.claude.sh',
              ),
            ),
          ).toBe(true);

          // Check that linked files are set to readonly (0o444)
          const brief1Path = resolve(
            testDir,
            '.agent/repo=test/role=mechanic/briefs/test-briefs/brief1.md',
          );
          const brief1Stats = statSync(brief1Path);
          // eslint-disable-next-line no-bitwise
          const brief1Mode = brief1Stats.mode & 0o777;
          expect(brief1Mode).toBe(0o555);

          const skill1Path = resolve(
            testDir,
            '.agent/repo=test/role=mechanic/skills/test-skills/skill1.sh',
          );
          const skill1Stats = statSync(skill1Path);
          // eslint-disable-next-line no-bitwise
          const skill1Mode = skill1Stats.mode & 0o777;
          expect(skill1Mode).toBe(0o555);

          // Check that linked directories are set to readonly (0o555)
          const briefsDirPath = resolve(testDir, 'test-briefs');
          const briefsDirStats = statSync(briefsDirPath);
          // eslint-disable-next-line no-bitwise
          const briefsDirMode = briefsDirStats.mode & 0o777;
          expect(briefsDirMode).toBe(0o555);

          // Check log output
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('Linked role "mechanic"'),
          );
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('2 brief(s) linked'),
          );
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('2 skill(s) linked'),
          );
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('1 init(s) linked'),
          );
        },
      );
    });

    when(
      'invoked with "link --role mechanic" without --repo (single registry has the role)',
      () => {
        then(
          'it should auto-infer the repo and create .agent structure',
          async () => {
            await rolesCommand.parseAsync(['link', '--role', 'mechanic'], {
              from: 'user',
            });

            // Check that .agent directory structure was created with inferred repo
            expect(
              existsSync(
                resolve(testDir, '.agent/repo=test/role=mechanic/readme.md'),
              ),
            ).toBe(true);

            // Check log output mentions the inferred repo
            expect(logSpy).toHaveBeenCalledWith(
              expect.stringContaining(
                'Linking role "mechanic" from repo "test"',
              ),
            );
          },
        );
      },
    );

    when('invoked with "link --role nonexistent"', () => {
      then(
        'it should throw an error about role not found in registries',
        async () => {
          const error = await getError(() =>
            rolesCommand.parseAsync(['link', '--role', 'nonexistent'], {
              from: 'user',
            }),
          );

          expect(error?.message).toContain('no role named "nonexistent"');
        },
      );
    });

    when('re-linking after role config removes a directory', () => {
      then('it should remove the deprecated symlink from .agent', async () => {
        // First, link with the original config
        await rolesCommand.parseAsync(
          ['link', '--repo', 'test', '--role', 'mechanic'],
          { from: 'user' },
        );

        // Manually create an "old" symlink that simulates a previously linked directory
        const deprecatedSymlinkPath = resolve(
          testDir,
          '.agent/repo=test/role=mechanic/briefs/deprecated-briefs',
        );
        mkdirSync(deprecatedSymlinkPath, { recursive: true });

        // Verify it exists
        expect(existsSync(deprecatedSymlinkPath)).toBe(true);

        // Re-link (which should remove the deprecated symlink)
        await rolesCommand.parseAsync(
          ['link', '--repo', 'test', '--role', 'mechanic'],
          { from: 'user' },
        );

        // Verify the deprecated symlink was removed
        expect(existsSync(deprecatedSymlinkPath)).toBe(false);

        // Verify the valid symlink still exists
        expect(
          existsSync(
            resolve(
              testDir,
              '.agent/repo=test/role=mechanic/briefs/test-briefs',
            ),
          ),
        ).toBe(true);

        // Check log output mentions removal
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('deprecated-briefs (removed'),
        );
      });
    });

    when('invoked with "link" without --role', () => {
      then('it should throw an error requiring --role', async () => {
        const error = await getError(() =>
          rolesCommand.parseAsync(['link', '--repo', 'test'], {
            from: 'user',
          }),
        );

        expect(error?.message).toContain('--role is required');
      });
    });

    when('role uses single-dir mode for briefs, skills, and inits', () => {
      // create a role with single-dir mode (non-array dirs)
      const singleDirRole = new Role({
        slug: 'single-dir',
        name: 'Single Dir Role',
        purpose: 'Test role with single dir mode',
        readme: '# Single Dir Role',
        traits: [],
        skills: {
          dirs: { uri: 'test-skills' },
          refs: [],
        },
        briefs: { dirs: { uri: 'test-briefs' } },
        inits: { dirs: { uri: 'test-inits' } },
      });

      const singleDirRegistry = new RoleRegistry({
        slug: 'single-test',
        readme: 'Single test readme',
        roles: [singleDirRole],
      });

      const singleRolesCommand = new Command('roles');
      invokeRolesLink({
        command: singleRolesCommand,
        registries: [singleDirRegistry],
      });

      then(
        'it should symlink dirs directly as briefs/, skills/, and inits/ directories',
        async () => {
          await singleRolesCommand.parseAsync(
            ['link', '--repo', 'single-test', '--role', 'single-dir'],
            { from: 'user' },
          );

          // check that briefs is a direct symlink to test-briefs (not a dir containing test-briefs)
          const briefsPath = resolve(
            testDir,
            '.agent/repo=single-test/role=single-dir/briefs',
          );
          expect(existsSync(briefsPath)).toBe(true);
          expect(lstatSync(briefsPath).isSymbolicLink()).toBe(true);

          // check files are directly accessible under briefs/
          expect(
            existsSync(
              resolve(
                testDir,
                '.agent/repo=single-test/role=single-dir/briefs/brief1.md',
              ),
            ),
          ).toBe(true);
          expect(
            existsSync(
              resolve(
                testDir,
                '.agent/repo=single-test/role=single-dir/briefs/brief2.md',
              ),
            ),
          ).toBe(true);

          // check that skills is a direct symlink to test-skills
          const skillsPath = resolve(
            testDir,
            '.agent/repo=single-test/role=single-dir/skills',
          );
          expect(existsSync(skillsPath)).toBe(true);
          expect(lstatSync(skillsPath).isSymbolicLink()).toBe(true);

          // check files are directly accessible under skills/
          expect(
            existsSync(
              resolve(
                testDir,
                '.agent/repo=single-test/role=single-dir/skills/skill1.sh',
              ),
            ),
          ).toBe(true);
          expect(
            existsSync(
              resolve(
                testDir,
                '.agent/repo=single-test/role=single-dir/skills/skill2.sh',
              ),
            ),
          ).toBe(true);

          // check that inits is a direct symlink to test-inits
          const initsPath = resolve(
            testDir,
            '.agent/repo=single-test/role=single-dir/inits',
          );
          expect(existsSync(initsPath)).toBe(true);
          expect(lstatSync(initsPath).isSymbolicLink()).toBe(true);

          // check files are directly accessible under inits/
          expect(
            existsSync(
              resolve(
                testDir,
                '.agent/repo=single-test/role=single-dir/inits/init.claude.sh',
              ),
            ),
          ).toBe(true);
        },
      );
    });

    when('invoked with "link --repo test --role nonexistent"', () => {
      then('it should throw an error about role not found', async () => {
        const error = await getError(() =>
          rolesCommand.parseAsync(
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
