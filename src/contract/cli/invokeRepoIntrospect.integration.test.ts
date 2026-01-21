import { execSync } from 'child_process';
import { Command } from 'commander';
import { getError, given, then, when } from 'test-fns';

import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { invokeRepoIntrospect } from './invokeRepoIntrospect';

describe('invokeRepoIntrospect (integration)', () => {
  given('a CLI program with invokeRepoIntrospect registered', () => {
    const testDir = resolve(__dirname, './.temp/invokeRepoIntrospect');
    const originalCwd = process.cwd();

    beforeAll(() => {
      // create test directory structure
      mkdirSync(testDir, { recursive: true });

      // initialize as a git repo for getGitRepoRoot to work
      try {
        execSync('git init', { cwd: testDir, stdio: 'pipe' });
      } catch {
        // already a git repo
      }

      // create package.json with rhachet-roles-* name and main entry point
      writeFileSync(
        resolve(testDir, 'package.json'),
        JSON.stringify(
          {
            name: 'rhachet-roles-test',
            version: '1.0.0',
            main: 'dist/index.js',
          },
          null,
          2,
        ),
      );

      // create dist directory
      mkdirSync(resolve(testDir, 'dist'), { recursive: true });

      // create dist/index.js that exports getRoleRegistry
      writeFileSync(
        resolve(testDir, 'dist/index.js'),
        `
const { RoleRegistry, Role } = require('${resolve(__dirname, '../../domain.objects')}');

const testDir = '${testDir}';

const mechanic = new Role({
  slug: 'mechanic',
  name: 'Mechanic',
  purpose: 'fix things',
  readme: { uri: testDir + '/src/roles/mechanic/readme.md' },
  traits: [],
  briefs: { dirs: { uri: testDir + '/src/roles/mechanic/briefs' } },
  skills: {
    dirs: { uri: testDir + '/src/roles/mechanic/skills' },
    refs: [],
  },
});

const registry = new RoleRegistry({
  slug: 'ehmpathy',
  readme: { uri: testDir + '/readme.md' },
  roles: [mechanic],
});

exports.getRoleRegistry = () => registry;
`,
      );

      // create required directories and files
      mkdirSync(resolve(testDir, 'src/roles/mechanic/briefs'), {
        recursive: true,
      });
      mkdirSync(resolve(testDir, 'src/roles/mechanic/skills'), {
        recursive: true,
      });
      writeFileSync(resolve(testDir, 'readme.md'), '# Test Registry\n');
      writeFileSync(
        resolve(testDir, 'src/roles/mechanic/readme.md'),
        '# Mechanic Role\n',
      );
    });

    afterAll(() => {
      process.chdir(originalCwd);
      // cleanup test directory
      rmSync(testDir, { recursive: true, force: true });
    });

    const program = new Command('rhachet');
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    beforeEach(() => {
      logSpy.mockClear();
      process.chdir(testDir);

      // cleanup any prior rhachet.repo.yml
      const outputPath = resolve(testDir, 'rhachet.repo.yml');
      if (existsSync(outputPath)) {
        rmSync(outputPath);
      }
    });

    invokeRepoIntrospect({ program });

    when('[t0] repo introspect is invoked with default output', () => {
      then('it creates rhachet.repo.yml file', async () => {
        await program.parseAsync(['repo', 'introspect'], { from: 'user' });

        const outputPath = resolve(testDir, 'rhachet.repo.yml');
        expect(existsSync(outputPath)).toBe(true);
      });

      then('yaml contains registry slug', async () => {
        await program.parseAsync(['repo', 'introspect'], { from: 'user' });

        const outputPath = resolve(testDir, 'rhachet.repo.yml');
        const content = readFileSync(outputPath, 'utf8');
        expect(content).toContain('slug: ehmpathy');
      });

      then('yaml contains mechanic role', async () => {
        await program.parseAsync(['repo', 'introspect'], { from: 'user' });

        const outputPath = resolve(testDir, 'rhachet.repo.yml');
        const content = readFileSync(outputPath, 'utf8');
        expect(content).toContain('slug: mechanic');
      });

      then('yaml contains relative paths', async () => {
        await program.parseAsync(['repo', 'introspect'], { from: 'user' });

        const outputPath = resolve(testDir, 'rhachet.repo.yml');
        const content = readFileSync(outputPath, 'utf8');
        expect(content).toContain('readme: readme.md');
        expect(content).toContain('src/roles/mechanic/readme.md');
      });

      then('logs success message', async () => {
        await program.parseAsync(['repo', 'introspect'], { from: 'user' });

        const logs = logSpy.mock.calls.map((c) => c.join(' ')).join('\n');
        expect(logs).toContain('Done');
        expect(logs).toContain('rhachet.repo.yml');
      });
    });

    when('[t1] repo introspect is invoked with stdout output', () => {
      then('outputs yaml to stdout', async () => {
        await program.parseAsync(['repo', 'introspect', '-o', '-'], {
          from: 'user',
        });

        const logs = logSpy.mock.calls.map((c) => c.join(' ')).join('\n');
        expect(logs).toContain('slug: ehmpathy');
        expect(logs).toContain('slug: mechanic');
      });

      then('does not create file', async () => {
        await program.parseAsync(['repo', 'introspect', '-o', '-'], {
          from: 'user',
        });

        const outputPath = resolve(testDir, 'rhachet.repo.yml');
        expect(existsSync(outputPath)).toBe(false);
      });
    });

    when('[t2] repo introspect is invoked with custom output path', () => {
      afterEach(() => {
        const customPath = resolve(testDir, 'custom-manifest.yml');
        if (existsSync(customPath)) {
          rmSync(customPath);
        }
      });

      then('creates custom output file', async () => {
        await program.parseAsync(
          ['repo', 'introspect', '--output', 'custom-manifest.yml'],
          { from: 'user' },
        );

        const customPath = resolve(testDir, 'custom-manifest.yml');
        expect(existsSync(customPath)).toBe(true);
      });

      then('logs custom filename in success message', async () => {
        await program.parseAsync(
          ['repo', 'introspect', '--output', 'custom-manifest.yml'],
          { from: 'user' },
        );

        const logs = logSpy.mock.calls.map((c) => c.join(' ')).join('\n');
        expect(logs).toContain('custom-manifest.yml');
      });
    });

    when('[t3] package.json has no files array', () => {
      beforeEach(() => {
        // reset package.json without files array
        writeFileSync(
          resolve(testDir, 'package.json'),
          JSON.stringify(
            {
              name: 'rhachet-roles-test',
              version: '1.0.0',
              main: 'dist/index.js',
            },
            null,
            2,
          ),
        );
      });

      then('adds rhachet.repo.yml to files array', async () => {
        await program.parseAsync(['repo', 'introspect'], { from: 'user' });

        const packageJson = JSON.parse(
          readFileSync(resolve(testDir, 'package.json'), 'utf8'),
        );
        expect(packageJson.files).toEqual(['rhachet.repo.yml']);
      });

      then('logs files array update', async () => {
        await program.parseAsync(['repo', 'introspect'], { from: 'user' });

        const logs = logSpy.mock.calls.map((c) => c.join(' ')).join('\n');
        expect(logs).toContain('package.json:.files += "rhachet.repo.yml"');
      });
    });

    when('[t4] package.json has files array without rhachet.repo.yml', () => {
      beforeEach(() => {
        // reset package.json with files array missing rhachet.repo.yml
        writeFileSync(
          resolve(testDir, 'package.json'),
          JSON.stringify(
            {
              name: 'rhachet-roles-test',
              version: '1.0.0',
              main: 'dist/index.js',
              files: ['dist', 'src'],
            },
            null,
            2,
          ),
        );
      });

      then('appends rhachet.repo.yml to files array', async () => {
        await program.parseAsync(['repo', 'introspect'], { from: 'user' });

        const packageJson = JSON.parse(
          readFileSync(resolve(testDir, 'package.json'), 'utf8'),
        );
        expect(packageJson.files).toEqual(['dist', 'src', 'rhachet.repo.yml']);
      });
    });

    when('[t5] package.json already has rhachet.repo.yml in files', () => {
      beforeEach(() => {
        // reset package.json with rhachet.repo.yml already present
        writeFileSync(
          resolve(testDir, 'package.json'),
          JSON.stringify(
            {
              name: 'rhachet-roles-test',
              version: '1.0.0',
              main: 'dist/index.js',
              files: ['dist', 'rhachet.repo.yml'],
            },
            null,
            2,
          ),
        );
      });

      then('does not duplicate rhachet.repo.yml', async () => {
        await program.parseAsync(['repo', 'introspect'], { from: 'user' });

        const packageJson = JSON.parse(
          readFileSync(resolve(testDir, 'package.json'), 'utf8'),
        );
        expect(packageJson.files).toEqual(['dist', 'rhachet.repo.yml']);
      });

      then('does not log files array update', async () => {
        await program.parseAsync(['repo', 'introspect'], { from: 'user' });

        const logs = logSpy.mock.calls.map((c) => c.join(' ')).join('\n');
        expect(logs).not.toContain('package.json:.files');
      });
    });

    when('[t6] output is stdout', () => {
      beforeEach(() => {
        // reset package.json without files array
        writeFileSync(
          resolve(testDir, 'package.json'),
          JSON.stringify(
            {
              name: 'rhachet-roles-test',
              version: '1.0.0',
              main: 'dist/index.js',
            },
            null,
            2,
          ),
        );
      });

      then('does not modify package.json files array', async () => {
        await program.parseAsync(['repo', 'introspect', '-o', '-'], {
          from: 'user',
        });

        const packageJson = JSON.parse(
          readFileSync(resolve(testDir, 'package.json'), 'utf8'),
        );
        expect(packageJson.files).toBeUndefined();
      });
    });

    when('[t7] package.json has exports without ./package.json', () => {
      beforeEach(() => {
        writeFileSync(
          resolve(testDir, 'package.json'),
          JSON.stringify(
            {
              name: 'rhachet-roles-test',
              version: '1.0.0',
              main: 'dist/index.js',
              files: ['dist', 'rhachet.repo.yml'],
              exports: {
                '.': './dist/index.js',
              },
            },
            null,
            2,
          ),
        );
      });

      then('adds ./package.json to exports', async () => {
        await program.parseAsync(['repo', 'introspect'], { from: 'user' });

        const packageJson = JSON.parse(
          readFileSync(resolve(testDir, 'package.json'), 'utf8'),
        );
        expect(packageJson.exports).toEqual({
          '.': './dist/index.js',
          './package.json': './package.json',
        });
      });

      then('logs exports update', async () => {
        await program.parseAsync(['repo', 'introspect'], { from: 'user' });

        const logs = logSpy.mock.calls.map((c) => c.join(' ')).join('\n');
        expect(logs).toContain('package.json:.exports += "./package.json"');
      });
    });

    when('[t8] package.json has exports with ./package.json already', () => {
      beforeEach(() => {
        writeFileSync(
          resolve(testDir, 'package.json'),
          JSON.stringify(
            {
              name: 'rhachet-roles-test',
              version: '1.0.0',
              main: 'dist/index.js',
              files: ['dist', 'rhachet.repo.yml'],
              exports: {
                '.': './dist/index.js',
                './package.json': './package.json',
              },
            },
            null,
            2,
          ),
        );
      });

      then('does not duplicate ./package.json in exports', async () => {
        await program.parseAsync(['repo', 'introspect'], { from: 'user' });

        const packageJson = JSON.parse(
          readFileSync(resolve(testDir, 'package.json'), 'utf8'),
        );
        expect(packageJson.exports).toEqual({
          '.': './dist/index.js',
          './package.json': './package.json',
        });
      });

      then('does not log exports update', async () => {
        await program.parseAsync(['repo', 'introspect'], { from: 'user' });

        const logs = logSpy.mock.calls.map((c) => c.join(' ')).join('\n');
        expect(logs).not.toContain('package.json:.exports');
      });
    });

    when('[t9] package.json has no exports field', () => {
      beforeEach(() => {
        writeFileSync(
          resolve(testDir, 'package.json'),
          JSON.stringify(
            {
              name: 'rhachet-roles-test',
              version: '1.0.0',
              main: 'dist/index.js',
              files: ['dist', 'rhachet.repo.yml'],
            },
            null,
            2,
          ),
        );
      });

      then('does not add exports field', async () => {
        await program.parseAsync(['repo', 'introspect'], { from: 'user' });

        const packageJson = JSON.parse(
          readFileSync(resolve(testDir, 'package.json'), 'utf8'),
        );
        expect(packageJson.exports).toBeUndefined();
      });
    });

    when('[t10] package.json needs both files and exports updates', () => {
      beforeEach(() => {
        writeFileSync(
          resolve(testDir, 'package.json'),
          JSON.stringify(
            {
              name: 'rhachet-roles-test',
              version: '1.0.0',
              main: 'dist/index.js',
              files: ['dist'],
              exports: {
                '.': './dist/index.js',
              },
            },
            null,
            2,
          ),
        );
      });

      then(
        'adds rhachet.repo.yml to files and ./package.json to exports',
        async () => {
          await program.parseAsync(['repo', 'introspect'], { from: 'user' });

          const packageJson = JSON.parse(
            readFileSync(resolve(testDir, 'package.json'), 'utf8'),
          );
          expect(packageJson.files).toEqual(['dist', 'rhachet.repo.yml']);
          expect(packageJson.exports).toEqual({
            '.': './dist/index.js',
            './package.json': './package.json',
          });
        },
      );

      then('logs both updates', async () => {
        await program.parseAsync(['repo', 'introspect'], { from: 'user' });

        const logs = logSpy.mock.calls.map((c) => c.join(' ')).join('\n');
        expect(logs).toContain('package.json:.files += "rhachet.repo.yml"');
        expect(logs).toContain('package.json:.exports += "./package.json"');
      });
    });

    when('[t11] skills dir with executable .sh files', () => {
      beforeEach(() => {
        // reset package.json
        writeFileSync(
          resolve(testDir, 'package.json'),
          JSON.stringify(
            {
              name: 'rhachet-roles-test',
              version: '1.0.0',
              main: 'dist/index.js',
            },
            null,
            2,
          ),
        );

        // create executable .sh skill
        const skillPath = resolve(
          testDir,
          'src/roles/mechanic/skills/test-skill.sh',
        );
        writeFileSync(skillPath, '#!/bin/bash\necho "test"');
        chmodSync(skillPath, 0o755);
      });

      afterEach(() => {
        // cleanup skill file
        const skillPath = resolve(
          testDir,
          'src/roles/mechanic/skills/test-skill.sh',
        );
        if (existsSync(skillPath)) rmSync(skillPath);
      });

      then('command succeeds and yml generated', async () => {
        await program.parseAsync(['repo', 'introspect'], { from: 'user' });

        const outputPath = resolve(testDir, 'rhachet.repo.yml');
        expect(existsSync(outputPath)).toBe(true);
      });
    });

    when('[t12] skills dir with non-executable .sh file', () => {
      const skillPath = resolve(
        testDir,
        'src/roles/mechanic/skills/broken-skill.sh',
      );

      beforeEach(() => {
        // reset package.json
        writeFileSync(
          resolve(testDir, 'package.json'),
          JSON.stringify(
            {
              name: 'rhachet-roles-test',
              version: '1.0.0',
              main: 'dist/index.js',
            },
            null,
            2,
          ),
        );

        // create non-executable .sh skill
        writeFileSync(skillPath, '#!/bin/bash\necho "broken"');
        // intentionally NOT chmod
      });

      afterEach(() => {
        if (existsSync(skillPath)) rmSync(skillPath);
      });

      then('command fails with error that includes path', async () => {
        const error = await getError(
          program.parseAsync(['repo', 'introspect'], { from: 'user' }),
        );

        expect(error).toBeDefined();
        expect(error?.message).toContain('non-executable skill files detected');
        expect(error?.message).toContain(skillPath);
      });

      then('error includes fix hint', async () => {
        const error = await getError(
          program.parseAsync(['repo', 'introspect'], { from: 'user' }),
        );

        expect(error?.message).toContain('chmod +x');
      });
    });

    when('[t13] skills dir with multiple non-executable .sh files', () => {
      const skillPath1 = resolve(
        testDir,
        'src/roles/mechanic/skills/broken1.sh',
      );
      const skillPath2 = resolve(
        testDir,
        'src/roles/mechanic/skills/broken2.sh',
      );

      beforeEach(() => {
        // reset package.json
        writeFileSync(
          resolve(testDir, 'package.json'),
          JSON.stringify(
            {
              name: 'rhachet-roles-test',
              version: '1.0.0',
              main: 'dist/index.js',
            },
            null,
            2,
          ),
        );

        // create multiple non-executable .sh skills
        writeFileSync(skillPath1, '#!/bin/bash\necho "broken1"');
        writeFileSync(skillPath2, '#!/bin/bash\necho "broken2"');
        // intentionally NOT chmod
      });

      afterEach(() => {
        if (existsSync(skillPath1)) rmSync(skillPath1);
        if (existsSync(skillPath2)) rmSync(skillPath2);
      });

      then('error lists all paths', async () => {
        const error = await getError(
          program.parseAsync(['repo', 'introspect'], { from: 'user' }),
        );

        expect(error).toBeDefined();
        expect(error?.message).toContain(skillPath1);
        expect(error?.message).toContain(skillPath2);
      });
    });

    when('[t14] skills dir with only .ts/.md files', () => {
      const tsPath = resolve(testDir, 'src/roles/mechanic/skills/helper.ts');
      const mdPath = resolve(testDir, 'src/roles/mechanic/skills/readme.md');

      beforeEach(() => {
        // reset package.json
        writeFileSync(
          resolve(testDir, 'package.json'),
          JSON.stringify(
            {
              name: 'rhachet-roles-test',
              version: '1.0.0',
              main: 'dist/index.js',
            },
            null,
            2,
          ),
        );

        // create .ts and .md files (no .sh files)
        writeFileSync(tsPath, 'export const x = 1;');
        writeFileSync(mdPath, '# Skills readme');
      });

      afterEach(() => {
        if (existsSync(tsPath)) rmSync(tsPath);
        if (existsSync(mdPath)) rmSync(mdPath);
      });

      then('command succeeds', async () => {
        await program.parseAsync(['repo', 'introspect'], { from: 'user' });

        const outputPath = resolve(testDir, 'rhachet.repo.yml');
        expect(existsSync(outputPath)).toBe(true);
      });
    });
  });
});
