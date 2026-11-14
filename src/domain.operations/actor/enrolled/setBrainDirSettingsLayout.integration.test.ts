import { ConstraintError } from 'helpful-errors';
import { getError, given, then, useBeforeAll, when } from 'test-fns';

import { genSampleHomeWithBrainDir } from '@src/.test/assets/genSampleHomeWithBrainDir';
import { getOneIsPathIgnoredByGit } from '@src/.test/infra/getOneIsPathIgnoredByGit';

import { spawnSync } from 'node:child_process';
import {
  existsSync,
  lstatSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { setBrainDirSettingsLayout } from './setBrainDirSettingsLayout';

const GROVE_CONTENT = `${JSON.stringify({ theme: 'dark', model: 'opus' }, null, 2)}\n`;

/**
 * .what = a temp home (with or without a grove) and an empty brain dir
 */
const genScene = (input: { slug: string; grove: boolean }) =>
  genSampleHomeWithBrainDir({
    slug: input.slug,
    grove: input.grove ? GROVE_CONTENT : null,
  });

/**
 * .what = the names in a brain dir that an earlier layout used to keep a file aside
 */
const asForkedNames = (input: { brainDir: string }): string[] =>
  readdirSync(input.brainDir).filter((name) => name.includes('.forked.'));

describe('setBrainDirSettingsLayout', () => {
  given('[case1] a fresh brain dir on a box with a grove', () => {
    const scene = useBeforeAll(async () => {
      const { repoPath, home, brainDir } = genScene({
        slug: 'layout-fresh',
        grove: true,
      });
      const result = await setBrainDirSettingsLayout({
        repoPath,
        brainDir,
        home,
      });
      return { repoPath, home, brainDir, result };
    });

    when('[t0] the layout is findserted', () => {
      then(
        'settings.of.grove.json points at the .home mirror, by a relative target the same on every box',
        () => {
          expect(
            readlinkSync(join(scene.brainDir, 'settings.of.grove.json')),
          ).toEqual('.home/.claude/settings.json');
        },
      );

      then(
        'the .home mirror is a real dir, and only its leaf points into the home',
        () => {
          expect(lstatSync(join(scene.brainDir, '.home')).isDirectory()).toBe(
            true,
          );
          expect(
            lstatSync(join(scene.brainDir, '.home', '.claude')).isDirectory(),
          ).toBe(true);
          expect(
            readlinkSync(
              join(scene.brainDir, '.home', '.claude', 'settings.json'),
            ),
          ).toEqual(join(scene.home, '.claude', 'settings.json'));
        },
      );

      then('settings.of.grove.json reads the home settings', () => {
        expect(
          readFileSync(join(scene.brainDir, 'settings.of.grove.json'), 'utf8'),
        ).toEqual(GROVE_CONTENT);
      });

      then("claude's settings.json points at settings.of.grove.json", () => {
        expect(readlinkSync(join(scene.brainDir, 'settings.json'))).toEqual(
          'settings.of.grove.json',
        );
        expect(
          readFileSync(join(scene.brainDir, 'settings.json'), 'utf8'),
        ).toEqual(GROVE_CONTENT);
      });

      then('the home settings are byte-identical', () => {
        expect(
          readFileSync(join(scene.home, '.claude', 'settings.json'), 'utf8'),
        ).toEqual(GROVE_CONTENT);
      });

      then(
        'settings.local.json points at settings.of.repo.json, so a plain claude reads the repo',
        () => {
          expect(
            readlinkSync(join(scene.brainDir, 'settings.local.json')),
          ).toEqual('settings.of.repo.json');
        },
      );

      then('four links are reported', () => {
        expect(scene.result.effects).toEqual([
          {
            kind: 'LINKED',
            name: '.home/.claude/settings.json',
            target: join(scene.home, '.claude', 'settings.json'),
          },
          {
            kind: 'LINKED',
            name: 'settings.of.grove.json',
            target: '.home/.claude/settings.json',
          },
          {
            kind: 'LINKED',
            name: 'settings.json',
            target: 'settings.of.grove.json',
          },
          {
            kind: 'LINKED',
            name: 'settings.local.json',
            target: 'settings.of.repo.json',
          },
        ]);
      });

      then('the grove is reported present', () => {
        expect(scene.result.grove.isPresent).toBe(true);
      });

      then(
        'settings.of.repo.json is findserted empty, so a role init always finds it',
        () => {
          expect(
            lstatSync(join(scene.brainDir, 'settings.of.repo.json')).isFile(),
          ).toBe(true);
          expect(
            readFileSync(join(scene.brainDir, 'settings.of.repo.json'), 'utf8'),
          ).toEqual('{}\n');
        },
      );
    });

    when('[t1] the layout is findserted again', () => {
      const rerun = useBeforeAll(async () =>
        setBrainDirSettingsLayout({
          repoPath: scene.repoPath,
          brainDir: scene.brainDir,
          home: scene.home,
        }),
      );

      then('there is no effect', () => {
        expect(rerun.effects).toEqual([]);
      });
    });
  });

  given('[case2] a legacy brain dir with a real settings.json', () => {
    const scene = useBeforeAll(async () => {
      const { repoPath, home, brainDir } = genScene({
        slug: 'layout-legacy',
        grove: true,
      });
      writeFileSync(
        join(brainDir, 'settings.json'),
        JSON.stringify({
          hooks: { SessionStart: [] },
          permissions: { allow: ['Bash(ls)'] },
        }),
      );
      const result = await setBrainDirSettingsLayout({
        repoPath,
        brainDir,
        home,
      });
      return { repoPath, home, brainDir, result };
    });

    when('[t0] the layout is findserted', () => {
      then('the arrow replaces the real file', () => {
        expect(readlinkSync(join(scene.brainDir, 'settings.json'))).toEqual(
          'settings.of.grove.json',
        );
      });

      then(
        'settings.of.repo.json is seeded empty, never from the real file',
        () => {
          expect(
            readFileSync(join(scene.brainDir, 'settings.of.repo.json'), 'utf8'),
          ).toEqual('{}\n');
        },
      );

      then('no copy is kept aside', () => {
        expect(asForkedNames({ brainDir: scene.brainDir })).toEqual([]);
      });

      then(
        'the replace is reported as REPLACED, the fresh arrows as links',
        () => {
          expect(scene.result.effects).toEqual([
            {
              kind: 'LINKED',
              name: '.home/.claude/settings.json',
              target: join(scene.home, '.claude', 'settings.json'),
            },
            {
              kind: 'LINKED',
              name: 'settings.of.grove.json',
              target: '.home/.claude/settings.json',
            },
            {
              kind: 'REPLACED',
              name: 'settings.json',
              target: 'settings.of.grove.json',
            },
            {
              kind: 'LINKED',
              name: 'settings.local.json',
              target: 'settings.of.repo.json',
            },
          ]);
        },
      );
    });
  });

  given(
    '[case3] a role init replaced the arrow with the grove plus its own keys',
    () => {
      const REPO_CONTENT = JSON.stringify({ hooks: { Stop: [] } });
      const scene = useBeforeAll(async () => {
        const { repoPath, home, brainDir } = genScene({
          slug: 'layout-fork',
          grove: true,
        });
        writeFileSync(join(brainDir, 'settings.of.repo.json'), REPO_CONTENT);
        await setBrainDirSettingsLayout({ repoPath, brainDir, home });

        // a role init replaces the arrow with a real file (temp + rename); a plain write
        //   would follow the arrow into the grove instead
        rmSync(join(brainDir, 'settings.json'));
        writeFileSync(
          join(brainDir, 'settings.json'),
          JSON.stringify({
            model: 'opus',
            theme: 'dark',
            permissions: { allow: ['Bash(pwd)'] },
          }),
        );
        const result = await setBrainDirSettingsLayout({
          repoPath,
          brainDir,
          home,
        });
        return { repoPath, home, brainDir, result };
      });

      when('[t0] the layout is findserted', () => {
        then(
          'settings.of.repo.json is byte-identical: one answer, ours',
          () => {
            expect(
              readFileSync(
                join(scene.brainDir, 'settings.of.repo.json'),
                'utf8',
              ),
            ).toEqual(REPO_CONTENT);
          },
        );

        then('the grove is relinked, and the home file is untouched', () => {
          expect(readlinkSync(join(scene.brainDir, 'settings.json'))).toEqual(
            'settings.of.grove.json',
          );
          expect(
            readFileSync(join(scene.home, '.claude', 'settings.json'), 'utf8'),
          ).toEqual(GROVE_CONTENT);
        });

        then('no copy is kept aside', () => {
          expect(asForkedNames({ brainDir: scene.brainDir })).toEqual([]);
        });

        then('only the replace is reported', () => {
          expect(scene.result.effects).toEqual([
            {
              kind: 'REPLACED',
              name: 'settings.json',
              target: 'settings.of.grove.json',
            },
          ]);
        });
      });
    },
  );

  given('[case4] a box with no grove, and arrows from before', () => {
    const scene = useBeforeAll(async () => {
      const first = genScene({ slug: 'layout-no-grove', grove: true });
      await setBrainDirSettingsLayout(first);
      rmSync(join(first.home, '.claude', 'settings.json'));
      const result = await setBrainDirSettingsLayout(first);
      return { ...first, result };
    });

    when('[t0] the layout is findserted', () => {
      then('both grove names are dropped', () => {
        expect(existsSync(join(scene.brainDir, 'settings.json'))).toBe(false);
        expect(
          lstatSync(join(scene.brainDir, 'settings.of.grove.json'), {
            throwIfNoEntry: false,
          }),
        ).toBeUndefined();
      });

      then('no home settings file is created', () => {
        expect(existsSync(join(scene.home, '.claude', 'settings.json'))).toBe(
          false,
        );
      });

      then(
        'the .home leaf is dropped too, so no arrow points at an absent file',
        () => {
          expect(
            lstatSync(
              join(scene.brainDir, '.home', '.claude', 'settings.json'),
              {
                throwIfNoEntry: false,
              },
            ),
          ).toBeUndefined();
        },
      );

      then('each drop is reported', () => {
        expect(scene.result.effects.map((e) => e.kind)).toEqual([
          'UNLINKED',
          'UNLINKED',
          'UNLINKED',
        ]);
      });

      then('the absent grove path rides out, so a caller can name it', () => {
        expect(scene.result.grove).toEqual({
          source: join(scene.home, '.claude', 'settings.json'),
          isPresent: false,
        });
      });
    });
  });

  given('[case4b] a box with no grove, and a real settings.json', () => {
    const scene = useBeforeAll(async () => {
      const { repoPath, home, brainDir } = genScene({
        slug: 'layout-no-grove-real',
        grove: false,
      });
      writeFileSync(join(brainDir, 'settings.json'), '{"theme":"light"}');
      const result = await setBrainDirSettingsLayout({
        repoPath,
        brainDir,
        home,
      });
      return { repoPath, home, brainDir, result };
    });

    when('[t0] the layout is findserted', () => {
      then('the real file is removed, never kept aside', () => {
        expect(
          lstatSync(join(scene.brainDir, 'settings.json'), {
            throwIfNoEntry: false,
          }),
        ).toBeUndefined();
        expect(asForkedNames({ brainDir: scene.brainDir })).toEqual([]);
      });

      then(
        'the removal is reported REMOVED: its content is gone, so it is never silent',
        () => {
          expect(scene.result.effects).toEqual([
            {
              kind: 'LINKED',
              name: 'settings.local.json',
              target: 'settings.of.repo.json',
            },
            { kind: 'REMOVED', name: 'settings.json', reason: 'grove absent' },
          ]);
        },
      );

      then('the local arrow stands without a grove', () => {
        expect(
          readlinkSync(join(scene.brainDir, 'settings.local.json')),
        ).toEqual('settings.of.repo.json');
      });

      then(
        'settings.of.repo.json is seeded empty, never from the real file',
        () => {
          expect(
            readFileSync(join(scene.brainDir, 'settings.of.repo.json'), 'utf8'),
          ).toEqual('{}\n');
        },
      );
    });
  });

  given('[case5] a real file where settings.of.grove.json belongs', () => {
    const scene = useBeforeAll(async () => {
      const { repoPath, home, brainDir } = genScene({
        slug: 'layout-grove-real',
        grove: true,
      });
      writeFileSync(join(brainDir, 'settings.of.grove.json'), '{"stray":true}');
      const result = await setBrainDirSettingsLayout({
        repoPath,
        brainDir,
        home,
      });
      return { repoPath, home, brainDir, result };
    });

    when('[t0] the layout is findserted', () => {
      then('the stray file is replaced by the arrow', () => {
        expect(scene.result.effects[1]).toEqual({
          kind: 'REPLACED',
          name: 'settings.of.grove.json',
          target: '.home/.claude/settings.json',
        });
        expect(
          readlinkSync(join(scene.brainDir, 'settings.of.grove.json')),
        ).toEqual('.home/.claude/settings.json');
      });

      then('no copy is kept aside', () => {
        expect(asForkedNames({ brainDir: scene.brainDir })).toEqual([]);
      });
    });
  });

  given('[case6] a real settings.json, and a grove that is broken json', () => {
    const scene = useBeforeAll(async () => {
      const { repoPath, home, brainDir } = genScene({
        slug: 'layout-grove-broken',
        grove: true,
      });
      writeFileSync(join(home, '.claude', 'settings.json'), '{ "theme": ');
      writeFileSync(
        join(brainDir, 'settings.json'),
        JSON.stringify({ theme: 'dark' }),
      );
      await setBrainDirSettingsLayout({ repoPath, brainDir, home });
      return { repoPath, home, brainDir };
    });

    when('[t0] the layout is findserted', () => {
      then(
        'the arrow replaces the real file: the grove is never parsed',
        () => {
          expect(readlinkSync(join(scene.brainDir, 'settings.json'))).toEqual(
            'settings.of.grove.json',
          );
        },
      );

      then('the home file is byte-identical', () => {
        expect(
          readFileSync(join(scene.home, '.claude', 'settings.json'), 'utf8'),
        ).toEqual('{ "theme": ');
      });

      then(
        'settings.of.repo.json is seeded empty, never from the real file',
        () => {
          expect(
            readFileSync(join(scene.brainDir, 'settings.of.repo.json'), 'utf8'),
          ).toEqual('{}\n');
        },
      );
    });
  });

  given('[case7] fork copies an earlier layout kept aside', () => {
    const FORKED_NAMES = [
      'settings.forked.2026-09-29T15-28-40-006Z.json',
      'settings.forked.2026-09-29T15-28-40-006Z.1a2b3c4d.json',
      'settings.grove.forked.2026-09-28T00-00-00-000Z.json',
    ];
    const scene = useBeforeAll(async () => {
      const { repoPath, home, brainDir } = genScene({
        slug: 'layout-forked-copies',
        grove: true,
      });
      await setBrainDirSettingsLayout({ repoPath, brainDir, home });
      for (const name of FORKED_NAMES)
        writeFileSync(join(brainDir, name), '{"old":true}');
      // a real file in place of the local arrow (a plain write would follow the arrow)
      rmSync(join(brainDir, 'settings.local.json'));
      writeFileSync(join(brainDir, 'settings.local.json'), '{"local":true}');
      const result = await setBrainDirSettingsLayout({
        repoPath,
        brainDir,
        home,
      });
      return { repoPath, home, brainDir, result };
    });

    when('[t0] the layout is findserted', () => {
      then('every fork copy is removed, so no second answer lingers', () => {
        expect(asForkedNames({ brainDir: scene.brainDir })).toEqual([]);
      });

      then(
        'a real settings.local.json is replaced by the arrow: one answer, the repo',
        () => {
          expect(
            readlinkSync(join(scene.brainDir, 'settings.local.json')),
          ).toEqual('settings.of.repo.json');
        },
      );

      then('only the replace is reported, so the loss is never silent', () => {
        expect(scene.result.effects).toEqual([
          {
            kind: 'REPLACED',
            name: 'settings.local.json',
            target: 'settings.of.repo.json',
          },
        ]);
      });
    });
  });

  given(
    '[case8] a role init wrote its allows into settings.of.repo.json',
    () => {
      const REPO_CONTENT = `${JSON.stringify({ permissions: { allow: ['Bash(ls)'] } })}\n`;
      const scene = useBeforeAll(async () => {
        const { repoPath, home, brainDir } = genScene({
          slug: 'layout-repo-extant',
          grove: true,
        });
        await setBrainDirSettingsLayout({ repoPath, brainDir, home });
        writeFileSync(join(brainDir, 'settings.of.repo.json'), REPO_CONTENT);
        const result = await setBrainDirSettingsLayout({
          repoPath,
          brainDir,
          home,
        });
        return { repoPath, home, brainDir, result };
      });

      when('[t0] the layout is findserted again', () => {
        then('the extant settings.of.repo.json is never touched', () => {
          expect(
            readFileSync(join(scene.brainDir, 'settings.of.repo.json'), 'utf8'),
          ).toEqual(REPO_CONTENT);
        });

        then('there is no effect', () => {
          expect(scene.result.effects).toEqual([]);
        });
      });
    },
  );

  given('[case9] settings.of.repo.json is a symlink', () => {
    const scene = useBeforeAll(async () => {
      const { repoPath, home, brainDir } = genScene({
        slug: 'layout-repo-symlink',
        grove: true,
      });
      writeFileSync(join(home, 'elsewhere.json'), '{}');
      symlinkSync(
        join(home, 'elsewhere.json'),
        join(brainDir, 'settings.of.repo.json'),
      );
      writeFileSync(join(brainDir, 'settings.json'), '{"theme":"light"}');
      const error = await getError(
        setBrainDirSettingsLayout({ repoPath, brainDir, home }),
      );
      return { repoPath, home, brainDir, error };
    });

    when('[t0] the layout is findserted', () => {
      then('it refuses loud, and names the symlink', () => {
        expect(scene.error).toBeInstanceOf(ConstraintError);
        expect(scene.error.message).toContain(
          'settings.of.repo.json must be a real file',
        );
        expect(scene.error.message).toContain('a symlink to');
      });

      then('naught is changed: the refusal precedes every write', () => {
        expect(
          lstatSync(
            join(scene.brainDir, 'settings.of.repo.json'),
          ).isSymbolicLink(),
        ).toBe(true);
        expect(
          readFileSync(join(scene.brainDir, 'settings.json'), 'utf8'),
        ).toEqual('{"theme":"light"}');
      });
    });
  });

  given('[case10] the .home mirror dir is a symlink to the home dir', () => {
    const scene = useBeforeAll(async () => {
      const { repoPath, home, brainDir } = genScene({
        slug: 'layout-home-mirror-symlink',
        grove: true,
      });
      symlinkSync(home, join(brainDir, '.home'));
      const error = await getError(
        setBrainDirSettingsLayout({ repoPath, brainDir, home }),
      );
      return { repoPath, home, brainDir, error };
    });

    when('[t0] the layout is findserted', () => {
      then('it refuses loud, and names the symlink', () => {
        expect(scene.error).toBeInstanceOf(ConstraintError);
        expect(scene.error.message).toContain(
          'the .home mirror must hold real dirs',
        );
        expect(scene.error.message).toContain('a symlink to');
      });

      then("the human's home settings survive, a real file, untouched", () => {
        const groveSource = join(scene.home, '.claude', 'settings.json');
        expect(lstatSync(groveSource).isFile()).toBe(true);
        expect(readFileSync(groveSource, 'utf8')).toEqual(GROVE_CONTENT);
      });
    });
  });

  given(
    '[case11] a git repo whose brain dir holds no .gitignore of its own',
    () => {
      // the layout alone, as `rhx roles init` runs it: no later step writes the brain dir's
      //   `.gitignore`, so the mirror must ignore itself or its absolute leaf is stageable
      const scene = useBeforeAll(async () => {
        const { repoPath, home, brainDir } = genScene({
          slug: 'layout-home-mirror-ignored',
          grove: true,
        });
        const gitInit = spawnSync('git', ['init', '-q'], { cwd: repoPath });
        if (gitInit.status !== 0)
          throw new ConstraintError('[case11] needs git to init the repo', {
            stderr: gitInit.stderr?.toString(),
          });
        await setBrainDirSettingsLayout({ repoPath, brainDir, home });
        return { repoPath, brainDir };
      });

      when('[t0] the layout is findserted', () => {
        then('the .home leaf, an absolute home path, is ignored by git', () => {
          expect(
            getOneIsPathIgnoredByGit({
              repo: scene.repoPath,
              path: join(scene.brainDir, '.home', '.claude', 'settings.json'),
            }),
          ).toBe(true);
        });

        then('the tracked arrows are not ignored', () => {
          expect(
            getOneIsPathIgnoredByGit({
              repo: scene.repoPath,
              path: join(scene.brainDir, 'settings.of.grove.json'),
            }),
          ).toBe(false);
        });
      });
    },
  );
});
