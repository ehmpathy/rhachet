import { MalfunctionError } from 'helpful-errors';
import {
  genTempDir,
  getError,
  given,
  then,
  useBeforeAll,
  useThen,
  when,
} from 'test-fns';

import { BrainDirOutsideRepoError } from '@src/domain.operations/actor/enrolled/BrainDirOutsideRepoError';
import {
  REPO_ACTOR_DIR_NAME,
  REPO_ACTOR_DIR_NAME_LEGACY,
} from '@src/domain.operations/actor/enrolled/constants';
import { getActorsRootDir } from '@src/domain.operations/actor/enrolled/getActorsRootDir';

import {
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { setRepoActorBrainDirLayout } from './setRepoActorBrainDirLayout';

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
      return { repoPath, home, first, second, settingsRepoAfterFirst };
    });

    when('[t0] the layout is set', () => {
      then('the repo actor brain dir is at its current name', () => {
        expect(scene.first.repoActorBrainDir).toEqual(
          asRepoActorBrainDir({ repoPath: scene.repoPath }),
        );
      });

      then('the repo actor brain dir is a dir', () => {
        expect(lstatSync(scene.first.repoActorBrainDir).isDirectory()).toBe(
          true,
        );
      });

      then('<repo>/.claude is a symlink', () => {
        expect(
          lstatSync(join(scene.repoPath, '.claude')).isSymbolicLink(),
        ).toBe(true);
      });

      then('<repo>/.claude lands at the repo actor brain dir', () => {
        expect(realpathSync(join(scene.repoPath, '.claude'))).toEqual(
          realpathSync(scene.first.repoActorBrainDir),
        );
      });

      then('settings.of.repo.json is a real file', () => {
        expect(
          lstatSync(
            join(scene.first.repoActorBrainDir, 'settings.of.repo.json'),
          ).isFile(),
        ).toBe(true);
      });

      then('settings.of.repo.json holds {}', () => {
        expect(JSON.parse(scene.settingsRepoAfterFirst)).toEqual({});
      });

      then('settings.json is an arrow to settings.of.grove.json', () => {
        expect(
          readlinkSync(join(scene.first.repoActorBrainDir, 'settings.json')),
        ).toEqual('settings.of.grove.json');
      });

      then('settings.of.grove.json is an arrow to the home settings', () => {
        expect(
          readlinkSync(
            join(scene.first.repoActorBrainDir, 'settings.of.grove.json'),
          ),
        ).toEqual(join(scene.home, '.claude', 'settings.json'));
      });

      then('the chain lands at the home settings file', () => {
        expect(
          realpathSync(join(scene.first.repoActorBrainDir, 'settings.json')),
        ).toEqual(realpathSync(join(scene.home, '.claude', 'settings.json')));
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
        return { brainDir, result };
      });

      when('[t0] the layout is set', () => {
        then('settings.of.repo.json is byte-identical', () => {
          expect(
            readFileSync(join(scene.brainDir, 'settings.of.repo.json'), 'utf8'),
          ).toEqual(SETTINGS_REPO);
        });
      });
    },
  );

  given('[case4] a repo whose actors root links outside the repo', () => {
    const scene = useBeforeAll(async () => {
      const { repoPath, home } = genScene({ slug: 'repo-layout-linked-out' });
      process.env.HOME = home;
      const outside = realpathSync(
        genTempDir({ slug: 'repo-layout-linked-out-outside' }),
      );
      const actorsRoot = getActorsRootDir({ repoPath });
      mkdirSync(join(actorsRoot, '..'), { recursive: true });
      symlinkSync(outside, actorsRoot);
      return { repoPath, outside };
    });

    when('[t0] the layout is set', () => {
      const laid = useThen('the layout settles', async () => {
        const error = await getError(
          setRepoActorBrainDirLayout({ repoPath: scene.repoPath }),
        );
        if (!(error instanceof BrainDirOutsideRepoError))
          throw new MalfunctionError(
            'expected the layout to refuse as outside the repo, but it did not',
            { cause: error },
          );
        return { error };
      });

      then('it refuses with BrainDirOutsideRepoError', () => {
        expect(laid.error).toBeInstanceOf(BrainDirOutsideRepoError);
      });

      then('the outside dir stays empty', () => {
        expect(readdirSync(scene.outside)).toEqual([]);
      });

      then(
        'the human reads the header, the path, where it lands, and the fix',
        () => {
          expect(
            JSON.stringify(
              {
                header: laid.error.message.split('\n')[0],
                path: laid.error.metadata?.path,
                landsAt: laid.error.metadata?.landsAt,
                hint: laid.error.metadata?.hint,
              },
              null,
              2,
            )
              .split(scene.outside)
              .join('$OUTSIDE'),
          ).toMatchSnapshot();
        },
      );
    });
  });
});
