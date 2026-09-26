import { MalfunctionError } from 'helpful-errors';
import {
  genTempDir,
  getError,
  given,
  then,
  useBeforeAll,
  when,
} from 'test-fns';

import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { findsertBrainFirstRunState } from './findsertBrainFirstRunState';

const REPO = '/repo';

/**
 * .what = a temp home and an empty brain dir, with the human state written or not
 */
const genScene = (input: { slug: string; human: string | null }) => {
  const dir = genTempDir({ slug: input.slug });
  const home = join(dir, 'home');
  const brainDir = join(dir, 'actor', 'brain', '.claude');
  mkdirSync(home, { recursive: true });
  mkdirSync(brainDir, { recursive: true });
  if (input.human !== null)
    writeFileSync(join(home, '.claude.json'), input.human);
  return { home, brainDir, statePath: join(brainDir, '.claude.json') };
};

const HUMAN_STATE = JSON.stringify({
  hasCompletedOnboarding: true,
  theme: 'dark',
  customApiKeyResponses: { approved: ['key-a'] },
});

describe('findsertBrainFirstRunState', () => {
  given(
    '[case1] no state in the brain dir, and a human who finished first run',
    () => {
      const scene = useBeforeAll(async () =>
        genScene({ slug: 'first-run-fresh', human: HUMAN_STATE }),
      );

      when('[t0] the state is findserted', () => {
        then(
          'the brain dir state is written with the accepted keys and repo trust',
          () => {
            const result = findsertBrainFirstRunState({
              brainDir: scene.brainDir,
              repoPath: REPO,
              home: scene.home,
            });
            expect(result.status).toEqual('written');
            expect(JSON.parse(readFileSync(scene.statePath, 'utf-8'))).toEqual({
              hasCompletedOnboarding: true,
              theme: 'dark',
              customApiKeyResponses: { approved: ['key-a'] },
              projects: { [REPO]: { hasTrustDialogAccepted: true } },
            });
          },
        );
      });

      when('[t1] the state is findserted again', () => {
        then('no write lands — the mtime is unchanged', () => {
          const mtimeBefore = statSync(scene.statePath).mtimeMs;
          const result = findsertBrainFirstRunState({
            brainDir: scene.brainDir,
            repoPath: REPO,
            home: scene.home,
          });
          expect(result.status).toEqual('unchanged');
          expect(statSync(scene.statePath).mtimeMs).toEqual(mtimeBefore);
        });
      });
    },
  );

  given('[case2] no human state file', () => {
    when('[t0] the state is findserted', () => {
      then('only the trust key is written', () => {
        const scene = genScene({ slug: 'first-run-no-human', human: null });
        findsertBrainFirstRunState({
          brainDir: scene.brainDir,
          repoPath: REPO,
          home: scene.home,
        });
        expect(JSON.parse(readFileSync(scene.statePath, 'utf-8'))).toEqual({
          projects: { [REPO]: { hasTrustDialogAccepted: true } },
        });
      });
    });
  });

  given('[case3] an unparseable state file in the brain dir', () => {
    when('[t0] the state is findserted', () => {
      then(
        'a MalfunctionError names the path, and the file is untouched',
        async () => {
          const scene = genScene({
            slug: 'first-run-bad-prior',
            human: HUMAN_STATE,
          });
          writeFileSync(scene.statePath, '{ not json');
          const error = await getError(() =>
            findsertBrainFirstRunState({
              brainDir: scene.brainDir,
              repoPath: REPO,
              home: scene.home,
            }),
          );
          expect(error).toBeInstanceOf(MalfunctionError);
          expect(error.message).toContain(scene.statePath);
          expect(readFileSync(scene.statePath, 'utf-8')).toEqual('{ not json');
        },
      );
    });
  });

  given('[case4] an unparseable human state file', () => {
    when('[t0] the state is findserted', () => {
      then(
        'a MalfunctionError names the human path, and no brain dir state is written',
        async () => {
          const scene = genScene({
            slug: 'first-run-bad-human',
            human: '{ not json',
          });
          const error = await getError(() =>
            findsertBrainFirstRunState({
              brainDir: scene.brainDir,
              repoPath: REPO,
              home: scene.home,
            }),
          );
          expect(error).toBeInstanceOf(MalfunctionError);
          expect(error.message).toContain(join(scene.home, '.claude.json'));
          expect(existsSync(scene.statePath)).toEqual(false);
        },
      );
    });
  });
});
