import { ConstraintError } from 'helpful-errors';
import { getError, given, then, useBeforeAll, when } from 'test-fns';

import { genSampleHomeWithBrainDir } from '@src/.test/assets/genSampleHomeWithBrainDir';

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
      then('settings.of.grove.json points at the home settings', () => {
        expect(
          readlinkSync(join(scene.brainDir, 'settings.of.grove.json')),
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

      then('two links are reported', () => {
        expect(scene.result.effects.map((e) => e.kind)).toEqual([
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
            name: 'settings.of.grove.json',
            target: join(scene.home, '.claude', 'settings.json'),
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

      then('each drop is reported', () => {
        expect(scene.result.effects.map((e) => e.kind)).toEqual([
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

      then('no row is reported: only an arrow drop is news', () => {
        expect(scene.result.effects).toEqual([]);
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
        expect(scene.result.effects[0]).toEqual({
          kind: 'LINKED',
          name: 'settings.of.grove.json',
          target: join(scene.home, '.claude', 'settings.json'),
        });
        expect(
          readlinkSync(join(scene.brainDir, 'settings.of.grove.json')),
        ).toEqual(join(scene.home, '.claude', 'settings.json'));
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
});
