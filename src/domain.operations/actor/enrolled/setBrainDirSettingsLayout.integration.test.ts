import { ConstraintError } from 'helpful-errors';
import { getError, given, then, useBeforeAll, when } from 'test-fns';

import { genSampleHomeWithBrainDir } from '@src/.test/assets/genSampleHomeWithBrainDir';

import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
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

const KEYBINDINGS_CONTENT = `${JSON.stringify({ bindings: [{ context: 'Chat', bindings: { 'ctrl+x ctrl+s': null } }] }, null, 2)}\n`;

/**
 * .what = a temp home (with or without a grove, with or without a keybindings file) and an
 *         empty brain dir
 */
const genScene = (input: {
  slug: string;
  grove: boolean;
  keybindings: boolean;
}) =>
  genSampleHomeWithBrainDir({
    slug: input.slug,
    grove: input.grove ? GROVE_CONTENT : null,
    keybindings: input.keybindings ? KEYBINDINGS_CONTENT : null,
  });

/**
 * .what = the layout effects that name a keybindings arrow
 */
const asKeybindingsEffects = (input: {
  effects: Awaited<ReturnType<typeof setBrainDirSettingsLayout>>['effects'];
}) => input.effects.filter((effect) => effect.name.includes('keybindings'));

/**
 * .what = make the home keybindings name a two-link symlink cycle
 * .why = a cycle drives statSync to ELOOP, a fault `throwIfNoEntry: false` never folds into absence
 */
const setKeybindingsSourceLoop = (input: { home: string }): void => {
  symlinkSync(
    join(input.home, '.claude', 'loop.json'),
    join(input.home, '.claude', 'keybindings.json'),
  );
  symlinkSync(
    join(input.home, '.claude', 'keybindings.json'),
    join(input.home, '.claude', 'loop.json'),
  );
};

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
        keybindings: false,
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
        'settings.of.grove.json points at the home link, by a relative path that names no box',
        () => {
          expect(
            readlinkSync(join(scene.brainDir, 'settings.of.grove.json')),
          ).toEqual('.home/.claude/settings.json');
        },
      );

      then('the home link points at the home settings', () => {
        expect(
          readlinkSync(join(scene.brainDir, '.home/.claude/settings.json')),
        ).toEqual(join(scene.home, '.claude', 'settings.json'));
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

      then('three links are reported', () => {
        expect(scene.result.effects.map((e) => e.kind)).toEqual([
          'LINKED',
          'LINKED',
          'LINKED',
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
        keybindings: false,
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

      then('the replace is reported as a link', () => {
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
        ]);
      });
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
          keybindings: false,
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

        then('only the relink is reported', () => {
          expect(scene.result.effects).toEqual([
            {
              kind: 'LINKED',
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
      const first = genScene({
        slug: 'layout-no-grove',
        grove: true,
        keybindings: false,
      });
      await setBrainDirSettingsLayout(first);
      rmSync(join(first.home, '.claude', 'settings.json'));
      const result = await setBrainDirSettingsLayout(first);
      return { ...first, result };
    });

    when('[t0] the layout is findserted', () => {
      then('only the home link is dropped', () => {
        expect(
          lstatSync(join(scene.brainDir, '.home/.claude/settings.json'), {
            throwIfNoEntry: false,
          }),
        ).toBeUndefined();
      });

      then(
        'the tracked arrows stay, so git stays clean, and lead to naught',
        () => {
          expect(readlinkSync(join(scene.brainDir, 'settings.json'))).toEqual(
            'settings.of.grove.json',
          );
          expect(
            readlinkSync(join(scene.brainDir, 'settings.of.grove.json')),
          ).toEqual('.home/.claude/settings.json');
          expect(existsSync(join(scene.brainDir, 'settings.json'))).toBe(false);
        },
      );

      then('no home settings file is created', () => {
        expect(existsSync(join(scene.home, '.claude', 'settings.json'))).toBe(
          false,
        );
      });

      then('the drop is reported', () => {
        expect(scene.result.effects).toEqual([
          {
            kind: 'UNLINKED',
            name: '.home/.claude/settings.json',
            reason: 'grove absent',
          },
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
        keybindings: false,
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
      then('the real file is replaced by the arrow, never kept aside', () => {
        expect(readlinkSync(join(scene.brainDir, 'settings.json'))).toEqual(
          'settings.of.grove.json',
        );
        expect(asForkedNames({ brainDir: scene.brainDir })).toEqual([]);
      });

      then('the two tracked arrows are reported, and no home link', () => {
        expect(scene.result.effects).toEqual([
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
        ]);
      });

      then('no home settings file is created', () => {
        expect(existsSync(join(scene.home, '.claude', 'settings.json'))).toBe(
          false,
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
    });
  });

  given('[case5] a real file where settings.of.grove.json belongs', () => {
    const scene = useBeforeAll(async () => {
      const { repoPath, home, brainDir } = genScene({
        slug: 'layout-grove-real',
        grove: true,
        keybindings: false,
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
        expect(scene.result.effects).toContainEqual({
          kind: 'LINKED',
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

  given(
    '[case5b] a grove arrow a prior release pointed straight at one home',
    () => {
      const scene = useBeforeAll(async () => {
        const { repoPath, home, brainDir } = genScene({
          slug: 'layout-grove-absolute',
          grove: true,
          keybindings: false,
        });
        symlinkSync(
          '/home/fixturehuman/.claude/settings.json',
          join(brainDir, 'settings.of.grove.json'),
        );
        symlinkSync('settings.of.grove.json', join(brainDir, 'settings.json'));
        const result = await setBrainDirSettingsLayout({
          repoPath,
          brainDir,
          home,
        });
        return { repoPath, home, brainDir, result };
      });

      when('[t0] the layout is findserted', () => {
        then(
          'the grove arrow is rewritten in place to the relative home link (#779)',
          () => {
            expect(
              readlinkSync(join(scene.brainDir, 'settings.of.grove.json')),
            ).toEqual('.home/.claude/settings.json');
          },
        );

        then("claude's settings.json reads this box's grove", () => {
          expect(
            readFileSync(join(scene.brainDir, 'settings.json'), 'utf8'),
          ).toEqual(GROVE_CONTENT);
        });

        then('the home link and the rewrite are reported', () => {
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
          ]);
        });
      });
    },
  );

  given('[case6] a real settings.json, and a grove that is broken json', () => {
    const scene = useBeforeAll(async () => {
      const { repoPath, home, brainDir } = genScene({
        slug: 'layout-grove-broken',
        grove: true,
        keybindings: false,
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
        keybindings: false,
      });
      await setBrainDirSettingsLayout({ repoPath, brainDir, home });
      for (const name of FORKED_NAMES)
        writeFileSync(join(brainDir, name), '{"old":true}');
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

      then('a settings file that is not a fork copy stays', () => {
        expect(
          readFileSync(join(scene.brainDir, 'settings.local.json'), 'utf8'),
        ).toEqual('{"local":true}');
      });

      then('the arrows stand as they were, with no effect', () => {
        expect(scene.result.effects).toEqual([]);
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
          keybindings: false,
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
        keybindings: false,
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

  given(
    '[case10] a home with a keybindings file, and a fresh brain dir',
    () => {
      const scene = useBeforeAll(async () => {
        const { repoPath, home, brainDir } = genScene({
          slug: 'layout-keybindings-fresh',
          grove: true,
          keybindings: true,
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
          'keybindings.json points at the home name, by a relative path that names no box',
          () => {
            expect(
              readlinkSync(join(scene.brainDir, 'keybindings.json')),
            ).toEqual('.home/.claude/keybindings.json');
          },
        );

        then('the home name points at the human keybindings file', () => {
          expect(
            readlinkSync(
              join(scene.brainDir, '.home/.claude/keybindings.json'),
            ),
          ).toEqual(join(scene.home, '.claude', 'keybindings.json'));
        });

        then('a read of keybindings.json yields the human bytes', () => {
          expect(
            readFileSync(join(scene.brainDir, 'keybindings.json'), 'utf8'),
          ).toEqual(KEYBINDINGS_CONTENT);
        });

        then('the human keybindings file is byte-identical', () => {
          expect(
            readFileSync(
              join(scene.home, '.claude', 'keybindings.json'),
              'utf8',
            ),
          ).toEqual(KEYBINDINGS_CONTENT);
        });

        then('a link is reported per arrow', () => {
          expect(
            asKeybindingsEffects({ effects: scene.result.effects }),
          ).toEqual([
            {
              kind: 'LINKED',
              name: '.home/.claude/keybindings.json',
              target: join(scene.home, '.claude', 'keybindings.json'),
            },
            {
              kind: 'LINKED',
              name: 'keybindings.json',
              target: '.home/.claude/keybindings.json',
            },
          ]);
        });
      });

      when('[t1] the layout is findserted again', () => {
        const rerun = useBeforeAll(async () =>
          setBrainDirSettingsLayout({
            repoPath: scene.repoPath,
            brainDir: scene.brainDir,
            home: scene.home,
          }),
        );

        then('both arrows stand as they were, with no effect', () => {
          expect(rerun.effects).toEqual([]);
          expect(
            readlinkSync(join(scene.brainDir, 'keybindings.json')),
          ).toEqual('.home/.claude/keybindings.json');
          expect(
            readlinkSync(
              join(scene.brainDir, '.home/.claude/keybindings.json'),
            ),
          ).toEqual(join(scene.home, '.claude', 'keybindings.json'));
        });
      });

      when('[t2] the human edits the keybindings file', () => {
        const edited = useBeforeAll(async () => {
          const content = `${JSON.stringify({ bindings: [] })}\n`;
          writeFileSync(
            join(scene.home, '.claude', 'keybindings.json'),
            content,
          );
          return { content };
        });

        then(
          'a read of keybindings.json yields the new bytes, with no rerun',
          () => {
            expect(
              readFileSync(join(scene.brainDir, 'keybindings.json'), 'utf8'),
            ).toEqual(edited.content);
          },
        );
      });
    },
  );

  given('[case11] a home with no keybindings file', () => {
    const scene = useBeforeAll(async () => {
      const { repoPath, home, brainDir } = genScene({
        slug: 'layout-keybindings-absent',
        grove: true,
        keybindings: false,
      });
      const result = await setBrainDirSettingsLayout({
        repoPath,
        brainDir,
        home,
      });
      return { repoPath, home, brainDir, result };
    });

    when('[t0] the layout is findserted', () => {
      then('neither keybindings name exists', () => {
        expect(
          lstatSync(join(scene.brainDir, 'keybindings.json'), {
            throwIfNoEntry: false,
          }),
        ).toBeUndefined();
        expect(
          lstatSync(join(scene.brainDir, '.home/.claude/keybindings.json'), {
            throwIfNoEntry: false,
          }),
        ).toBeUndefined();
      });

      then('no home keybindings file is created', () => {
        expect(
          existsSync(join(scene.home, '.claude', 'keybindings.json')),
        ).toBe(false);
      });

      then('no keybindings effect is reported', () => {
        expect(asKeybindingsEffects({ effects: scene.result.effects })).toEqual(
          [],
        );
      });
    });
  });

  given('[case12] the keybindings file was removed after a link', () => {
    const scene = useBeforeAll(async () => {
      const first = genScene({
        slug: 'layout-keybindings-removed',
        grove: true,
        keybindings: true,
      });
      await setBrainDirSettingsLayout(first);
      rmSync(join(first.home, '.claude', 'keybindings.json'));
      const result = await setBrainDirSettingsLayout(first);
      return { ...first, result };
    });

    when('[t0] the layout is findserted', () => {
      then('both keybindings arrows are removed', () => {
        expect(
          lstatSync(join(scene.brainDir, 'keybindings.json'), {
            throwIfNoEntry: false,
          }),
        ).toBeUndefined();
        expect(
          lstatSync(join(scene.brainDir, '.home/.claude/keybindings.json'), {
            throwIfNoEntry: false,
          }),
        ).toBeUndefined();
      });

      then('each removal is reported with its reason', () => {
        expect(scene.result.effects).toEqual([
          {
            kind: 'UNLINKED',
            name: '.home/.claude/keybindings.json',
            reason: 'keybindings absent',
          },
          {
            kind: 'UNLINKED',
            name: 'keybindings.json',
            reason: 'keybindings absent',
          },
        ]);
      });
    });
  });

  given(
    '[case13] no keybindings file, and entries a hand left at the top name',
    () => {
      const scene = useBeforeAll(async () => {
        const realFile = genScene({
          slug: 'layout-keybindings-hand-file',
          grove: true,
          keybindings: false,
        });
        writeFileSync(
          join(realFile.brainDir, 'keybindings.json'),
          '{"bindings":[]}',
        );
        const resultRealFile = await setBrainDirSettingsLayout(realFile);

        const foreignArrow = genScene({
          slug: 'layout-keybindings-hand-arrow',
          grove: true,
          keybindings: false,
        });
        writeFileSync(join(foreignArrow.home, 'dotfiles.json'), '{}');
        symlinkSync(
          join(foreignArrow.home, 'dotfiles.json'),
          join(foreignArrow.brainDir, 'keybindings.json'),
        );
        const resultForeignArrow =
          await setBrainDirSettingsLayout(foreignArrow);

        return { realFile, resultRealFile, foreignArrow, resultForeignArrow };
      });

      when('[t0] the layout is findserted', () => {
        then('a real file at the top name stays, byte for byte', () => {
          expect(
            readFileSync(
              join(scene.realFile.brainDir, 'keybindings.json'),
              'utf8',
            ),
          ).toEqual('{"bindings":[]}');
          expect(
            asKeybindingsEffects({ effects: scene.resultRealFile.effects }),
          ).toEqual([]);
        });

        then('an arrow aimed elsewhere at the top name stays', () => {
          expect(
            readlinkSync(join(scene.foreignArrow.brainDir, 'keybindings.json')),
          ).toEqual(join(scene.foreignArrow.home, 'dotfiles.json'));
          expect(
            asKeybindingsEffects({ effects: scene.resultForeignArrow.effects }),
          ).toEqual([]);
        });
      });
    },
  );

  given(
    '[case14] a home keybindings file, and a real file at the top name',
    () => {
      const scene = useBeforeAll(async () => {
        const { repoPath, home, brainDir } = genScene({
          slug: 'layout-keybindings-replace',
          grove: true,
          keybindings: true,
        });
        writeFileSync(join(brainDir, 'keybindings.json'), '{"bindings":[]}');
        const result = await setBrainDirSettingsLayout({
          repoPath,
          brainDir,
          home,
        });
        return { repoPath, home, brainDir, result };
      });

      when('[t0] the layout is findserted', () => {
        then('the real file is replaced by the arrow: one answer', () => {
          expect(
            readlinkSync(join(scene.brainDir, 'keybindings.json')),
          ).toEqual('.home/.claude/keybindings.json');
          expect(
            readFileSync(join(scene.brainDir, 'keybindings.json'), 'utf8'),
          ).toEqual(KEYBINDINGS_CONTENT);
        });
      });
    },
  );

  given('[case15] a home keybindings path that is a dir', () => {
    const scene = useBeforeAll(async () => {
      const { repoPath, home, brainDir } = genScene({
        slug: 'layout-keybindings-dir',
        grove: true,
        keybindings: false,
      });
      mkdirSync(join(home, '.claude', 'keybindings.json'));
      const result = await setBrainDirSettingsLayout({
        repoPath,
        brainDir,
        home,
      });
      return { repoPath, home, brainDir, result };
    });

    when('[t0] the layout is findserted', () => {
      then('no arrow is laid, since claude could not read a dir', () => {
        expect(
          lstatSync(join(scene.brainDir, 'keybindings.json'), {
            throwIfNoEntry: false,
          }),
        ).toBeUndefined();
        expect(asKeybindingsEffects({ effects: scene.result.effects })).toEqual(
          [],
        );
      });
    });
  });

  given('[case16] a home keybindings file, and a dir at the top name', () => {
    const scene = useBeforeAll(async () => {
      const { repoPath, home, brainDir } = genScene({
        slug: 'layout-keybindings-top-dir',
        grove: true,
        keybindings: true,
      });
      mkdirSync(join(brainDir, 'keybindings.json'));
      writeFileSync(join(brainDir, 'keybindings.json', 'stray.json'), '{}');
      const result = await setBrainDirSettingsLayout({
        repoPath,
        brainDir,
        home,
      });
      return { repoPath, home, brainDir, result };
    });

    when('[t0] the layout is findserted', () => {
      then(
        'the dir is replaced by the arrow, which reads the human bytes',
        () => {
          expect(
            readlinkSync(join(scene.brainDir, 'keybindings.json')),
          ).toEqual('.home/.claude/keybindings.json');
          expect(
            readFileSync(join(scene.brainDir, 'keybindings.json'), 'utf8'),
          ).toEqual(KEYBINDINGS_CONTENT);
        },
      );
    });
  });

  given(
    '[case17] a home keybindings path that is a dead link, after a prior link',
    () => {
      const scene = useBeforeAll(async () => {
        const { repoPath, home, brainDir } = genScene({
          slug: 'layout-keybindings-dead-source',
          grove: true,
          keybindings: true,
        });
        await setBrainDirSettingsLayout({ repoPath, brainDir, home });

        // a dotfiles setup whose target went away: the home name is a link to naught
        const source = join(home, '.claude', 'keybindings.json');
        rmSync(source);
        symlinkSync(join(home, 'dotfiles', 'keybindings.json'), source);
        const result = await setBrainDirSettingsLayout({
          repoPath,
          brainDir,
          home,
        });
        return { repoPath, home, brainDir, result };
      });

      when('[t0] the layout is findserted again', () => {
        then('both arrows are removed, as for an absent source', () => {
          expect(
            lstatSync(join(scene.brainDir, 'keybindings.json'), {
              throwIfNoEntry: false,
            }),
          ).toBeUndefined();
          expect(
            lstatSync(
              join(scene.brainDir, '.home', '.claude', 'keybindings.json'),
              { throwIfNoEntry: false },
            ),
          ).toBeUndefined();
          expect(
            asKeybindingsEffects({ effects: scene.result.effects }).map(
              (effect) => effect.kind,
            ),
          ).toEqual(['UNLINKED', 'UNLINKED']);
        });

        then("the human's dead link is left as it was", () => {
          expect(
            readlinkSync(join(scene.home, '.claude', 'keybindings.json')),
          ).toEqual(join(scene.home, 'dotfiles', 'keybindings.json'));
        });
      });
    },
  );

  given(
    '[case18] no home keybindings file, and a stray entry at the home name',
    () => {
      // `.home/` is the layout's own namespace: whatever holds the home name goes
      const pathHomeName = (brainDir: string) =>
        join(brainDir, '.home', '.claude', 'keybindings.json');

      when('[t0] the stray entry is a real file', () => {
        const scene = useBeforeAll(async () => {
          const { repoPath, home, brainDir } = genScene({
            slug: 'layout-keybindings-home-file',
            grove: true,
            keybindings: false,
          });
          mkdirSync(join(brainDir, '.home', '.claude'), { recursive: true });
          writeFileSync(pathHomeName(brainDir), '{"stray":true}');
          const result = await setBrainDirSettingsLayout({
            repoPath,
            brainDir,
            home,
          });
          return { brainDir, result };
        });

        then('the file is removed, with no row: it was no arrow', () => {
          expect(
            lstatSync(pathHomeName(scene.brainDir), { throwIfNoEntry: false }),
          ).toBeUndefined();
          expect(
            asKeybindingsEffects({ effects: scene.result.effects }),
          ).toEqual([]);
        });
      });

      when('[t1] the stray entry is a dir', () => {
        const scene = useBeforeAll(async () => {
          const { repoPath, home, brainDir } = genScene({
            slug: 'layout-keybindings-home-dir',
            grove: true,
            keybindings: false,
          });
          mkdirSync(pathHomeName(brainDir), { recursive: true });
          writeFileSync(join(pathHomeName(brainDir), 'stray.json'), '{}');
          const result = await setBrainDirSettingsLayout({
            repoPath,
            brainDir,
            home,
          });
          return { brainDir, result };
        });

        then('the dir is removed whole, with no row', () => {
          expect(
            lstatSync(pathHomeName(scene.brainDir), { throwIfNoEntry: false }),
          ).toBeUndefined();
          expect(
            asKeybindingsEffects({ effects: scene.result.effects }),
          ).toEqual([]);
        });
      });
    },
  );

  given(
    '[case19] a home keybindings file, and a foreign arrow at the top name',
    () => {
      const scene = useBeforeAll(async () => {
        const { repoPath, home, brainDir } = genScene({
          slug: 'layout-keybindings-top-foreign',
          grove: true,
          keybindings: true,
        });
        writeFileSync(join(home, 'elsewhere.json'), '{"bindings":[]}');
        symlinkSync(
          join(home, 'elsewhere.json'),
          join(brainDir, 'keybindings.json'),
        );
        const result = await setBrainDirSettingsLayout({
          repoPath,
          brainDir,
          home,
        });
        return { home, brainDir, result };
      });

      when('[t0] the layout is findserted', () => {
        then('the foreign arrow is replaced by ours: one answer', () => {
          expect(
            readlinkSync(join(scene.brainDir, 'keybindings.json')),
          ).toEqual('.home/.claude/keybindings.json');
          expect(
            readFileSync(join(scene.brainDir, 'keybindings.json'), 'utf8'),
          ).toEqual(KEYBINDINGS_CONTENT);
        });

        then('the swap is reported as a link', () => {
          expect(
            asKeybindingsEffects({ effects: scene.result.effects }),
          ).toContainEqual({
            kind: 'LINKED',
            name: 'keybindings.json',
            target: '.home/.claude/keybindings.json',
          });
        });

        then('the file the foreign arrow aimed at is left as it was', () => {
          expect(
            readFileSync(join(scene.home, 'elsewhere.json'), 'utf8'),
          ).toEqual('{"bindings":[]}');
        });
      });
    },
  );

  given('[case20] a home keybindings file that is a symlink cycle', () => {
    const scene = useBeforeAll(async () => {
      const { repoPath, home, brainDir } = genScene({
        slug: 'layout-keybindings-source-loop',
        grove: true,
        keybindings: false,
      });
      setKeybindingsSourceLoop({ home });
      return { repoPath, home, brainDir };
    });

    when('[t0] a fresh brain dir is findserted', () => {
      const result = useBeforeAll(async () =>
        setBrainDirSettingsLayout({
          repoPath: scene.repoPath,
          brainDir: scene.brainDir,
          home: scene.home,
        }),
      );

      then(
        'the layout completes: an unreadable optional file never fails enroll',
        () => {
          expect(readlinkSync(join(scene.brainDir, 'settings.json'))).toEqual(
            'settings.of.grove.json',
          );
        },
      );

      then('neither keybindings name is written', () => {
        expect(
          lstatSync(join(scene.brainDir, 'keybindings.json'), {
            throwIfNoEntry: false,
          }),
        ).toBeUndefined();
        expect(
          lstatSync(
            join(scene.brainDir, '.home', '.claude', 'keybindings.json'),
            { throwIfNoEntry: false },
          ),
        ).toBeUndefined();
      });

      then(
        'the result names the source as unreadable, so enroll can say so',
        () => {
          expect(result.keybindings).toEqual({
            source: join(scene.home, '.claude', 'keybindings.json'),
            state: 'unreadable',
          });
        },
      );

      then('there is no keybindings effect: naught of ours was there', () => {
        expect(asKeybindingsEffects({ effects: result.effects })).toEqual([]);
      });
    });
  });

  given(
    '[case21] a home keybindings file laid, then turned into a symlink cycle',
    () => {
      const scene = useBeforeAll(async () => {
        const { repoPath, home, brainDir } = genScene({
          slug: 'layout-keybindings-source-turned-loop',
          grove: true,
          keybindings: true,
        });
        await setBrainDirSettingsLayout({ repoPath, brainDir, home });
        rmSync(join(home, '.claude', 'keybindings.json'));
        setKeybindingsSourceLoop({ home });
        const result = await setBrainDirSettingsLayout({
          repoPath,
          brainDir,
          home,
        });
        return { brainDir, result };
      });

      when('[t0] the layout is findserted again', () => {
        then('both arrows of ours are removed', () => {
          expect(
            lstatSync(join(scene.brainDir, 'keybindings.json'), {
              throwIfNoEntry: false,
            }),
          ).toBeUndefined();
          expect(
            lstatSync(
              join(scene.brainDir, '.home', '.claude', 'keybindings.json'),
              { throwIfNoEntry: false },
            ),
          ).toBeUndefined();
        });

        then('each removal names the source as unreadable', () => {
          expect(
            asKeybindingsEffects({ effects: scene.result.effects }),
          ).toEqual([
            {
              kind: 'UNLINKED',
              name: '.home/.claude/keybindings.json',
              reason: 'keybindings unreadable',
            },
            {
              kind: 'UNLINKED',
              name: 'keybindings.json',
              reason: 'keybindings unreadable',
            },
          ]);
        });
      });
    },
  );

  given(
    '[case22] a home keybindings file that is a live link to a dotfiles repo',
    () => {
      const scene = useBeforeAll(async () => {
        const { repoPath, home, brainDir } = genScene({
          slug: 'layout-keybindings-source-dotfiles',
          grove: true,
          keybindings: false,
        });
        // the stow shape: the home name is a link to a real file kept elsewhere
        mkdirSync(join(home, 'dotfiles'), { recursive: true });
        writeFileSync(
          join(home, 'dotfiles', 'keybindings.json'),
          KEYBINDINGS_CONTENT,
        );
        symlinkSync(
          join(home, 'dotfiles', 'keybindings.json'),
          join(home, '.claude', 'keybindings.json'),
        );
        await setBrainDirSettingsLayout({ repoPath, brainDir, home });
        return { home, brainDir };
      });

      when('[t0] the layout is findserted', () => {
        then(
          'the home name aims at the home path, never the resolved dotfiles path',
          () => {
            expect(
              readlinkSync(
                join(scene.brainDir, '.home', '.claude', 'keybindings.json'),
              ),
            ).toEqual(join(scene.home, '.claude', 'keybindings.json'));
          },
        );

        then('the top name reads the dotfiles bytes through both links', () => {
          expect(
            readFileSync(join(scene.brainDir, 'keybindings.json'), 'utf8'),
          ).toEqual(KEYBINDINGS_CONTENT);
        });
      });
    },
  );

  given(
    '[case23] a home keybindings file, and a real file at the home name',
    () => {
      const scene = useBeforeAll(async () => {
        const { repoPath, home, brainDir } = genScene({
          slug: 'layout-keybindings-home-name-real',
          grove: true,
          keybindings: true,
        });
        // `.home/` is the layout's own; a real file there is a stray, never a hand's keymap
        mkdirSync(join(brainDir, '.home', '.claude'), { recursive: true });
        writeFileSync(
          join(brainDir, '.home', '.claude', 'keybindings.json'),
          '{"bindings":[]}',
        );
        await setBrainDirSettingsLayout({ repoPath, brainDir, home });
        return { home, brainDir };
      });

      when('[t0] the layout is findserted', () => {
        then('the real file at the home name is replaced by our arrow', () => {
          expect(
            readlinkSync(
              join(scene.brainDir, '.home', '.claude', 'keybindings.json'),
            ),
          ).toEqual(join(scene.home, '.claude', 'keybindings.json'));
        });

        then('the top name reads the home bytes', () => {
          expect(
            readFileSync(join(scene.brainDir, 'keybindings.json'), 'utf8'),
          ).toEqual(KEYBINDINGS_CONTENT);
        });
      });
    },
  );

  given('[case24] a home whose `.claude` is a file, not a dir', () => {
    // statSync folds ENOTDIR (a file as a parent component) into absence
    //   (`define.statsync-and-lstatsync-suppress-different-errnos`); this pins it for our probe
    const scene = useBeforeAll(async () => {
      const { repoPath, home, brainDir } = genScene({
        slug: 'layout-keybindings-home-claude-is-a-file',
        grove: false,
        keybindings: false,
      });
      rmSync(join(home, '.claude'), { recursive: true, force: true });
      writeFileSync(join(home, '.claude'), 'a file where a dir would sit');
      const result = await setBrainDirSettingsLayout({
        repoPath,
        brainDir,
        home,
      });
      return { home, brainDir, result };
    });

    when('[t0] a fresh brain dir is findserted', () => {
      then('the layout completes and names the source absent', () => {
        expect(scene.result.keybindings.state).toEqual('absent');
      });

      then('neither keybindings name is written', () => {
        expect(
          lstatSync(join(scene.brainDir, 'keybindings.json'), {
            throwIfNoEntry: false,
          }),
        ).toBeUndefined();
      });
    });
  });

  given(
    '[case25] a home keybindings file that this process may not read',
    () => {
      // stat needs no read permission on the file, so mode 000 stats as a file. the oracle is an
      //   open, never the probe: a root host reads through mode bits, so there the file IS
      //   readable and the layout must lay the arrows; elsewhere it must not
      const scene = useBeforeAll(async () => {
        const { repoPath, home, brainDir } = genScene({
          slug: 'layout-keybindings-source-denied',
          grove: true,
          keybindings: true,
        });
        const source = join(home, '.claude', 'keybindings.json');
        chmodSync(source, 0o000);
        const isReadableByThisProcess = (() => {
          try {
            readFileSync(source);
            return true;
          } catch (error) {
            // by shape, never `instanceof`: a node fs error may come from another realm
            if (
              typeof error !== 'object' ||
              error === null ||
              !('code' in error)
            )
              throw error;
            if (error.code !== 'EACCES') throw error;
            return false;
          }
        })();
        const result = await setBrainDirSettingsLayout({
          repoPath,
          brainDir,
          home,
        });
        chmodSync(source, 0o644);
        return { brainDir, result, isReadableByThisProcess };
      });

      when('[t0] a fresh brain dir is findserted', () => {
        then('the state matches what an open of the file can do', () => {
          expect(scene.result.keybindings.state).toEqual(
            scene.isReadableByThisProcess ? 'file' : 'unreadable',
          );
        });

        then('the top arrow is laid only when the file can be read', () => {
          expect(
            lstatSync(join(scene.brainDir, 'keybindings.json'), {
              throwIfNoEntry: false,
            })?.isSymbolicLink() ?? false,
          ).toEqual(scene.isReadableByThisProcess);
        });
      });
    },
  );
});
