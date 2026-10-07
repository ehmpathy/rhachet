import { Command } from 'commander';
import { getError, given, then, useThen, when } from 'test-fns';

import { genSampleFileTree } from '@src/.test/assets/genSampleFileTree';
import { asLogLines } from '@src/.test/infra/asLogLines';
import { getOneGitRepoRootSync } from '@src/infra/git/getOneGitRepoRootSync';

import { mkdirSync, rmSync } from 'node:fs';
import { basename, dirname, relative, resolve } from 'node:path';
import { invokeRolesBoot } from './invokeRolesBoot';

/**
 * .what = clamps `roles boot --what`
 * .why = requirement 1 demands SCHEMA PARITY with a role default, and requirement 5
 *        demands an absent or unreachable path fail loud. both are caller-visible.
 */
describe('invokeRolesBoot --what (integration)', () => {
  /**
   * 🔴 .what = the alias clamp — `--manifest` names the same option as `--what`
   * .why = they are ONE commander option with two flag names, so a rename of either would
   *        silently drop the other. this case is what makes that a red test rather than a
   *        broken invocation a caller discovers (`rule.require.clamp-edge-cases`).
   */
  const flagsBoth = ['--what', '--manifest'] as const;

  const testDir = resolve(__dirname, './.temp/invokeRolesBoot.manifest');
  const routeDir = resolve(testDir, '.behavior/v2026_09_17.demo');
  const nestedDir = resolve(testDir, 'deep/nested');
  const originalCwd = process.cwd();

  /**
   * .what = the label the payload MUST carry for `0.wish.md`, taken from the repo root
   * .why = the contract is *repo-root*-relative, and this fixture deliberately sits in a
   *        SUBDIRECTORY of the repo — so a cwd anchor and a repo-root anchor differ here.
   *        it is derived rather than hardcoded, so the clamp holds wherever the worktree sits.
   */
  const labelOf = (file: string): string =>
    relative(
      getOneGitRepoRootSync({ from: testDir }) ?? testDir,
      resolve(routeDir, file),
    );
  const labelWish = labelOf('0.wish.md');
  const labelCriteria = labelOf('2.criteria.md');

  /**
   * .what = the two lines a ref block spends on one path — its hoisted base, and the name
   * .why = a ref is no longer one self-contained tag. the base is emitted once for the whole
   *        set and each line carries the name alone, so a clamp on the old per-line form
   *        would grade a shape the renderer no longer emits (`asBootRefBlock`).
   */
  const asRefBlockLines = (label: string): [string, string] => [
    `<briefs.ref base="${dirname(label)}/">`,
    basename(label),
  ];

  beforeAll(() => {
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(routeDir, { recursive: true });
    mkdirSync(nestedDir, { recursive: true });
    process.chdir(testDir);

    // the worked manifest shape: the docs sit DIRECTLY BESIDE the manifest,
    // under no `briefs/` subdir at all
    genSampleFileTree({
      dir: routeDir,
      files: {
        '0.wish.md': '# the wish\nboot from a declared manifest',
        '1.vision.yield.md': '# the vision\nthe wish, executed',
        '2.criteria.md': '# the criteria\nheld at ref, never resident',
        'boot.yml': [
          'always:',
          '  briefs:',
          "    say: ['0.wish.md', '1.vision.yield.md']",
          "    ref: ['2.criteria.md']",
          '',
        ].join('\n'),
      },
    });
  });

  afterAll(() => {
    process.chdir(originalCwd);
    rmSync(testDir, { recursive: true, force: true });
  });

  const rolesCommand = new Command('roles');
  const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

  beforeEach(() => {
    logSpy.mockClear();
  });

  invokeRolesBoot({ command: rolesCommand });

  given('[case0] the same spec, named by EITHER flag', () => {
    for (const flag of flagsBoth) {
      when(`[t0] the boot is run with ${flag}`, () => {
        then('it renders the same payload', async () => {
          // 🔴 the clamp is ONE `then` per flag, over one spec. a rename of either name
          //    reddens exactly one of the two, which names the defect without ambiguity
          await rolesCommand.parseAsync(
            ['boot', flag, '.behavior/v2026_09_17.demo/boot.yml'],
            { from: 'user' },
          );

          expect(asLogLines(logSpy)).toContainEqual(
            expect.stringContaining('boot from a declared manifest'),
          );
        });
      });
    }
  });

  given('[case1] a manifest whose docs sit directly beside it', () => {
    when('[t0] the boot is run against it', () => {
      /**
       * 🔴 ONE boot, observed once — every `then` below reads its lines
       *   (`rule.forbid.redundant-expensive-operations`).
       *
       * .note = the lines are captured HERE rather than read per `then`, because the suite's
       *   `beforeEach` clears the spy — a later read would see an EMPTY buffer, and the two
       *   NEGATIVE assertions below (`not.toContainEqual`) would then pass vacuously
       *   (`rule.forbid.failhide`).
       */
      const boot = useThen('it renders', async () => {
        await rolesCommand.parseAsync(
          ['boot', '--what', '.behavior/v2026_09_17.demo/boot.yml'],
          { from: 'user' },
        );
        return { lines: asLogLines(logSpy) };
      });

      then('it says the two say briefs in full', () => {
        // 🔴 a route dir has no `briefs/` subdir, so a strict structural parity
        //    would put these files in NO universe and the payload would render empty
        expect(boot.lines).toContainEqual(
          expect.stringContaining('boot from a declared manifest'),
        );
        expect(boot.lines).toContainEqual(
          expect.stringContaining('the wish, executed'),
        );
      });

      then('it labels each resource by a real repo-root-relative path', () => {
        // a manifest has no repo=/role= coordinates, so it takes no synthetic
        // prefix. the path a reader sees is a path a reader can open
        expect(boot.lines).toContainEqual(`<brief.say path="${labelWish}">`);
        expect(boot.lines).not.toContainEqual(
          expect.stringContaining('.agent/repo='),
        );
      });

      then('it refs the ref brief by path, never by content', () => {
        for (const line of asRefBlockLines(labelCriteria))
          expect(boot.lines).toContainEqual(line);
        expect(boot.lines).not.toContainEqual(
          expect.stringContaining('held at ref, never resident'),
        );
      });

      then('it reports the say/ref split in stats', () => {
        expect(boot.lines).toContainEqual('<stats>');
        expect(boot.lines).toContainEqual(expect.stringContaining('say = 2'));
        expect(boot.lines).toContainEqual(expect.stringContaining('ref = 1'));
      });
    });
  });

  given('[case2] a --what path that points at no file', () => {
    when('[t0] the boot is run', () => {
      then('it fails loud, and names the path', async () => {
        const error = await getError(
          rolesCommand.parseAsync(
            ['boot', '--what', '.behavior/v2026_09_17.demo/typo.yml'],
            { from: 'user' },
          ),
        );

        // requirement 5 — an explicit path that points at no file is a caller defect.
        // it must NEVER render an empty payload in silence
        expect(error.message).toContain('--what points at no file');
        expect(JSON.stringify(error)).toContain('typo.yml');
      });
    });
  });

  given('[case3] a --what alongside --role', () => {
    when('[t0] the boot is run', () => {
      then('it refuses — a boot takes its spec from ONE place', async () => {
        const error = await getError(
          rolesCommand.parseAsync(
            [
              'boot',
              '--what',
              '.behavior/v2026_09_17.demo/boot.yml',
              '--role',
              'any',
            ],
            { from: 'user' },
          ),
        );

        expect(error.message).toContain(
          '--what cannot be used with --role/--repo',
        );
      });
    });
  });

  given('[case4] a --what alongside --if-present', () => {
    when('[t0] the boot is run', () => {
      then('it refuses — tolerance would hide a typo', async () => {
        const error = await getError(
          rolesCommand.parseAsync(
            [
              'boot',
              '--what',
              '.behavior/v2026_09_17.demo/boot.yml',
              '--if-present',
            ],
            { from: 'user' },
          ),
        );

        // --if-present exists to tolerate a role that is not linked HERE. a manifest is
        // one path the caller chose, so tolerance converts a typo into an empty boot
        expect(error.message).toContain(
          '--what cannot be used with --if-present',
        );
      });
    });
  });

  given('[case5] a --what that reaches outside the repo', () => {
    when('[t0] the boot is run', () => {
      then('it refuses at the repo boundary', async () => {
        const error = await getError(
          rolesCommand.parseAsync(
            ['boot', '--what', '/outside-the-repo/boot.yml'],
            { from: 'user' },
          ),
        );

        // the same boundary cpsafe / rmsafe / teesafe already hold — and the refusal
        // must precede the existence check, or the error names the wrong defect
        expect(error.message).toContain('--what reaches outside the repo');
      });
    });
  });

  given('[case6] a --what path that points at a DIRECTORY', () => {
    when('[t0] the boot is run', () => {
      then('it refuses, and says what it found', async () => {
        const error = await getError(
          rolesCommand.parseAsync(
            ['boot', '--what', '.behavior/v2026_09_17.demo'],
            { from: 'user' },
          ),
        );

        // 🔴 a directory passes `existsSync`, so this case needs its own guard: a
        //    directory path is a caller-fixable input, and must exit 2 rather than die
        //    on an unclassified filesystem error at exit 1
        expect(error.message).toContain('--what points at no file');
        expect(JSON.stringify(error)).toContain('a directory');
      });
    });
  });

  given('[case7] the SAME manifest, booted from a nested subdirectory', () => {
    /**
     * .what = the boot run from a nested subdirectory — resource labels stay
     *   repo-root-relative regardless of the caller's cwd
     * .why = a cwd anchor would make the payload a function of the invocation directory
     *   (`rule.forbid.order-dependence`).
     */
    when('[t0] the boot is run from two levels down', () => {
      then('it labels resources exactly as it did from the root', async () => {
        process.chdir(nestedDir);
        try {
          await rolesCommand.parseAsync(
            ['boot', '--what', '../../.behavior/v2026_09_17.demo/boot.yml'],
            { from: 'user' },
          );
        } finally {
          process.chdir(testDir);
        }

        const lines = asLogLines(logSpy);

        // identical to `[case1]` — the label does not move with the caller
        expect(lines).toContainEqual(`<brief.say path="${labelWish}">`);
        for (const line of asRefBlockLines(labelCriteria))
          expect(lines).toContainEqual(line);

        // and it carries no `..` — a label a reader cannot open from the repo root.
        // both anchors are graded: the say tag's `path=`, and the ref block's `base=`
        expect(lines).not.toContainEqual(expect.stringContaining('path="../'));
        expect(lines).not.toContainEqual(expect.stringContaining('base="../'));
      });
    });
  });
});
