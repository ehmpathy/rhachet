import { Command } from 'commander';
import { getError, given, then, when } from 'test-fns';

import {
  existsSync,
  mkdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { invokeRolesBoot } from './invokeRolesBoot';

/**
 * .what = the one exact block the boot body rendered for a tag at a path
 * .why = pins the tag's close, its body, AND its closing tag in a single claim
 *
 * .note = a containment of the open tag alone leaves the block's END unpinned, so
 *         trailing content on the tag line, a drifted body, or a dropped closing tag
 *         each slip past it. this reads back the block the render actually emitted, so
 *         the caller asserts `toEqual` against the whole of it.
 *
 * .note = yields null when the tag is absent, or present in more than one logged call —
 *         either is a render defect the exact `toEqual` then reports.
 */
const asRenderedBootBlock = (input: {
  logSpy: { mock: { calls: unknown[][] } };
  tag: 'readme' | 'brief.say' | 'skill.say';
  path: string;
}): string | null => {
  const tagOpen = `<${input.tag} path="${input.path}">\n`;
  const tagClose = `</${input.tag}>\n`;
  const saidsWithTag = input.logSpy.mock.calls
    .map((call) => String(call[0]))
    .filter((said) => said.includes(tagOpen));
  if (saidsWithTag.length !== 1) return null;
  const said = saidsWithTag[0] as string;
  const indexFrom = said.indexOf(tagOpen);
  const indexTo = said.indexOf(tagClose, indexFrom);
  if (indexTo === -1) return null;
  return said.slice(indexFrom, indexTo + tagClose.length);
};

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

    const rolesCommand = new Command('roles');
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    beforeEach(() => {
      logSpy.mockClear();
    });

    invokeRolesBoot({ command: rolesCommand });

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

          // Create mock skills source directory and files
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

          // Create symlinks to the directories (following new directory-linking behavior)
          // Path is relative from briefsDir back to testDir, then to node_modules
          symlinkSync(
            '../../../../node_modules/rhachet-roles-test/dist/domain.operations/roles/mechanic/.briefs',
            resolve(briefsDir, '.briefs'),
          );
          // Path is relative from skillsDir back to testDir, then to node_modules
          symlinkSync(
            '../../../../node_modules/rhachet-roles-test/dist/domain.operations/roles/mechanic/.skills',
            resolve(skillsDir, '.skills'),
          );

          // Create mock inits source directory and files (to verify they are NOT booted)
          const mockInitsSourceDir = resolve(
            testDir,
            'node_modules/rhachet-roles-test/dist/domain.operations/roles/mechanic/.inits',
          );
          mkdirSync(mockInitsSourceDir, { recursive: true });
          writeFileSync(
            resolve(mockInitsSourceDir, 'init.claude.sh'),
            '#!/bin/bash\n# Init Claude\necho "init claude"',
          );

          // Create inits directory and symlink
          const initsDir = resolve(roleDir, 'inits');
          mkdirSync(initsDir, { recursive: true });
          symlinkSync(
            '../../../../node_modules/rhachet-roles-test/dist/domain.operations/roles/mechanic/.inits',
            resolve(initsDir, '.inits'),
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
          expect(logSpy).toHaveBeenCalledWith('<stats>');
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('files = 5'), // 1 readme + 2 briefs + 2 skills
          );
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('briefs = 2'),
          );
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('skills = 2'),
          );

          // the readme block is pinned whole: tag, body, and closing tag
          expect(
            asRenderedBootBlock({
              logSpy,
              tag: 'readme',
              path: '.agent/repo=test/role=mechanic/readme.md',
            }),
          ).toEqual(
            [
              '<readme path=".agent/repo=test/role=mechanic/readme.md">',
              '# Mechanic Role',
              '',
              'This is the mechanic role readme.',
              '</readme>',
              '',
            ].join('\n'),
          );

          // each brief block is pinned whole, so a drifted body cannot slip past
          expect(
            asRenderedBootBlock({
              logSpy,
              tag: 'brief.say',
              path: '.agent/repo=test/role=mechanic/briefs/.briefs/brief1.md',
            }),
          ).toEqual(
            [
              '<brief.say path=".agent/repo=test/role=mechanic/briefs/.briefs/brief1.md">',
              '# Brief 1',
              'This is test brief 1',
              '</brief.say>',
              '',
            ].join('\n'),
          );
          expect(
            asRenderedBootBlock({
              logSpy,
              tag: 'brief.say',
              path: '.agent/repo=test/role=mechanic/briefs/.briefs/brief2.md',
            }),
          ).toEqual(
            [
              '<brief.say path=".agent/repo=test/role=mechanic/briefs/.briefs/brief2.md">',
              '# Brief 2',
              'This is test brief 2',
              '</brief.say>',
              '',
            ].join('\n'),
          );

          // the skill block is pinned whole — so the extract's exact shape is asserted,
          // docs kept and implementation dropped, rather than merely sampled
          expect(
            asRenderedBootBlock({
              logSpy,
              tag: 'skill.say',
              path: '.agent/repo=test/role=mechanic/skills/.skills/skill1.sh',
            }),
          ).toEqual(
            [
              '<skill.say path=".agent/repo=test/role=mechanic/skills/.skills/skill1.sh">',
              '#!/bin/bash',
              '# Skill 1 - Test skill',
              '# This skill does something useful',
              '',
              '# [implementation hidden - use skill to execute]',
              '</skill.say>',
              '',
            ].join('\n'),
          );

          // Check that implementation is NOT printed for skills
          expect(logSpy).not.toHaveBeenCalledWith(
            expect.stringContaining('echo "test skill 1"'),
          );
        });

        then('it should NOT include inits in the boot output', async () => {
          // Execute boot command
          await rolesCommand.parseAsync(
            ['boot', '--repo', 'test', '--role', 'mechanic'],
            {
              from: 'user',
            },
          );

          // Check that inits are NOT printed (inits are one-time setup, not booted)
          expect(logSpy).not.toHaveBeenCalledWith(
            expect.stringContaining('init.claude.sh'),
          );
          expect(logSpy).not.toHaveBeenCalledWith(
            expect.stringContaining('Init Claude'),
          );
          expect(logSpy).not.toHaveBeenCalledWith(
            expect.stringContaining('<init'),
          );

          // Verify that stats do NOT count inits
          expect(logSpy).not.toHaveBeenCalledWith(
            expect.stringContaining('inits ='),
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

            // the role was booted from the inferred repo — block pinned whole
            expect(
              asRenderedBootBlock({
                logSpy,
                tag: 'readme',
                path: '.agent/repo=test/role=mechanic/readme.md',
              }),
            ).toEqual(
              [
                '<readme path=".agent/repo=test/role=mechanic/readme.md">',
                '# Inferred Mechanic Role',
                '',
                'This role was auto-inferred.',
                '</readme>',
                '',
              ].join('\n'),
            );
          },
        );
      },
    );

    when('invoked with "boot --role nonexistent" (role not found)', () => {
      then('it should throw an error about role not found', async () => {
        const error = await getError(() =>
          rolesCommand.parseAsync(['boot', '--role', 'nonexistent'], {
            from: 'user',
          }),
        );

        expect(error?.message).toMatch(
          /no role.*nonexistent|\.agent\/ directory not found/,
        );
        expect(error?.message).toContain('roles link');
      });
    });

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
      'invoked with "boot --repo test --role mechanic" when role dir absent',
      () => {
        beforeAll(() => {
          // clean up to ensure no role directory exists
          const agentDir = resolve(testDir, '.agent');
          if (existsSync(agentDir)) {
            rmSync(agentDir, { recursive: true, force: true });
          }
        });

        then(
          'it should throw an error about absent role directory',
          async () => {
            const error = await getError(() =>
              rolesCommand.parseAsync(
                ['boot', '--repo', 'test', '--role', 'mechanic'],
                {
                  from: 'user',
                },
              ),
            );

            // error message depends on whether .agent/ exists
            expect(error?.message).toMatch(
              /\.agent\/ directory not found|no role/,
            );
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

  given('multiple repos have the same role slug in .agent/', () => {
    const testDir = resolve(__dirname, './.temp/invokeRolesBoot-ambiguous');
    const originalCwd = process.cwd();

    beforeAll(() => {
      mkdirSync(testDir, { recursive: true });
      process.chdir(testDir);

      // clean up first
      const agentDir = resolve(testDir, '.agent');
      if (existsSync(agentDir)) {
        rmSync(agentDir, { recursive: true, force: true });
      }

      // create same role in two repos
      mkdirSync(resolve(testDir, '.agent/repo=repo-one/role=mechanic'), {
        recursive: true,
      });
      mkdirSync(resolve(testDir, '.agent/repo=repo-two/role=mechanic'), {
        recursive: true,
      });
    });

    afterAll(() => {
      process.chdir(originalCwd);
    });

    const rolesCommand = new Command('roles');
    invokeRolesBoot({ command: rolesCommand });

    when('invoked with "boot --role mechanic" without --repo', () => {
      then('it should throw an error about ambiguous repos', async () => {
        const error = await getError(() =>
          rolesCommand.parseAsync(['boot', '--role', 'mechanic'], {
            from: 'user',
          }),
        );

        expect(error?.message).toContain('multiple repos');
        expect(error?.message).toContain('mechanic');
        expect(error?.message).toContain('repo-one');
        expect(error?.message).toContain('repo-two');
        expect(error?.message).toContain('--repo');
      });
    });
  });

  given('--repo this is provided', () => {
    const testDir = resolve(__dirname, './.temp/invokeRolesBoot-this');
    const originalCwd = process.cwd();

    beforeAll(() => {
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

    const rolesCommand = new Command('roles');
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    beforeEach(() => {
      logSpy.mockClear();
    });

    invokeRolesBoot({ command: rolesCommand });

    when(
      'invoked with "boot --repo this --role any" with briefs and skills present',
      () => {
        beforeAll(() => {
          // Clean up first to ensure fresh state
          const cleanAgentDir = resolve(testDir, '.agent');
          if (existsSync(cleanAgentDir)) {
            rmSync(cleanAgentDir, { recursive: true, force: true });
          }

          // Setup: Create .agent/repo=.this/role=any directory structure
          const roleDir = resolve(testDir, '.agent/repo=.this/role=any');
          const briefsDir = resolve(roleDir, 'briefs');
          const skillsDir = resolve(roleDir, 'skills');
          mkdirSync(briefsDir, { recursive: true });
          mkdirSync(skillsDir, { recursive: true });

          // Create brief files directly (not symlinked)
          writeFileSync(
            resolve(briefsDir, 'local-brief.md'),
            '# Local Brief\nThis is a local brief for the any role',
          );

          // Create skill files directly
          writeFileSync(
            resolve(skillsDir, 'local-skill.sh'),
            '#!/bin/bash\n# Local Skill - Does something specific to this repo\necho "local skill"',
          );
        });

        then(
          'it should print all briefs and skills from .agent/repo=.this/role=any',
          async () => {
            await rolesCommand.parseAsync(
              ['boot', '--repo', 'this', '--role', 'any'],
              {
                from: 'user',
              },
            );

            // Check that stats were printed
            expect(logSpy).toHaveBeenCalledWith('<stats>');
            expect(logSpy).toHaveBeenCalledWith(
              expect.stringContaining('files = 2'),
            );
            expect(logSpy).toHaveBeenCalledWith(
              expect.stringContaining('briefs = 1'),
            );
            expect(logSpy).toHaveBeenCalledWith(
              expect.stringContaining('skills = 1'),
            );

            // the brief block is pinned whole, path and body together
            expect(
              asRenderedBootBlock({
                logSpy,
                tag: 'brief.say',
                path: '.agent/repo=.this/role=any/briefs/local-brief.md',
              }),
            ).toEqual(
              [
                '<brief.say path=".agent/repo=.this/role=any/briefs/local-brief.md">',
                '# Local Brief',
                'This is a local brief for the any role',
                '</brief.say>',
                '',
              ].join('\n'),
            );

            // the skill block is pinned whole — the extract, exactly
            expect(
              asRenderedBootBlock({
                logSpy,
                tag: 'skill.say',
                path: '.agent/repo=.this/role=any/skills/local-skill.sh',
              }),
            ).toEqual(
              [
                '<skill.say path=".agent/repo=.this/role=any/skills/local-skill.sh">',
                '#!/bin/bash',
                '# Local Skill - Does something specific to this repo',
                '',
                '# [implementation hidden - use skill to execute]',
                '</skill.say>',
                '',
              ].join('\n'),
            );

            // Check that skill implementation is hidden
            expect(logSpy).not.toHaveBeenCalledWith(
              expect.stringContaining('echo "local skill"'),
            );
          },
        );
      },
    );

    when(
      'invoked with "boot --repo this --role robot" with briefs present',
      () => {
        beforeAll(() => {
          // Clean up first to ensure fresh state
          const cleanAgentDir = resolve(testDir, '.agent');
          if (existsSync(cleanAgentDir)) {
            rmSync(cleanAgentDir, { recursive: true, force: true });
          }

          // Setup: Create .agent/repo=.this/role=robot directory structure
          const roleDir = resolve(testDir, '.agent/repo=.this/role=robot');
          const briefsDir = resolve(roleDir, 'briefs');
          mkdirSync(briefsDir, { recursive: true });

          // Create brief files directly
          writeFileSync(
            resolve(briefsDir, 'robot-brief.md'),
            '# Robot Brief\nThis is a brief for the robot role',
          );
        });

        then(
          'it should print briefs from .agent/repo=.this/role=robot',
          async () => {
            await rolesCommand.parseAsync(
              ['boot', '--repo', 'this', '--role', 'robot'],
              {
                from: 'user',
              },
            );

            // the brief block is pinned whole, path and body together
            expect(
              asRenderedBootBlock({
                logSpy,
                tag: 'brief.say',
                path: '.agent/repo=.this/role=robot/briefs/robot-brief.md',
              }),
            ).toEqual(
              [
                '<brief.say path=".agent/repo=.this/role=robot/briefs/robot-brief.md">',
                '# Robot Brief',
                'This is a brief for the robot role',
                '</brief.say>',
                '',
              ].join('\n'),
            );
          },
        );
      },
    );

    when(
      'invoked with "boot --repo this --role any" with empty role directory',
      () => {
        beforeAll(() => {
          // Clean up first
          const cleanAgentDir = resolve(testDir, '.agent');
          if (existsSync(cleanAgentDir)) {
            rmSync(cleanAgentDir, { recursive: true, force: true });
          }

          // Setup: Create empty .agent/repo=.this/role=any
          const roleDir = resolve(testDir, '.agent/repo=.this/role=any');
          mkdirSync(roleDir, { recursive: true });
        });

        then('it should warn about no resources found', async () => {
          await rolesCommand.parseAsync(
            ['boot', '--repo', 'this', '--role', 'any'],
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

    when('invoked with "boot --repo this" without --role', () => {
      then('it should throw error: --role is required', async () => {
        const error = await getError(() =>
          rolesCommand.parseAsync(['boot', '--repo', 'this'], {
            from: 'user',
          }),
        );

        expect(error?.message).toContain('--role is required');
      });
    });

    when(
      'invoked with "boot --repo this --role any" but role directory does not exist',
      () => {
        beforeAll(() => {
          // Clean up to ensure .agent/repo=.this/role=any doesn't exist
          const cleanAgentDir = resolve(testDir, '.agent');
          if (existsSync(cleanAgentDir)) {
            rmSync(cleanAgentDir, { recursive: true, force: true });
          }
        });

        then(
          'it should throw error suggesting to create the directory',
          async () => {
            const error = await getError(() =>
              rolesCommand.parseAsync(
                ['boot', '--repo', 'this', '--role', 'any'],
                {
                  from: 'user',
                },
              ),
            );

            expect(error?.message).toContain('not found');
            expect(error?.message).toContain('.agent');
          },
        );
      },
    );

    when(
      'invoked with "boot --repo this --role missing --if-present" but role directory does not exist',
      () => {
        beforeAll(() => {
          // Clean up to ensure .agent/repo=.this/role=missing doesn't exist
          const cleanAgentDir = resolve(testDir, '.agent');
          if (existsSync(cleanAgentDir)) {
            rmSync(cleanAgentDir, { recursive: true, force: true });
          }
        });

        then('it should output skipped message without error', async () => {
          // Should not throw
          await rolesCommand.parseAsync(
            ['boot', '--repo', 'this', '--role', 'missing', '--if-present'],
            {
              from: 'user',
            },
          );

          // Should output skipped message
          expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('🫧'));
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('skipped'),
          );
        });
      },
    );

    when(
      'invoked with "boot --repo this --role empty --if-present" with empty role directory',
      () => {
        beforeAll(() => {
          // Clean up first
          const cleanAgentDir = resolve(testDir, '.agent');
          if (existsSync(cleanAgentDir)) {
            rmSync(cleanAgentDir, { recursive: true, force: true });
          }

          // Setup: Create empty .agent/repo=.this/role=empty
          const roleDir = resolve(testDir, '.agent/repo=.this/role=empty');
          mkdirSync(roleDir, { recursive: true });
        });

        then('it should exit silently without warning', async () => {
          await rolesCommand.parseAsync(
            ['boot', '--repo', 'this', '--role', 'empty', '--if-present'],
            {
              from: 'user',
            },
          );

          // role exists but is empty; with --if-present, suppress "No resources found"
          expect(logSpy).not.toHaveBeenCalled();
        });
      },
    );

    when('invoked with "boot --repo THIS --role any" (uppercase repo)', () => {
      beforeAll(() => {
        // Clean up first
        const cleanAgentDir = resolve(testDir, '.agent');
        if (existsSync(cleanAgentDir)) {
          rmSync(cleanAgentDir, { recursive: true, force: true });
        }

        // Setup: Create .agent/repo=.this/role=any with a brief
        const roleDir = resolve(testDir, '.agent/repo=.this/role=any');
        const briefsDir = resolve(roleDir, 'briefs');
        mkdirSync(briefsDir, { recursive: true });

        writeFileSync(
          resolve(briefsDir, 'uppercase-test.md'),
          '# Uppercase Test\nTesting case insensitivity',
        );
      });

      then(
        'it should work the same as --repo this (case insensitive)',
        async () => {
          await rolesCommand.parseAsync(
            ['boot', '--repo', 'THIS', '--role', 'any'],
            {
              from: 'user',
            },
          );

          // the brief block is pinned whole — uppercase `THIS` renders the same path
          expect(
            asRenderedBootBlock({
              logSpy,
              tag: 'brief.say',
              path: '.agent/repo=.this/role=any/briefs/uppercase-test.md',
            }),
          ).toEqual(
            [
              '<brief.say path=".agent/repo=.this/role=any/briefs/uppercase-test.md">',
              '# Uppercase Test',
              'Testing case insensitivity',
              '</brief.say>',
              '',
            ].join('\n'),
          );
        },
      );
    });

    when(
      'invoked with "boot --repo .this --role robot" (with dot prefix)',
      () => {
        beforeAll(() => {
          // Clean up first
          const cleanAgentDir = resolve(testDir, '.agent');
          if (existsSync(cleanAgentDir)) {
            rmSync(cleanAgentDir, { recursive: true, force: true });
          }

          // Setup: Create .agent/repo=.this/role=robot with a brief
          const roleDir = resolve(testDir, '.agent/repo=.this/role=robot');
          const briefsDir = resolve(roleDir, 'briefs');
          mkdirSync(briefsDir, { recursive: true });

          writeFileSync(
            resolve(briefsDir, 'dotprefix-test.md'),
            '# Dot Prefix Test\nTesting .this syntax with robot role',
          );
        });

        then('it should work the same as --repo this', async () => {
          await rolesCommand.parseAsync(
            ['boot', '--repo', '.this', '--role', 'robot'],
            {
              from: 'user',
            },
          );

          // the brief block is pinned whole — `.this` renders the same path
          expect(
            asRenderedBootBlock({
              logSpy,
              tag: 'brief.say',
              path: '.agent/repo=.this/role=robot/briefs/dotprefix-test.md',
            }),
          ).toEqual(
            [
              '<brief.say path=".agent/repo=.this/role=robot/briefs/dotprefix-test.md">',
              '# Dot Prefix Test',
              'Testing .this syntax with robot role',
              '</brief.say>',
              '',
            ].join('\n'),
          );
        });
      },
    );
  });
});
