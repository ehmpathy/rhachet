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

      then('settings.of.repo.json is a real file that holds {}', () => {
        const path = join(
          scene.first.repoActorBrainDir,
          'settings.of.repo.json',
        );
        expect(lstatSync(path).isFile()).toBe(true);
        expect(JSON.parse(readFileSync(path, 'utf8'))).toEqual({});
      });

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
});
