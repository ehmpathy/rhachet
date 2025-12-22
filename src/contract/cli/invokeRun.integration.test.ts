import { Command } from 'commander';
import { getError, given, then, when } from 'test-fns';

import {
  chmodSync,
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { invokeRun } from './invokeRun';

describe('invokeRun (integration)', () => {
  given('a CLI program with invokeRun registered', () => {
    const testDir = resolve(__dirname, './.temp/invokeRun');
    const originalCwd = process.cwd();

    beforeAll(() => {
      // create test directory
      mkdirSync(testDir, { recursive: true });
      process.chdir(testDir);
    });

    afterAll(() => {
      process.chdir(originalCwd);
    });

    const program = new Command();
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    beforeEach(() => {
      logSpy.mockClear();
    });

    invokeRun({ program });

    when('skill exists in repo=.this/role=any', () => {
      beforeAll(() => {
        // clean up first
        const cleanAgentDir = resolve(testDir, '.agent');
        if (existsSync(cleanAgentDir)) {
          rmSync(cleanAgentDir, { recursive: true, force: true });
        }

        // create .agent/repo=.this/role=any/skills/say-hello.sh
        const skillsDir = resolve(testDir, '.agent/repo=.this/role=any/skills');
        mkdirSync(skillsDir, { recursive: true });

        const skillPath = resolve(skillsDir, 'say-hello.sh');
        writeFileSync(
          skillPath,
          '#!/usr/bin/env bash\necho "hello ${1:-stranger}"',
        );
        chmodSync(skillPath, '755');
      });

      then(
        'run --skill say-hello discovers and executes skill from .this repo',
        async () => {
          await program.parseAsync(['run', '--skill', 'say-hello'], {
            from: 'user',
          });

          // check log output
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('skill "say-hello"'),
          );
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('repo=.this'),
          );
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('role=any'),
          );
        },
      );

      then(
        'run --skill say-hello --repo .this executes with explicit repo',
        async () => {
          await program.parseAsync(
            ['run', '--skill', 'say-hello', '--repo', '.this'],
            {
              from: 'user',
            },
          );

          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('repo=.this'),
          );
        },
      );

      then(
        'run --skill say-hello --repo .this --role any executes with explicit repo and role',
        async () => {
          await program.parseAsync(
            ['run', '--skill', 'say-hello', '--repo', '.this', '--role', 'any'],
            {
              from: 'user',
            },
          );

          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('repo=.this'),
          );
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('role=any'),
          );
        },
      );
    });

    when('skill does not exist', () => {
      beforeAll(() => {
        // clean up
        const cleanAgentDir = resolve(testDir, '.agent');
        if (existsSync(cleanAgentDir)) {
          rmSync(cleanAgentDir, { recursive: true, force: true });
        }

        // create empty .agent structure
        mkdirSync(resolve(testDir, '.agent/repo=.this/role=any/skills'), {
          recursive: true,
        });
      });

      then('run --skill nonexistent throws error', async () => {
        const error = await getError(() =>
          program.parseAsync(['run', '--skill', 'nonexistent'], {
            from: 'user',
          }),
        );

        expect(error?.message).toContain('no skill "nonexistent" found');
      });
    });

    when('--skill is not provided', () => {
      then('throws error requiring --skill', async () => {
        const error = await getError(() =>
          program.parseAsync(['run'], {
            from: 'user',
          }),
        );

        expect(error?.message).toContain('--skill is required');
      });
    });

    when('skill exists in multiple roles', () => {
      beforeAll(() => {
        // clean up first
        const cleanAgentDir = resolve(testDir, '.agent');
        if (existsSync(cleanAgentDir)) {
          rmSync(cleanAgentDir, { recursive: true, force: true });
        }

        // create same skill in two roles
        const skillsDir1 = resolve(
          testDir,
          '.agent/repo=.this/role=mechanic/skills',
        );
        const skillsDir2 = resolve(
          testDir,
          '.agent/repo=.this/role=designer/skills',
        );
        mkdirSync(skillsDir1, { recursive: true });
        mkdirSync(skillsDir2, { recursive: true });

        const skillContent = '#!/usr/bin/env bash\necho "duplicate skill"';
        writeFileSync(resolve(skillsDir1, 'dupe.sh'), skillContent);
        writeFileSync(resolve(skillsDir2, 'dupe.sh'), skillContent);
        chmodSync(resolve(skillsDir1, 'dupe.sh'), '755');
        chmodSync(resolve(skillsDir2, 'dupe.sh'), '755');
      });

      then(
        'run --skill dupe throws error with disambiguation hint',
        async () => {
          const error = await getError(() =>
            program.parseAsync(['run', '--skill', 'dupe'], {
              from: 'user',
            }),
          );

          expect(error?.message).toContain('multiple skills found');
          expect(error?.message).toContain('mechanic');
          expect(error?.message).toContain('designer');
          expect(error?.message).toContain('--role');
        },
      );

      then(
        'run --skill dupe --role mechanic executes from mechanic role',
        async () => {
          await program.parseAsync(
            ['run', '--skill', 'dupe', '--role', 'mechanic'],
            {
              from: 'user',
            },
          );

          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('role=mechanic'),
          );
        },
      );
    });

    when('skill exists in external repo (repo=ehmpathy)', () => {
      beforeAll(() => {
        // clean up first
        const cleanAgentDir = resolve(testDir, '.agent');
        if (existsSync(cleanAgentDir)) {
          rmSync(cleanAgentDir, { recursive: true, force: true });
        }

        // create skill in external repo only
        const skillsDir = resolve(
          testDir,
          '.agent/repo=ehmpathy/role=mechanic/skills',
        );
        mkdirSync(skillsDir, { recursive: true });

        const skillPath = resolve(skillsDir, 'deploy.sh');
        writeFileSync(
          skillPath,
          '#!/usr/bin/env bash\necho "deploying to ${1:-production}"',
        );
        chmodSync(skillPath, '755');
      });

      then(
        'run --skill deploy discovers and executes skill from ehmpathy repo',
        async () => {
          await program.parseAsync(['run', '--skill', 'deploy'], {
            from: 'user',
          });

          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('skill "deploy"'),
          );
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('repo=ehmpathy'),
          );
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('role=mechanic'),
          );
        },
      );

      then(
        'run --skill deploy --repo ehmpathy executes with explicit repo',
        async () => {
          await program.parseAsync(
            ['run', '--skill', 'deploy', '--repo', 'ehmpathy'],
            {
              from: 'user',
            },
          );

          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('repo=ehmpathy'),
          );
        },
      );

      then(
        'run --skill deploy --repo .this throws error (wrong repo)',
        async () => {
          const error = await getError(() =>
            program.parseAsync(
              ['run', '--skill', 'deploy', '--repo', '.this'],
              {
                from: 'user',
              },
            ),
          );

          expect(error?.message).toContain('no skill "deploy" found');
          expect(error?.message).toContain('--repo .this');
        },
      );
    });

    when('skill receives extra args', () => {
      beforeAll(() => {
        // clean up first
        const cleanAgentDir = resolve(testDir, '.agent');
        if (existsSync(cleanAgentDir)) {
          rmSync(cleanAgentDir, { recursive: true, force: true });
        }

        // create skill that echoes all args
        const skillsDir = resolve(testDir, '.agent/repo=.this/role=any/skills');
        mkdirSync(skillsDir, { recursive: true });

        const skillPath = resolve(skillsDir, 'echo-args.sh');
        writeFileSync(skillPath, '#!/usr/bin/env bash\necho "args: $@"');
        chmodSync(skillPath, '755');
      });

      then('positional args pass through to skill', async () => {
        await program.parseAsync(
          ['run', '--skill', 'echo-args', 'foo', 'bar'],
          {
            from: 'user',
          },
        );

        // skill executed successfully (no error)
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('skill "echo-args"'),
        );
      });

      then('flag args pass through to skill', async () => {
        await program.parseAsync(
          ['run', '--skill', 'echo-args', '--name', 'xyz'],
          {
            from: 'user',
          },
        );

        // skill executed successfully
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('skill "echo-args"'),
        );
      });
    });
  });
});
