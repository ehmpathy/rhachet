import { execSync } from 'child_process';
import { Command } from 'commander';
import { genTempDir, given, then, when } from 'test-fns';

import { getPreprocessedRoleArgv } from '@src/domain.operations/roles/deltas/getPreprocessedRoleArgv';

import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { invokeInit } from './invokeInit';

/**
 * .what = the MIGRATION report alone — the `rhx init` stdout with the role link/init
 *   preamble cut away
 * .why = 🔴 one `rhx init` run writes two different contracts' surfaces to one stream: the
 *   `roles link` / role-init preamble, then the brain-dir migration report. only the second
 *   is what a migration case claims to pin, and the first is already pinned by the
 *   `roles.link` suites that own it
 * .note = so this is a CUT, never a mask. the preamble embeds an absolute `node_modules`
 *   path under the reviewer's own HOME, a pinned `rhachet-roles-ehmpathy@<version>` plus
 *   every transitive version in the pnpm dir name, and the role corpus counts
 *   (`272 brief(s)`) — four spans that move per host and per dep bump, and not one of them
 *   belongs to the surface under test. to mask them all would be to keep a span this case
 *   does not own
 * .note = the cut anchors on the LAST `✨` summary line, so any NEW report line the
 *   migration grows is included rather than filtered out. a prefix allowlist would have
 *   dropped it in silence, which is `rule.forbid.failhide` at the mask grain
 */
const asMigrationReportOnly = (output: string): string => {
  const lastSummaryAt = output.lastIndexOf('\n✨ ');
  if (lastSummaryAt === -1) return output.trim();
  const afterSummaryBlock = output.indexOf('\n', lastSummaryAt + 1);
  return output.slice(afterSummaryBlock + 1).trim();
};

/**
 * .what = an `rhx init` report with its three per-run spans neutralized, so the surface a
 *   human reads can be pinned whole
 * .why = 🔴 the report carries an absolute temp repo path (fresh every run) and a backup
 *   filename stamped with the clock. unmasked, a snapshot of it reddens on the next machine
 *   and on the very next run — causes unrelated to the render it claims to pin, and each
 *   such red teaches the maintainer to resnap rather than read
 * .note = what stays LIVE is every byte the cli owns: the `dropped:` / `moved:` lines, the
 *   `✗ … not written:` lead, each `└─ hint:` cure, every path segment BELOW the repo root
 *   (so `/TMP_REPO/.claude` keeps its `.claude`), the `unrestorable:` list, and the ROLE
 *   count. a reword, a lost hint, or a changed destination all still redden
 * .note = the repo root is replaced by its OWN value rather than by a pattern, and both of
 *   its names are replaced — the raw path and its realpath — since a temp dir on darwin
 *   resolves through `/private` and a pattern that guesses at the root will either miss a
 *   name or eat the contract-owned suffix after it
 *   (`rule.require.mask-both-names-of-a-temp-dir`)
 * .note = `/TMP_REPO` and `$STAMP` are the tokens `asSnapshotSafe` already uses for these
 *   concepts. ONE vocabulary per concept, so a reader never has to wonder whether two tokens
 *   name one value
 * .note = a `— N roles, M chars` census tail once needed a rule here too. that surface is
 *   gone — a brain dir reports as one `🧠 brain dir` treestruct — so the char count no
 *   longer renders, and the maskers that covered it retired with it
 */
const asMaskedInitReport = (input: {
  output: string;
  repoPath: string;
}): string => {
  const rootsOfRepo = [
    realpathSync(input.repoPath),
    input.repoPath,
    // longest first, so a prefix never masks ahead of its own realpath
  ].sort((a, b) => b.length - a.length);
  return (
    rootsOfRepo
      .reduce((text, root) => text.split(root).join('/TMP_REPO'), input.output)
      // a backup filename the migration stamps with the clock
      .replace(/\.\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z\.bak\./g, '.$STAMP.bak.')
      // a role's own init may back settings.json up more than once per `init`, each under a
      //   SECONDS-grain stamp: two backups in one second collide into one file, two across a
      //   second boundary stay two. once the stamp is masked those rows are identical, so all
      //   that is left to vary is their COUNT, and that count belongs to the wall clock. so
      //   consecutive identical stamped rows collapse to one (`rule.forbid.time-assumptions`)
      .split('\n')
      .filter(
        (line, index, lines) =>
          !(line.includes('$STAMP') && line === lines[index - 1]),
      )
      .join('\n')
  );
};

describe('invokeInit (integration)', () => {
  given('a CLI program with invokeInit registered', () => {
    const testDir = genTempDir({ slug: 'invokeInit' });
    const originalCwd = process.cwd();

    beforeAll(() => {
      // Initialize as a git repo for getGitRepoRoot to work
      try {
        execSync('git init', { cwd: testDir, stdio: 'pipe' });
      } catch {
        // already a git repo
      }

      // Symlink node_modules so rhachet-roles-* packages are discoverable
      const nodeModulesLink = join(testDir, 'node_modules');
      const nodeModulesTarget = resolve(__dirname, '../../..', 'node_modules');
      if (!existsSync(nodeModulesLink)) {
        symlinkSync(nodeModulesTarget, nodeModulesLink, 'dir');
      }
    });

    afterAll(() => {
      process.chdir(originalCwd);
    });

    const program = new Command('rhachet');
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const exitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);

    beforeEach(() => {
      logSpy.mockClear();
      exitSpy.mockClear();
      process.chdir(testDir);

      // Clean up any extant rhachet.use.ts
      const configPath = resolve(testDir, 'rhachet.use.ts');
      if (existsSync(configPath)) {
        rmSync(configPath);
      }
    });

    // register the init command
    invokeInit({ program });

    when(
      'invoked with --config and package.json that has rhachet-roles-* packages',
      () => {
        beforeEach(() => {
          // create package.json with rhachet-roles packages
          writeFileSync(
            resolve(testDir, 'package.json'),
            JSON.stringify({
              name: 'test-project',
              dependencies: {
                'rhachet-roles-ehmpathy': '1.0.0',
              },
            }),
          );
        });

        then(
          'it should create rhachet.use.ts with discovered packages',
          async () => {
            await program.parseAsync(['init', '--config'], { from: 'user' });

            const configPath = resolve(testDir, 'rhachet.use.ts');
            expect(existsSync(configPath)).toBe(true);

            const content = readFileSync(configPath, 'utf8');
            expect(content).toContain('getRoleRegistryEhmpathy');
            expect(content).toContain('getInvokeHooksEhmpathy');
            expect(content).toContain("from 'rhachet-roles-ehmpathy'");

            // check log output
            expect(logSpy).toHaveBeenCalledWith(
              expect.stringContaining('rhachet-roles-ehmpathy'),
            );
            expect(logSpy).toHaveBeenCalledWith(
              expect.stringContaining('Done'),
            );
          },
        );
      },
    );

    when('invoked with --config and multiple rhachet-roles-* packages', () => {
      beforeEach(() => {
        writeFileSync(
          resolve(testDir, 'package.json'),
          JSON.stringify({
            name: 'test-project',
            dependencies: {
              'rhachet-roles-ehmpathy': '1.0.0',
            },
            devDependencies: {
              'rhachet-roles-other': '1.0.0',
            },
          }),
        );
      });

      then('it should include all packages in config', async () => {
        await program.parseAsync(['init', '--config'], { from: 'user' });

        const configPath = resolve(testDir, 'rhachet.use.ts');
        const content = readFileSync(configPath, 'utf8');

        expect(content).toContain('getRoleRegistryEhmpathy');
        expect(content).toContain('getRoleRegistryOther');
        expect(content).toContain(
          'getInvokeHooksEhmpathy(), getInvokeHooksOther()',
        );
      });
    });

    when('invoked with --config and no rhachet-roles-* packages', () => {
      beforeEach(() => {
        writeFileSync(
          resolve(testDir, 'package.json'),
          JSON.stringify({
            name: 'test-project',
            dependencies: {
              lodash: '4.0.0',
            },
          }),
        );
      });

      then('it should warn and not create config', async () => {
        await program.parseAsync(['init', '--config'], { from: 'user' });

        const configPath = resolve(testDir, 'rhachet.use.ts');
        expect(existsSync(configPath)).toBe(false);

        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('No rhachet-roles-* packages found'),
        );
      });
    });

    when('invoked with --config successfully', () => {
      beforeEach(() => {
        writeFileSync(
          resolve(testDir, 'package.json'),
          JSON.stringify({
            name: 'test-project',
            dependencies: { 'rhachet-roles-ehmpathy': '1.0.0' },
          }),
        );

        // clean up agent dirs
        const agentDir = resolve(testDir, '.agent');
        if (existsSync(agentDir)) rmSync(agentDir, { recursive: true });
      });

      then(
        'it should create .agent/repo=.this/role=any/briefs and skills directories',
        async () => {
          await program.parseAsync(['init', '--config'], { from: 'user' });

          const briefsDir = resolve(
            testDir,
            '.agent/repo=.this/role=any/briefs',
          );
          const skillsDir = resolve(
            testDir,
            '.agent/repo=.this/role=any/skills',
          );

          expect(existsSync(briefsDir)).toBe(true);
          expect(existsSync(skillsDir)).toBe(true);
        },
      );

      then(
        'it should create .agent/repo=.this/role=any/readme.md with correct content',
        async () => {
          await program.parseAsync(['init', '--config'], { from: 'user' });

          const readmePath = resolve(
            testDir,
            '.agent/repo=.this/role=any/readme.md',
          );

          expect(existsSync(readmePath)).toBe(true);
          expect(readFileSync(readmePath, 'utf8')).toBe(
            'this role applies to any agent that works within this repo\n',
          );
        },
      );

      then(
        'it should not overwrite prior agent directories or readme (findsert)',
        async () => {
          // pre-create with custom content
          const roleAnyDir = resolve(testDir, '.agent/repo=.this/role=any');
          const briefsDir = resolve(roleAnyDir, 'briefs');
          const readmePath = resolve(roleAnyDir, 'readme.md');

          mkdirSync(briefsDir, { recursive: true });
          writeFileSync(readmePath, 'custom content');

          await program.parseAsync(['init', '--config'], { from: 'user' });

          // should preserve custom content
          expect(readFileSync(readmePath, 'utf8')).toBe('custom content');
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('○ [found]'),
          );
        },
      );
    });

    when('rhachet.use.ts already exists and --config is used', () => {
      beforeEach(() => {
        writeFileSync(
          resolve(testDir, 'package.json'),
          JSON.stringify({
            name: 'test-project',
            dependencies: {
              'rhachet-roles-ehmpathy': '1.0.0',
            },
          }),
        );
        writeFileSync(resolve(testDir, 'rhachet.use.ts'), '// prior config');
      });

      then(
        'it should report [found] and preserve prior content (findsert)',
        async () => {
          await program.parseAsync(['init', '--config'], { from: 'user' });

          // should preserve prior content
          const configPath = resolve(testDir, 'rhachet.use.ts');
          const content = readFileSync(configPath, 'utf8');
          expect(content).toBe('// prior config');

          // should report found
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('○ [found]'),
          );
        },
      );
    });

    when(
      'rhachet.use.ts already exists and --config --mode upsert is used',
      () => {
        beforeEach(() => {
          writeFileSync(
            resolve(testDir, 'package.json'),
            JSON.stringify({
              name: 'test-project',
              dependencies: {
                'rhachet-roles-ehmpathy': '1.0.0',
              },
            }),
          );
          writeFileSync(resolve(testDir, 'rhachet.use.ts'), '// prior config');
        });

        then(
          'it should report [updated] and overwrite prior content',
          async () => {
            await program.parseAsync(['init', '--config', '--mode', 'upsert'], {
              from: 'user',
            });

            // should overwrite with new content
            const configPath = resolve(testDir, 'rhachet.use.ts');
            const content = readFileSync(configPath, 'utf8');
            expect(content).not.toBe('// prior config');
            expect(content).toContain('getRoleRegistryEhmpathy');

            // should report updated
            expect(logSpy).toHaveBeenCalledWith(
              expect.stringContaining('↻ [updated]'),
            );
          },
        );
      },
    );

    when(
      'rhachet.use.ts does not exist and --config --mode upsert is used',
      () => {
        beforeEach(() => {
          writeFileSync(
            resolve(testDir, 'package.json'),
            JSON.stringify({
              name: 'test-project',
              dependencies: {
                'rhachet-roles-ehmpathy': '1.0.0',
              },
            }),
          );
        });

        then('it should report [created] and create the file', async () => {
          await program.parseAsync(['init', '--config', '--mode', 'upsert'], {
            from: 'user',
          });

          // should create with new content
          const configPath = resolve(testDir, 'rhachet.use.ts');
          expect(existsSync(configPath)).toBe(true);
          const content = readFileSync(configPath, 'utf8');
          expect(content).toContain('getRoleRegistryEhmpathy');

          // should report created
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('+ [created]'),
          );
        });
      },
    );

    when(
      '--config --mode findsert is explicitly used (default behavior)',
      () => {
        beforeEach(() => {
          writeFileSync(
            resolve(testDir, 'package.json'),
            JSON.stringify({
              name: 'test-project',
              dependencies: {
                'rhachet-roles-ehmpathy': '1.0.0',
              },
            }),
          );
          writeFileSync(resolve(testDir, 'rhachet.use.ts'), '// prior config');
        });

        then('it should preserve prior content like default', async () => {
          await program.parseAsync(['init', '--config', '--mode', 'findsert'], {
            from: 'user',
          });

          // should preserve prior content
          const configPath = resolve(testDir, 'rhachet.use.ts');
          const content = readFileSync(configPath, 'utf8');
          expect(content).toBe('// prior config');

          // should report found
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('○ [found]'),
          );
        });
      },
    );

    when('invoked without flags', () => {
      beforeEach(() => {
        writeFileSync(
          resolve(testDir, 'package.json'),
          JSON.stringify({
            name: 'test-project',
            dependencies: {
              'rhachet-roles-ehmpathy': '1.0.0',
            },
          }),
        );
      });

      then('it should show usage instructions', async () => {
        await program.parseAsync(['init'], { from: 'user' });

        // should show usage header
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('usage: rhachet init --roles'),
        );
      });
    });

    when('invoked with --prep but without --roles', () => {
      beforeEach(() => {
        writeFileSync(
          resolve(testDir, 'package.json'),
          JSON.stringify({
            name: 'test-project',
            scripts: {},
          }),
        );
      });

      then('it should throw ConstraintError', async () => {
        let thrownError: Error | null = null;
        try {
          await program.parseAsync(['init', '--prep'], { from: 'user' });
        } catch (error) {
          if (error instanceof Error) thrownError = error;
        }

        expect(thrownError).not.toBeNull();
        expect(thrownError?.message).toContain('--prep requires --roles');
      });
    });

    when('invoked with --prep --roles mechanic (no hooks)', () => {
      beforeEach(() => {
        writeFileSync(
          resolve(testDir, 'package.json'),
          JSON.stringify({
            name: 'test-project',
            scripts: {},
            dependencies: {
              'rhachet-roles-ehmpathy': '1.0.0',
            },
          }),
        );
      });

      then('it should upsert prepare:rhachet without --hooks', async () => {
        await program.parseAsync(['init', '--prep', '--roles', 'mechanic'], {
          from: 'user',
        });

        const pkg = JSON.parse(
          readFileSync(resolve(testDir, 'package.json'), 'utf8'),
        );
        expect(pkg.scripts['prepare:rhachet']).toEqual(
          'rhachet init --roles mechanic',
        );
        expect(pkg.scripts['prepare:rhachet']).not.toContain('--hooks');
      });

      then(
        'it should findsert prepare with npm run prepare:rhachet',
        async () => {
          await program.parseAsync(['init', '--prep', '--roles', 'mechanic'], {
            from: 'user',
          });

          const pkg = JSON.parse(
            readFileSync(resolve(testDir, 'package.json'), 'utf8'),
          );
          expect(pkg.scripts.prepare).toEqual('npm run prepare:rhachet');
        },
      );
    });

    when('invoked with --prep --hooks --roles mechanic', () => {
      beforeEach(() => {
        writeFileSync(
          resolve(testDir, 'package.json'),
          JSON.stringify({
            name: 'test-project',
            scripts: {},
            dependencies: {
              'rhachet-roles-ehmpathy': '1.0.0',
            },
          }),
        );
      });

      then('it should upsert prepare:rhachet with --hooks', async () => {
        await program.parseAsync(
          ['init', '--prep', '--hooks', '--roles', 'mechanic'],
          { from: 'user' },
        );

        const pkg = JSON.parse(
          readFileSync(resolve(testDir, 'package.json'), 'utf8'),
        );
        expect(pkg.scripts['prepare:rhachet']).toEqual(
          'rhachet init --hooks --roles mechanic',
        );
      });
    });

    when('invoked with --prep and prepare entry already extant', () => {
      beforeEach(() => {
        writeFileSync(
          resolve(testDir, 'package.json'),
          JSON.stringify({
            name: 'test-project',
            scripts: {
              prepare: 'husky install',
            },
            dependencies: {
              'rhachet-roles-ehmpathy': '1.0.0',
            },
          }),
        );
      });

      then('it should append to prepare entry', async () => {
        await program.parseAsync(['init', '--prep', '--roles', 'mechanic'], {
          from: 'user',
        });

        const pkg = JSON.parse(
          readFileSync(resolve(testDir, 'package.json'), 'utf8'),
        );
        expect(pkg.scripts.prepare).toEqual(
          'husky install && npm run prepare:rhachet',
        );
      });
    });
  });

  given('[case2] init against the brain dirs', () => {
    const DEFAULT_BRAIN_DIR_REL =
      '.agent/.actors/actor.via.slug=.default/brain/.claude';
    const originalCwd = process.cwd();
    const program = new Command('rhachet');
    invokeInit({ program });

    /**
     * .mock = the process-global output sinks, `console.log` / `console.error` /
     *         `process.exit` — and no part of the subject under test
     * .why = `invokeInit` is a cli contract: its stdout, stderr and exit code ARE the
     *        behavior each case below asserts. a cli writes those to process globals, so
     *        capture is the only way to read them from in-process. `rule.forbid.integration.mocks`
     *        forbids a mock that FAKES the integrated service; these fake no service — the
     *        real `invokeInit`, the real filesystem, and the real role packages all run.
     *        `process.exit` in particular must be intercepted or it tears down the jest worker.
     * .real = the same behavior is asserted out-of-process, with no spies at all, over the
     *         real built binary in `blackbox/cli/` — `init.acceptance.test.ts` and its peers
     *         read stdout, stderr and the status code from a real subprocess.
     */
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const exitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);

    /**
     * .what = a fresh git repo that can link rhachet-roles-ehmpathy, cwd moved into it
     */
    const genRepoForInit = (input: { slug: string }): string => {
      const repoPath = genTempDir({ slug: input.slug, git: true });
      symlinkSync(
        join(__dirname, '../../..', 'node_modules'),
        join(repoPath, 'node_modules'),
        'dir',
      );
      writeFileSync(
        join(repoPath, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          dependencies: { 'rhachet-roles-ehmpathy': '1.0.0' },
        }),
      );
      process.chdir(repoPath);
      return repoPath;
    };

    /**
     * .what = stage and commit every path in the repo
     * .why = the migration drops a boot file ONLY where git could hand it back, so a case
     *   that asserts a DROP must first put that file where git can reach it. the identity
     *   rides on `-c`, so the test needs no global git config to exist
     */
    const commitWholeTree = (input: { repoPath: string }): void => {
      execSync('git add -A', { cwd: input.repoPath, stdio: 'pipe' });
      execSync(
        'git -c user.email=test@example.com -c user.name=test commit -q -m seed',
        { cwd: input.repoPath, stdio: 'pipe' },
      );
    };

    beforeEach(() => {
      logSpy.mockClear();
      errorSpy.mockClear();
      exitSpy.mockClear();
    });

    afterAll(() => {
      process.chdir(originalCwd);
      logSpy.mockRestore();
      errorSpy.mockRestore();
      exitSpy.mockRestore();
    });

    when(
      '[t0] <repo>/.claude is a real dir with a COMMITTED hand AGENTS.md',
      () => {
        then(
          'it migrates the dir: boot files drop, the rest move, and the link lands',
          async () => {
            const repoPath = genRepoForInit({ slug: 'init-migrate' });
            mkdirSync(join(repoPath, '.claude'));
            writeFileSync(join(repoPath, '.claude', 'AGENTS.md'), 'hand\n');
            writeFileSync(join(repoPath, '.claude', 'settings.json'), '{}\n');

            // the boot file is COMMITTED, so its drop is recoverable from git — the one
            // ground S11 rests on, and now the one state a drop proceeds from
            commitWholeTree({ repoPath });

            await program.parseAsync(['init', '--roles', 'mechanic'], {
              from: 'user',
            });

            expect(exitSpy).not.toHaveBeenCalled();
            expect(readlinkSync(join(repoPath, '.claude'))).toEqual(
              DEFAULT_BRAIN_DIR_REL,
            );
            // the role's own init merged its permissions in; the file then moved whole
            expect(
              readFileSync(
                join(repoPath, DEFAULT_BRAIN_DIR_REL, 'settings.json'),
                'utf8',
              ),
            ).toContain('"permissions"');
            expect(
              readFileSync(join(repoPath, '.claude', 'AGENTS.md'), 'utf8'),
            ).toEqual('@boot.md\n');
            expect(
              readFileSync(join(repoPath, '.claude', 'boot.md'), 'utf8'),
            ).toContain('repo=ehmpathy/role=mechanic');
            const lines = logSpy.mock.calls.map((call) => String(call[0]));
            expect(
              lines.filter((line) => line === '🧠 brain dir (default)'),
            ).toHaveLength(1);
            // stdout names the drop and the move, so the human can commit the rename —
            //   and each is a ROW of the brain dir tree, never a bare line wedged between
            //   two adjacent treestructs (`rule.require.treestruct-output`)
            expect(lines).toContain(
              '   │  └─ .claude/AGENTS.md — rhachet owns the boot context',
            );
            expect(lines).toContain(
              `   │  └─ .claude/settings.json → ${DEFAULT_BRAIN_DIR_REL}/settings.json`,
            );
            // the asserts above prove the two lines a human ACTS on are present; they
            // cannot catch a reordered block, a lost blank, or a reworded neighbour in
            // the migration report as a whole. this is a human-faced cli surface, so it
            // is pinned whole, BESIDE those asserts rather than in place of them — a
            // snapshot-only case passes on any content once resnapped
            // (`rule.forbid.failhide`)
            expect(
              asMaskedInitReport({
                output: asMigrationReportOnly(lines.join('\n')),
                repoPath,
              }),
            ).toMatchSnapshot();
          },
        );
      },
    );

    when('[t0b] <repo>/.claude holds an UNTRACKED hand AGENTS.md', () => {
      then('it refuses with exit 2 and the hand file survives', async () => {
        const repoPath = genRepoForInit({ slug: 'init-migrate-untracked' });
        mkdirSync(join(repoPath, '.claude'));
        writeFileSync(join(repoPath, '.claude', 'AGENTS.md'), 'hand\n');

        // NO commit — git holds no copy, so the drop would be an unrecoverable loss
        await program.parseAsync(['init', '--roles', 'mechanic'], {
          from: 'user',
        });

        expect(exitSpy).toHaveBeenCalledWith(2);
        expect(
          readFileSync(join(repoPath, '.claude', 'AGENTS.md'), 'utf8'),
        ).toEqual('hand\n');
        const errors = errorSpy.mock.calls.map((call) => String(call[0]));
        expect(errors.join('\n')).toContain('git could not hand back');
        // the refusal frame is what a human reads to recover, so its whole render is
        // pinned beside the assert above (`rule.forbid.failhide`)
        expect(
          asMaskedInitReport({ output: errors.join('\n'), repoPath }),
        ).toMatchSnapshot();
      });
    });

    when(
      '[t1] <repo>/.claude and the default dir both hold settings.json',
      () => {
        then(
          'the repo-side copy overwrites the default dir, and the tree names it',
          async () => {
            const repoPath = genRepoForInit({ slug: 'init-overwrite' });
            mkdirSync(join(repoPath, '.claude'));
            writeFileSync(
              join(repoPath, '.claude', 'settings.json'),
              '{"repoSide":true}\n',
            );
            mkdirSync(join(repoPath, DEFAULT_BRAIN_DIR_REL), {
              recursive: true,
            });
            writeFileSync(
              join(repoPath, DEFAULT_BRAIN_DIR_REL, 'settings.json'),
              '{"stale":true}\n',
            );

            await program.parseAsync(['init', '--roles', 'mechanic'], {
              from: 'user',
            });

            // rhachet owns the default brain dir, so a shared name is overwritten rather
            //   than refused — `<repo>/.claude/settings.json` is the copy the role init
            //   just merged permissions into, so it is the live one and it wins
            expect(exitSpy).not.toHaveBeenCalled();
            expect(lstatSync(join(repoPath, '.claude')).isSymbolicLink()).toBe(
              true,
            );
            expect(
              readFileSync(
                join(repoPath, DEFAULT_BRAIN_DIR_REL, 'settings.json'),
                'utf8',
              ),
            ).toContain('"repoSide": true');

            // the overwritten row is marked, so a human knows which file to diff
            const lines = logSpy.mock.calls.map((call) => String(call[0]));
            expect(
              lines.some(
                (line) =>
                  line.includes('.claude/settings.json →') &&
                  line.endsWith('(replaced)'),
              ),
            ).toBe(true);
          },
        );
      },
    );

    when('[t2] <repo>/.claude is a file', () => {
      then('it refuses with exit 2 and names the fix', async () => {
        const repoPath = genRepoForInit({ slug: 'init-claude-file' });
        writeFileSync(join(repoPath, '.claude'), 'not a dir\n');

        // --hooks alone syncs the brain dirs with no role init ahead of it
        await program.parseAsync(['init', '--hooks'], { from: 'user' });

        expect(exitSpy).toHaveBeenCalledWith(2);
        expect(readFileSync(join(repoPath, '.claude'), 'utf8')).toEqual(
          'not a dir\n',
        );
        const errors = errorSpy.mock.calls.map((call) => String(call[0]));
        expect(errors.some((line) => line.includes('└─ hint: move'))).toBe(
          true,
        );
        // the hint is the one span the assert above checks; the frame around it is what
        // a human reads, so it is pinned whole beside it (`rule.forbid.failhide`)
        expect(
          asMaskedInitReport({ output: errors.join('\n'), repoPath }),
        ).toMatchSnapshot();
      });
    });

    when('[t3] a role is subtracted with --roles -mechanic', () => {
      then('the default boot.md no longer carries it', async () => {
        const repoPath = genRepoForInit({ slug: 'init-subtract' });
        await program.parseAsync(['init', '--roles', 'mechanic'], {
          from: 'user',
        });
        const bootBefore = readFileSync(
          join(repoPath, DEFAULT_BRAIN_DIR_REL, 'boot.md'),
          'utf8',
        );
        expect(bootBefore).toContain('repo=ehmpathy/role=mechanic');

        // encode the `-role` sigil as the bin entry does, so commander keeps it
        await program.parseAsync(
          getPreprocessedRoleArgv({ args: ['init', '--roles', '-mechanic'] }),
          { from: 'user' },
        );

        expect(exitSpy).not.toHaveBeenCalled();
        const bootAfter = readFileSync(
          join(repoPath, DEFAULT_BRAIN_DIR_REL, 'boot.md'),
          'utf8',
        );
        expect(bootAfter).not.toContain('repo=ehmpathy/role=mechanic');
      });
    });

    when('[t4] the default render fails and --hooks is passed', () => {
      then(
        'the hook sync is skipped, so no hook lands beside an absent boot.md',
        async () => {
          // a symlink to ANOTHER place is the refusal the gate needs: it is still a dir, so
          //   the role inits ahead of it run clean, and the sync refuses after them — which
          //   is exactly the order that makes a hook land beside an absent boot.md possible
          const repoPath = genRepoForInit({ slug: 'init-gate-hooks' });
          mkdirSync(join(repoPath, 'other'));
          symlinkSync('other', join(repoPath, '.claude'));

          await program.parseAsync(['init', '--roles', 'mechanic', '--hooks'], {
            from: 'user',
          });

          // the refusal fails the default sync, so the exit is the sync's own 2
          expect(exitSpy.mock.calls).toEqual([[2]]);
          // `<repo>/.claude` still resolves to `other/`, which the sync never rendered into
          expect(existsSync(join(repoPath, '.claude', 'boot.md'))).toBe(false);
          const settings = JSON.parse(
            readFileSync(join(repoPath, '.claude', 'settings.json'), 'utf8'),
          ) as { hooks?: unknown };
          expect(settings.hooks).toBeUndefined();
        },
      );
    });
  });
});
