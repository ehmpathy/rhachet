import { Command } from 'commander';
import { given, then, when } from 'test-fns';

import {
  chmodSync,
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { invokeRun } from './invokeRun';

describe('invokeRunList (integration)', () => {
  given('[case1] repo with skills in .agent/', () => {
    const testDir = resolve(__dirname, './.temp/invokeRunList');
    const originalCwd = process.cwd();

    beforeAll(() => {
      // clean up first
      if (existsSync(testDir)) {
        rmSync(testDir, { recursive: true, force: true });
      }
      mkdirSync(testDir, { recursive: true });
      process.chdir(testDir);

      // create .agent structure with skills
      const skillsDir1 = resolve(
        testDir,
        '.agent/repo=.this/role=mechanic/skills',
      );
      const skillsDir2 = resolve(
        testDir,
        '.agent/repo=ehmpathy/role=reviewer/skills',
      );
      mkdirSync(skillsDir1, { recursive: true });
      mkdirSync(skillsDir2, { recursive: true });

      // create skills
      const skillContent = '#!/usr/bin/env bash\necho "skill"';
      writeFileSync(resolve(skillsDir1, 'git.commit.sh'), skillContent);
      writeFileSync(resolve(skillsDir1, 'git.release.sh'), skillContent);
      writeFileSync(resolve(skillsDir2, 'review.code.sh'), skillContent);
      chmodSync(resolve(skillsDir1, 'git.commit.sh'), '755');
      chmodSync(resolve(skillsDir1, 'git.release.sh'), '755');
      chmodSync(resolve(skillsDir2, 'review.code.sh'), '755');
    });

    afterAll(() => {
      process.chdir(originalCwd);
    });

    const program = new Command();
    program.enablePositionalOptions(); // required for passThroughOptions in invokeRun
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    beforeEach(() => {
      logSpy.mockClear();
    });

    invokeRun({ program });

    when('[t0] run list is invoked', () => {
      then('shows skills grouped by repo and role', async () => {
        await program.parseAsync(['run', 'list'], { from: 'user' });

        // check treestruct header
        expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/rhx list/));
        // check repos appear
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringMatching(/repo=\.this/),
        );
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringMatching(/repo=ehmpathy/),
        );
        // check skills appear
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringMatching(/git\.commit/),
        );
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringMatching(/review\.code/),
        );
      });

      then('output matches snapshot', async () => {
        logSpy.mockClear();
        await program.parseAsync(['run', 'list'], { from: 'user' });
        const output = logSpy.mock.calls.map((c) => c.join(' ')).join('\n');
        expect(output).toMatchSnapshot();
      });
    });

    when('[t1] run list help is invoked', () => {
      // .note = Commander intercepts --help before action handler
      //         bin/rhx translates --help/-h → 'help' pattern for users
      then('shows list help', async () => {
        await program.parseAsync(['run', 'list', 'help'], {
          from: 'user',
        });

        expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/rhx list/));
        expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/pattern/));
        expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/--repo/));
        expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/--all/));
      });

      then('output matches snapshot', async () => {
        logSpy.mockClear();
        await program.parseAsync(['run', 'list', 'help'], { from: 'user' });
        const output = logSpy.mock.calls.map((c) => c.join(' ')).join('\n');
        expect(output).toMatchSnapshot();
      });
    });

    when('[t2] run list with pattern is invoked', () => {
      then('filters skills by pattern', async () => {
        await program.parseAsync(['run', 'list', 'git'], { from: 'user' });

        // git skills should appear
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringMatching(/git\.commit/),
        );
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringMatching(/git\.release/),
        );
      });
    });

    when('[t3] run list --repo is invoked', () => {
      then('filters to specified repo', async () => {
        await program.parseAsync(['run', 'list', '--repo', '.this'], {
          from: 'user',
        });

        // .this skills should appear
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringMatching(/git\.commit/),
        );
        // ehmpathy skills should not appear in output (filtered)
      });
    });

    when('[t4] run list --role is invoked', () => {
      then('filters to specified role', async () => {
        await program.parseAsync(['run', 'list', '--role', 'reviewer'], {
          from: 'user',
        });

        // reviewer skills should appear
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringMatching(/review\.code/),
        );
      });
    });
  });

  given('[case2] repo with no skills', () => {
    const testDir = resolve(__dirname, './.temp/invokeRunList-empty');
    const originalCwd = process.cwd();

    beforeAll(() => {
      if (existsSync(testDir)) {
        rmSync(testDir, { recursive: true, force: true });
      }
      mkdirSync(testDir, { recursive: true });
      process.chdir(testDir);

      // create empty .agent structure
      mkdirSync(resolve(testDir, '.agent/repo=.this/role=any/skills'), {
        recursive: true,
      });
    });

    afterAll(() => {
      process.chdir(originalCwd);
    });

    const program = new Command();
    program.enablePositionalOptions(); // required for passThroughOptions in invokeRun
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    beforeEach(() => {
      logSpy.mockClear();
    });

    invokeRun({ program });

    when('[t0] run list is invoked', () => {
      then('shows 0 skills with hint', async () => {
        await program.parseAsync(['run', 'list'], { from: 'user' });

        expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/0 skills/i));
      });

      then('output matches snapshot', async () => {
        logSpy.mockClear();
        await program.parseAsync(['run', 'list'], { from: 'user' });
        const output = logSpy.mock.calls.map((c) => c.join(' ')).join('\n');
        expect(output).toMatchSnapshot();
      });
    });
  });

  given('[case3] repo with many skills (truncation)', () => {
    const testDir = resolve(__dirname, './.temp/invokeRunList-truncate');
    const originalCwd = process.cwd();

    beforeAll(() => {
      if (existsSync(testDir)) {
        rmSync(testDir, { recursive: true, force: true });
      }
      mkdirSync(testDir, { recursive: true });
      process.chdir(testDir);

      // create .agent structure with 12 skills
      const skillsDir = resolve(testDir, '.agent/repo=.this/role=any/skills');
      mkdirSync(skillsDir, { recursive: true });

      const skillContent = '#!/usr/bin/env bash\necho "skill"';
      for (let i = 1; i <= 12; i++) {
        const skillPath = resolve(
          skillsDir,
          `skill-${i.toString().padStart(2, '0')}.sh`,
        );
        writeFileSync(skillPath, skillContent);
        chmodSync(skillPath, '755');
      }
    });

    afterAll(() => {
      process.chdir(originalCwd);
    });

    const program = new Command();
    program.enablePositionalOptions(); // required for passThroughOptions in invokeRun
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    beforeEach(() => {
      logSpy.mockClear();
    });

    invokeRun({ program });

    when('[t0] run list is invoked without --all', () => {
      then('truncates at 10 skills', async () => {
        await program.parseAsync(['run', 'list'], { from: 'user' });

        // should show truncation indicator
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringMatching(/\d+\s*more/i),
        );
      });

      then('output matches snapshot', async () => {
        logSpy.mockClear();
        await program.parseAsync(['run', 'list'], { from: 'user' });
        const output = logSpy.mock.calls.map((c) => c.join(' ')).join('\n');
        expect(output).toMatchSnapshot();
      });
    });

    when('[t1] run list --all is invoked', () => {
      then('shows all skills without truncation', async () => {
        await program.parseAsync(['run', 'list', '--all'], { from: 'user' });

        // should show skill-12 (last one)
        expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/skill-12/));
      });

      then('output matches snapshot', async () => {
        logSpy.mockClear();
        await program.parseAsync(['run', 'list', '--all'], { from: 'user' });
        const output = logSpy.mock.calls.map((c) => c.join(' ')).join('\n');
        expect(output).toMatchSnapshot();
      });
    });
  });
});
