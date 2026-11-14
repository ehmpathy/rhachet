import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import {
  REPO_ACTOR_DIR_NAME,
  REPO_ACTOR_DIR_NAME_LEGACY,
} from '@src/domain.operations/actor/enrolled/constants';
import { getActorsRootDir } from '@src/domain.operations/actor/enrolled/getActorsRootDir';

import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import {
  setRepoActorBrainDirLayout,
  setRepoActorBrainDirLayoutBeforeInits,
} from './setRepoActorBrainDirLayout';

/**
 * .what = a temp repo and a temp home with a grove; HOME points at the temp home
 * .why = the layout reads HOME for the grove arrow, so the suite must never touch the real one
 */
const genScene = (input: { slug: string }) => {
  const root = realpathSync(genTempDir({ slug: input.slug }));
  const repoPath = join(root, 'repo');
  const home = join(root, 'home');
  mkdirSync(repoPath, { recursive: true });
  mkdirSync(join(home, '.claude'), { recursive: true });
  writeFileSync(join(home, '.claude', 'settings.json'), '{"theme":"dark"}\n');
  return { repoPath, home };
};

/**
 * .what = the repo actor's brain dir, by its current name
 */
const asRepoActorBrainDir = (input: { repoPath: string }): string =>
  join(
    getActorsRootDir({ repoPath: input.repoPath }),
    REPO_ACTOR_DIR_NAME,
    'brain',
    '.claude',
  );

describe('setRepoActorBrainDirLayout', () => {
  const homeBefore = process.env.HOME;
  afterAll(() => {
    process.env.HOME = homeBefore;
  });

  given('[case1] a fresh repo with no actor dir', () => {
    const scene = useBeforeAll(async () => {
      const { repoPath, home } = genScene({ slug: 'repo-layout-fresh' });
      process.env.HOME = home;
      const first = await setRepoActorBrainDirLayout({ repoPath });
      const settingsRepoAfterFirst = readFileSync(
        join(first.repoActorBrainDir, 'settings.of.repo.json'),
        'utf8',
      );
      const second = await setRepoActorBrainDirLayout({ repoPath });
      return { repoPath, first, second, settingsRepoAfterFirst };
    });

    when('[t0] the layout is set', () => {
      then('the repo actor brain dir is at its current name', () => {
        expect(scene.first.repoActorBrainDir).toEqual(
          asRepoActorBrainDir({ repoPath: scene.repoPath }),
        );
        expect(lstatSync(scene.first.repoActorBrainDir).isDirectory()).toBe(
          true,
        );
      });

      then('<repo>/.claude is a symlink to the repo actor brain dir', () => {
        const link = join(scene.repoPath, '.claude');
        expect(lstatSync(link).isSymbolicLink()).toBe(true);
        expect(realpathSync(link)).toEqual(
          realpathSync(scene.first.repoActorBrainDir),
        );
      });

      then(
        'settings.of.repo.json is a real file that holds only the claudeMdExcludes: the home CLAUDE.md and every CLAUDE.local.md, never a repo door',
        () => {
          const path = join(
            scene.first.repoActorBrainDir,
            'settings.of.repo.json',
          );
          expect(lstatSync(path).isFile()).toBe(true);
          expect(JSON.parse(readFileSync(path, 'utf8'))).toEqual({
            claudeMdExcludes: [
              '**/home/*/.claude/CLAUDE.md',
              '**/Users/*/.claude/CLAUDE.md',
              '/root/.claude/CLAUDE.md',
              '/github/home/.claude/CLAUDE.md',
              '**/CLAUDE.local.md',
            ],
          });
        },
      );

      then('the grove arrows are in place', () => {
        expect(
          lstatSync(
            join(scene.first.repoActorBrainDir, 'settings.json'),
          ).isSymbolicLink(),
        ).toBe(true);
        expect(
          lstatSync(
            join(scene.first.repoActorBrainDir, 'settings.of.grove.json'),
          ).isSymbolicLink(),
        ).toBe(true);
      });
    });

    when('[t1] the layout is set again', () => {
      then('it lands on the same brain dir', () => {
        expect(scene.second.repoActorBrainDir).toEqual(
          scene.first.repoActorBrainDir,
        );
      });

      then('no settings effect is reported', () => {
        expect(scene.second.settings.effects).toEqual([]);
      });

      then('settings.of.repo.json is unchanged', () => {
        expect(
          readFileSync(
            join(scene.second.repoActorBrainDir, 'settings.of.repo.json'),
            'utf8',
          ),
        ).toEqual(scene.settingsRepoAfterFirst);
      });
    });
  });

  given('[case2] a repo that holds a legacy repo actor dir', () => {
    const scene = useBeforeAll(async () => {
      const { repoPath, home } = genScene({ slug: 'repo-layout-legacy' });
      process.env.HOME = home;
      const actorsRoot = getActorsRootDir({ repoPath });
      const legacyBrainDir = join(
        actorsRoot,
        REPO_ACTOR_DIR_NAME_LEGACY,
        'brain',
        '.claude',
      );
      mkdirSync(legacyBrainDir, { recursive: true });
      writeFileSync(join(legacyBrainDir, 'AGENTS.md'), '@boot.md\n');
      const result = await setRepoActorBrainDirLayout({ repoPath });
      return { repoPath, actorsRoot, result };
    });

    when('[t0] the layout is set', () => {
      then('the legacy dir is gone', () => {
        expect(
          existsSync(join(scene.actorsRoot, REPO_ACTOR_DIR_NAME_LEGACY)),
        ).toBe(false);
      });

      then('its content now lives under the current name', () => {
        expect(
          readFileSync(
            join(scene.result.repoActorBrainDir, 'AGENTS.md'),
            'utf8',
          ),
        ).toEqual('@boot.md\n');
      });

      then('settings.of.repo.json is findserted in the moved dir', () => {
        expect(
          lstatSync(
            join(scene.result.repoActorBrainDir, 'settings.of.repo.json'),
          ).isFile(),
        ).toBe(true);
      });
    });
  });

  given(
    '[case3] a repo actor brain dir with an extant settings.of.repo.json',
    () => {
      const SETTINGS_REPO = `${JSON.stringify(
        { permissions: { allow: ['Bash(npm run test:*)'] } },
        null,
        2,
      )}\n`;
      const scene = useBeforeAll(async () => {
        const { repoPath, home } = genScene({ slug: 'repo-layout-extant' });
        process.env.HOME = home;
        const brainDir = asRepoActorBrainDir({ repoPath });
        mkdirSync(brainDir, { recursive: true });
        writeFileSync(join(brainDir, 'settings.of.repo.json'), SETTINGS_REPO);
        const result = await setRepoActorBrainDirLayout({ repoPath });
        return { repoPath, brainDir, result };
      });

      when('[t0] the layout is set', () => {
        then(
          'every key it held stays, and only claudeMdExcludes is added',
          () => {
            expect(
              JSON.parse(
                readFileSync(
                  join(scene.brainDir, 'settings.of.repo.json'),
                  'utf8',
                ),
              ),
            ).toEqual({
              ...JSON.parse(SETTINGS_REPO),
              claudeMdExcludes: [
                '**/home/*/.claude/CLAUDE.md',
                '**/Users/*/.claude/CLAUDE.md',
                '/root/.claude/CLAUDE.md',
                '/github/home/.claude/CLAUDE.md',
                '**/CLAUDE.local.md',
              ],
            });
          },
        );
      });

      when('[t1] the layout is set again', () => {
        const again = useBeforeAll(async () => {
          const before = readFileSync(
            join(scene.brainDir, 'settings.of.repo.json'),
            'utf8',
          );
          await setRepoActorBrainDirLayout({
            repoPath: scene.repoPath,
          });
          const after = readFileSync(
            join(scene.brainDir, 'settings.of.repo.json'),
            'utf8',
          );
          return { before, after };
        });
        then('settings.of.repo.json is byte-identical', () => {
          expect(again.after).toEqual(again.before);
        });
      });
    },
  );

  given(
    '[case4] a repo actor settings.of.repo.json with a prior claudeMdExcludes',
    () => {
      // rhachet owns the key: the list is derived, and enroll writes it whole at spawn too,
      //   so a prior entry is replaced, never merged — a merge could never drop a stale one
      const SETTINGS_REPO = `${JSON.stringify(
        {
          permissions: { allow: ['Bash(npm run test:*)'] },
          claudeMdExcludes: ['docs/legacy/CLAUDE.md', '**/CLAUDE.local.md'],
        },
        null,
        2,
      )}\n`;
      const scene = useBeforeAll(async () => {
        const { repoPath, home } = genScene({ slug: 'repo-layout-excludes' });
        process.env.HOME = home;
        const brainDir = asRepoActorBrainDir({ repoPath });
        mkdirSync(brainDir, { recursive: true });
        writeFileSync(join(brainDir, 'settings.of.repo.json'), SETTINGS_REPO);
        const first = await setRepoActorBrainDirLayout({ repoPath });
        const second = await setRepoActorBrainDirLayout({ repoPath });
        return { brainDir, first, second };
      });

      when('[t1] the dropped entries are read', () => {
        then(
          'the hand entry is named; an entry rhachet still derives is not',
          () => {
            // the report reads this list, so a hand exclude is never lost in silence (F14)
            expect(scene.first.excludesDropped).toEqual([
              'docs/legacy/CLAUDE.md',
            ]);
          },
        );

        then(
          'a second layout drops naught — the list is already derived',
          () => {
            expect(scene.second.excludesDropped).toEqual([]);
          },
        );
      });

      when('[t0] the layout is set', () => {
        then(
          'the prior list is replaced whole by the derived one; every other key stays',
          () => {
            expect(
              JSON.parse(
                readFileSync(
                  join(scene.brainDir, 'settings.of.repo.json'),
                  'utf8',
                ),
              ),
            ).toEqual({
              permissions: { allow: ['Bash(npm run test:*)'] },
              claudeMdExcludes: [
                '**/home/*/.claude/CLAUDE.md',
                '**/Users/*/.claude/CLAUDE.md',
                '/root/.claude/CLAUDE.md',
                '/github/home/.claude/CLAUDE.md',
                '**/CLAUDE.local.md',
              ],
            });
          },
        );
      });
    },
  );

  given(
    '[case5] a hand-broken settings.of.repo.json, and a real settings.local.json',
    () => {
      // the excludes step reads the json and faults; the arrows step reads no json. the step
      //   before the role inits must still return what the arrows did, so the replaced file is
      //   reported even though the excludes faulted
      const scene = useBeforeAll(async () => {
        const { repoPath, home } = genScene({
          slug: 'repo-layout-excludes-fault',
        });
        process.env.HOME = home;
        const brainDir = asRepoActorBrainDir({ repoPath });
        mkdirSync(brainDir, { recursive: true });
        writeFileSync(join(brainDir, 'settings.of.repo.json'), '{ not json');
        writeFileSync(
          join(brainDir, 'settings.local.json'),
          '{"permissions":{"allow":["Bash(echo grant)"]}}\n',
        );
        const layout = await setRepoActorBrainDirLayoutBeforeInits({
          repoPath,
        });
        return { layout };
      });

      when('[t0] the layout step before the inits runs', () => {
        then('it returns the arrows outcome, not null', () => {
          expect(scene.layout).not.toBeNull();
        });

        then('the replaced settings.local.json is in that outcome', () => {
          expect(scene.layout?.settings.effects).toContainEqual({
            kind: 'REPLACED',
            name: 'settings.local.json',
            target: 'settings.of.repo.json',
          });
        });
      });
    },
  );

  given(
    '[case6] a real settings.local.json, and a role init that aborts after the layout step',
    () => {
      // the step replaces the human's file before the role inits run. a report deferred to the
      //   boot sync after them is lost to any abort between, so the step names the loss itself,
      //   before it returns — whatever a later step then does
      const scene = useBeforeAll(async () => {
        const { repoPath, home } = genScene({
          slug: 'repo-layout-report-at-step',
        });
        process.env.HOME = home;
        const brainDir = asRepoActorBrainDir({ repoPath });
        mkdirSync(brainDir, { recursive: true });
        writeFileSync(
          join(brainDir, 'settings.local.json'),
          '{"permissions":{"allow":["Bash(echo grant)"]}}\n',
        );
        /**
         * .mock = none: a pass-through spy on console.log, the step's stdout sink. it records and
         *         still prints; its implementation is never replaced
         * .why = the step prints its report through console.log and takes no sink, so the spy is the
         *        only way to read in-process what it printed before the role inits ran
         * .real = the layout, the fs, and the report all run for real
         */
        const logSpy = jest.spyOn(console, 'log');
        try {
          await setRepoActorBrainDirLayoutBeforeInits({ repoPath });
          const stdout = logSpy.mock.calls
            .map((call) => call.join(' '))
            .join('\n');
          return { stdout };
        } finally {
          logSpy.mockRestore();
        }
      });

      when('[t0] the layout step returns, before any role init', () => {
        then('stdout already names the replaced file', () => {
          expect(scene.stdout).toContain(
            '.claude/settings.local.json → settings.of.repo.json — a real file was here; its content is gone',
          );
        });

        then('the report is the repo actor tree, locked to a snapshot', () => {
          expect(scene.stdout).toMatchSnapshot();
        });
      });
    },
  );

  given(
    '[case7] a hand-added claudeMdExcludes entry, before the role inits',
    () => {
      const scene = useBeforeAll(async () => {
        const { repoPath, home } = genScene({
          slug: 'repo-layout-excludes-report',
        });
        process.env.HOME = home;
        const brainDir = asRepoActorBrainDir({ repoPath });
        mkdirSync(brainDir, { recursive: true });
        writeFileSync(
          join(brainDir, 'settings.of.repo.json'),
          '{"claudeMdExcludes":["docs/legacy/CLAUDE.md"]}\n',
        );
        /**
         * .mock = none: a pass-through spy on console.log, the step's stdout sink. it records and
         *         still prints; its implementation is never replaced
         * .why = the step prints its report through console.log and takes no sink, so the spy is the
         *        only way to read in-process what it printed
         * .real = the layout, the excludes write, the fs, and the report all run for real
         */
        const logSpy = jest.spyOn(console, 'log');
        try {
          await setRepoActorBrainDirLayoutBeforeInits({ repoPath });
          const stdout = logSpy.mock.calls
            .map((call) => call.join(' '))
            .join('\n');
          return { stdout };
        } finally {
          logSpy.mockRestore();
        }
      });

      when('[t0] the layout step runs', () => {
        then(
          'stdout names the dropped entry — never a silent loss (F14)',
          () => {
            expect(scene.stdout).toContain('unexcluded');
            expect(scene.stdout).toContain(
              'docs/legacy/CLAUDE.md — a claudeMdExcludes entry rhachet does not derive',
            );
            expect(scene.stdout).toMatchSnapshot();
          },
        );
      });
    },
  );
});
