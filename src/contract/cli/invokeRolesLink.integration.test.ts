import { Command } from 'commander';
import { getError, given, then, when } from 'test-fns';

import { genMockContextConfigOfUsage } from '@src/.test/genMockContextConfigOfUsage';
import { Role } from '@src/domain.objects/Role';
import { RoleRegistry } from '@src/domain.objects/RoleRegistry';

import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
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

      // Create mock skill files (with execute bit, as git would preserve)
      writeFileSync(
        resolve(skillsDir, 'skill1.sh'),
        '#!/bin/bash\n# Skill 1\necho "test skill 1"',
      );
      chmodSync(resolve(skillsDir, 'skill1.sh'), 0o755);
      writeFileSync(
        resolve(skillsDir, 'skill2.sh'),
        '#!/bin/bash\n# Skill 2\necho "test skill 2"',
      );
      chmodSync(resolve(skillsDir, 'skill2.sh'), 0o755);

      // Create mock inits directory
      const initsDir = resolve(testDir, 'test-inits');
      mkdirSync(initsDir, { recursive: true });

      // Create mock init files
      writeFileSync(
        resolve(initsDir, 'init.claude.sh'),
        '#!/bin/bash\n# Init Claude\necho "init claude"',
      );

      // Create .test directory with readme files for uri refs
      const testFixtureDir = resolve(testDir, '.test');
      mkdirSync(testFixtureDir, { recursive: true });
      writeFileSync(
        resolve(testFixtureDir, 'readme.md'),
        '# Test Repository\n\nThis is the test repo readme.\n\n# Mechanic Role\n\nThis is the mechanic role readme.\n\n# Single Test Repository\n\n# Single Dir Role',
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
      readme: { uri: '.test/readme.md' }, // '# Mechanic Role\n\nThis is the mechanic role readme.',
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
      readme: { uri: '.test/readme.md' }, // '# Test Repository\n\nThis is the test repo readme.',
      roles: [mockRole],
    });

    const rolesCommand = new Command('roles');
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    beforeEach(() => {
      logSpy.mockClear();
      // clean up prior .agent directory if present
      const agentDir = resolve(testDir, '.agent');
      if (existsSync(agentDir)) {
        rmSync(agentDir, { recursive: true, force: true });
      }
    });

    // register with mock context that provides the mock registry
    const mockContext = genMockContextConfigOfUsage({
      isExplicit: true,
      registries: [mockRegistry],
    });
    invokeRolesLink({ command: rolesCommand }, mockContext);

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
            existsSync(resolve(testDir, '.agent/repo=test/readme.md')),
          ).toBe(true);
          expect(
            existsSync(
              resolve(testDir, '.agent/repo=test/role=mechanic/readme.md'),
            ),
          ).toBe(true);

          // Check that repo readme was created
          const repoReadmeContent = require('fs').readFileSync(
            resolve(testDir, '.agent/repo=test/readme.md'),
            'utf-8',
          );
          expect(repoReadmeContent).toContain('Test Repository');
          expect(repoReadmeContent).toContain('test repo readme');

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

          // sources within gitroot remain writable (not made readonly)
          // this is intentional: self-referenced repos (file:.) keep original permissions
          const brief1Path = resolve(
            testDir,
            '.agent/repo=test/role=mechanic/briefs/test-briefs/brief1.md',
          );
          const brief1Stats = statSync(brief1Path);
          // eslint-disable-next-line no-bitwise
          const brief1Mode = brief1Stats.mode & 0o777;
          // files within gitroot stay writable (0o644 or 0o664 per umask)
          expect(brief1Mode & 0o200).toBe(0o200); // owner write bit set

          const skill1Path = resolve(
            testDir,
            '.agent/repo=test/role=mechanic/skills/test-skills/skill1.sh',
          );
          const skill1Stats = statSync(skill1Path);
          // eslint-disable-next-line no-bitwise
          const skill1Mode = skill1Stats.mode & 0o777;
          expect(skill1Mode & 0o200).toBe(0o200); // owner write bit set
          expect(skill1Mode & 0o111).toBe(0o111); // execute bits set (rwx r-x r-x)

          // directories within gitroot remain writable
          const briefsDirPath = resolve(testDir, 'test-briefs');
          const briefsDirStats = statSync(briefsDirPath);
          // eslint-disable-next-line no-bitwise
          const briefsDirMode = briefsDirStats.mode & 0o777;
          expect(briefsDirMode & 0o200).toBe(0o200); // owner write bit set

          // Check that .gitignore was created for external repo
          const gitignorePath = resolve(testDir, '.agent/repo=test/.gitignore');
          expect(existsSync(gitignorePath)).toBe(true);
          const gitignoreContent = readFileSync(gitignorePath, 'utf-8');
          expect(gitignoreContent).toContain(
            '.what = tells git to ignore this dir',
          );
          expect(gitignoreContent).toContain('*');

          // Check that .gitignore was NOT created for repo=.this
          const thisGitignorePath = resolve(
            testDir,
            '.agent/repo=.this/.gitignore',
          );
          expect(existsSync(thisGitignorePath)).toBe(false);

          // Check log output
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('📚 link role repo=test/role=mechanic'),
          );
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('2 brief(s)'),
          );
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('2 skill(s)'),
          );
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('1 init(s)'),
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

            // Check log output mentions the link
            expect(logSpy).toHaveBeenCalledWith(
              expect.stringContaining('📚 link role repo=test/role=mechanic'),
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

          expect(error?.message).toContain('role "nonexistent" not found');
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

        // Check that .gitignore still exists and is unchanged (idempotent)
        const gitignorePath = resolve(testDir, '.agent/repo=test/.gitignore');
        expect(existsSync(gitignorePath)).toBe(true);
        const gitignoreContent = readFileSync(gitignorePath, 'utf-8');
        expect(gitignoreContent).toContain(
          '.what = tells git to ignore this dir',
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
        readme: { uri: '.test/readme.md' }, // '# Single Dir Role',
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
        readme: { uri: '.test/readme.md' },
        roles: [singleDirRole],
      });

      const singleRolesCommand = new Command('roles');
      const singleDirContext = genMockContextConfigOfUsage({
        isExplicit: true,
        registries: [singleDirRegistry],
      });
      invokeRolesLink({ command: singleRolesCommand }, singleDirContext);

      then(
        'it should symlink dirs directly as briefs/, skills/, and inits/ directories',
        async () => {
          await singleRolesCommand.parseAsync(
            ['link', '--repo', 'single-test', '--role', 'single-dir'],
            { from: 'user' },
          );

          // check that repo readme was created
          const repoReadmePath = resolve(
            testDir,
            '.agent/repo=single-test/readme.md',
          );
          expect(existsSync(repoReadmePath)).toBe(true);
          const repoReadmeContent = require('fs').readFileSync(
            repoReadmePath,
            'utf-8',
          );
          expect(repoReadmeContent).toContain('Single Test Repository');

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

        expect(error?.message).toContain(
          'role "nonexistent" not found in manifest "test"',
        );
      });
    });

    when('source files within gitroot lack execute bit', () => {
      // create a role with skills that have no execute bit initially
      const noExecSkillsDir = resolve(testDir, 'noexec-skills');

      beforeAll(() => {
        mkdirSync(noExecSkillsDir, { recursive: true });

        // create writable skill file WITHOUT execute bit
        writeFileSync(
          resolve(noExecSkillsDir, 'writable-skill.sh'),
          '#!/bin/bash\necho "writable"',
        );
        chmodSync(resolve(noExecSkillsDir, 'writable-skill.sh'), 0o644); // rw-r--r--

        // create readonly skill file WITHOUT execute bit
        writeFileSync(
          resolve(noExecSkillsDir, 'readonly-skill.sh'),
          '#!/bin/bash\necho "readonly"',
        );
        chmodSync(resolve(noExecSkillsDir, 'readonly-skill.sh'), 0o444); // r--r--r--
      });

      const noExecRole = new Role({
        slug: 'noexec',
        name: 'No Exec Role',
        purpose: 'Test role with non-executable skills',
        readme: { uri: '.test/readme.md' },
        traits: [],
        skills: {
          dirs: [{ uri: 'noexec-skills' }],
          refs: [],
        },
        briefs: { dirs: [] },
      });

      const noExecRegistry = new RoleRegistry({
        slug: 'noexec-test',
        readme: { uri: '.test/readme.md' },
        roles: [noExecRole],
      });

      const noExecCommand = new Command('roles');
      const noExecContext = genMockContextConfigOfUsage({
        isExplicit: true,
        registries: [noExecRegistry],
      });
      invokeRolesLink({ command: noExecCommand }, noExecContext);

      then(
        'files should gain executable bit (write permissions preserved)',
        async () => {
          const writablePath = resolve(noExecSkillsDir, 'writable-skill.sh');
          const readonlyPath = resolve(noExecSkillsDir, 'readonly-skill.sh');

          // verify files do NOT have execute bit before link
          // eslint-disable-next-line no-bitwise
          expect(statSync(writablePath).mode & 0o777).toBe(0o644); // rw-r--r--
          // eslint-disable-next-line no-bitwise
          expect(statSync(readonlyPath).mode & 0o777).toBe(0o444); // r--r--r--

          // link the role
          await noExecCommand.parseAsync(
            ['link', '--repo', 'noexec-test', '--role', 'noexec'],
            { from: 'user' },
          );

          // verify files now HAVE execute bit after link (write permissions preserved)
          // eslint-disable-next-line no-bitwise
          expect(statSync(writablePath).mode & 0o777).toBe(0o755); // rwxr-xr-x
          // eslint-disable-next-line no-bitwise
          expect(statSync(readonlyPath).mode & 0o777).toBe(0o555); // r-xr-xr-x
        },
      );
    });

    when('source directories are outside gitroot (external package)', () => {
      // create a role with sources in /tmp (outside gitroot)
      const tmpSourceDir = resolve('/tmp', `rhachet-test-${Date.now()}`);
      const externalBriefsDir = resolve(tmpSourceDir, 'external-briefs');
      const externalSkillsDir = resolve(tmpSourceDir, 'external-skills');
      const externalReadmePath = resolve(tmpSourceDir, 'readme.md');

      beforeAll(() => {
        // create external source directories
        mkdirSync(externalBriefsDir, { recursive: true });
        mkdirSync(externalSkillsDir, { recursive: true });

        // create readme file
        writeFileSync(externalReadmePath, '# External Test');

        // create source files
        writeFileSync(
          resolve(externalBriefsDir, 'external-brief.md'),
          '# External Brief',
        );
        writeFileSync(
          resolve(externalSkillsDir, 'external-skill.sh'),
          '#!/bin/bash\necho "external"',
        );
      });

      afterAll(() => {
        // cleanup: make writable then remove
        makeDirectoryWritable(tmpSourceDir);
        rmSync(tmpSourceDir, { recursive: true, force: true });
      });

      const externalRole = new Role({
        slug: 'external',
        name: 'External Role',
        purpose: 'Test role with external sources',
        readme: { uri: externalReadmePath },
        traits: [],
        skills: {
          dirs: [{ uri: externalSkillsDir }],
          refs: [],
        },
        briefs: { dirs: [{ uri: externalBriefsDir }] },
      });

      const externalRegistry = new RoleRegistry({
        slug: 'external-test',
        readme: { uri: externalReadmePath },
        roles: [externalRole],
      });

      const externalCommand = new Command('roles');
      const externalContext = genMockContextConfigOfUsage({
        isExplicit: true,
        registries: [externalRegistry],
      });
      invokeRolesLink({ command: externalCommand }, externalContext);

      then('source files should be made readonly (0o555)', async () => {
        await externalCommand.parseAsync(
          ['link', '--repo', 'external-test', '--role', 'external'],
          { from: 'user' },
        );

        // verify external brief file is readonly
        const briefPath = resolve(externalBriefsDir, 'external-brief.md');
        const briefStats = statSync(briefPath);
        // eslint-disable-next-line no-bitwise
        const briefMode = briefStats.mode & 0o777;
        expect(briefMode).toBe(0o555);

        // verify external skill file is readonly
        const skillPath = resolve(externalSkillsDir, 'external-skill.sh');
        const skillStats = statSync(skillPath);
        // eslint-disable-next-line no-bitwise
        const skillMode = skillStats.mode & 0o777;
        expect(skillMode).toBe(0o555);

        // verify external directories are readonly
        const briefsDirStats = statSync(externalBriefsDir);
        // eslint-disable-next-line no-bitwise
        const briefsDirMode = briefsDirStats.mode & 0o777;
        expect(briefsDirMode).toBe(0o555);
      });
    });
  });
});
