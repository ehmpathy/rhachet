import { MalfunctionError } from 'helpful-errors';
import {
  genTempDir,
  getError,
  given,
  then,
  useBeforeAll,
  when,
} from 'test-fns';

import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { delGitIndexPaths } from './delGitIndexPaths';

/**
 * .what = run one git command in a repo
 */
const runGit = (input: { repo: string; args: string[] }): string =>
  execFileSync('git', input.args, { cwd: input.repo }).toString();

/**
 * .what = the paths git's index holds, repo-relative
 */
const getAllPathsInGitIndex = (input: { repo: string }): string[] =>
  runGit({ repo: input.repo, args: ['ls-files'] })
    .split('\n')
    .filter((line) => line !== '');

/**
 * .what = a git repo with `sub/a.json` and `sub/b.json` committed at HEAD
 */
const genRepoWithTrackedFiles = (input: { slug: string }): string => {
  const repo = realpathSync(genTempDir({ slug: input.slug, git: true }));
  mkdirSync(join(repo, 'sub'), { recursive: true });
  writeFileSync(join(repo, 'sub', 'a.json'), '{}\n');
  writeFileSync(join(repo, 'sub', 'b.json'), '{}\n');
  runGit({ repo, args: ['add', '--force', '--', 'sub'] });
  runGit({
    repo,
    args: [
      '-c',
      'user.name=Test Human',
      '-c',
      'user.email=human@example.com',
      'commit',
      '--quiet',
      '--no-verify',
      '-m',
      'seed',
      '--',
      'sub',
    ],
  });
  return repo;
};

describe('delGitIndexPaths', () => {
  given('[case1] a repo that tracks two files at HEAD', () => {
    when('[t0] one path is untracked', () => {
      const scene = useBeforeAll(async () => {
        const repo = genRepoWithTrackedFiles({ slug: 'del-git-index-one' });
        const result = delGitIndexPaths({
          dir: join(repo, 'sub'),
          pathspecs: ['a.json'],
          recursive: false,
          force: false,
          faultMessage: 'probe',
        });
        return { repo, result };
      });

      then('it returns the removed path, repo-relative', () => {
        expect(scene.result).toEqual({ removed: ['sub/a.json'] });
      });

      then('the index drops it and keeps its peer', () => {
        expect(getAllPathsInGitIndex({ repo: scene.repo })).toEqual([
          'sub/b.json',
        ]);
      });

      then('the file stays on disk', () => {
        expect(existsSync(join(scene.repo, 'sub', 'a.json'))).toBe(true);
      });
    });

    when('[t1] the staged entry differs from both the file and HEAD', () => {
      const scene = useBeforeAll(async () => {
        const repo = genRepoWithTrackedFiles({ slug: 'del-git-index-force' });
        writeFileSync(join(repo, 'sub', 'a.json'), '{"staged":true}\n');
        runGit({ repo, args: ['add', '--', 'sub/a.json'] });
        writeFileSync(join(repo, 'sub', 'a.json'), '{"disk":true}\n');
        const errorUnforced = await getError(async () =>
          delGitIndexPaths({
            dir: join(repo, 'sub'),
            pathspecs: ['a.json'],
            recursive: false,
            force: false,
            faultMessage: 'probe',
          }),
        );
        const result = delGitIndexPaths({
          dir: join(repo, 'sub'),
          pathspecs: ['a.json'],
          recursive: false,
          force: true,
          faultMessage: 'probe',
        });
        return { repo, errorUnforced, result };
      });

      then('unforced, git refuses, and the fault is loud', () => {
        expect(scene.errorUnforced).toBeInstanceOf(MalfunctionError);
        expect(scene.errorUnforced.message).toContain('probe');
      });

      then('forced, the entry is dropped', () => {
        expect(scene.result).toEqual({ removed: ['sub/a.json'] });
        expect(getAllPathsInGitIndex({ repo: scene.repo })).toEqual([
          'sub/b.json',
        ]);
      });
    });

    when(
      '[t2] naught is tracked under the pathspec, and the index lock is held',
      () => {
        const scene = useBeforeAll(async () => {
          const repo = genRepoWithTrackedFiles({ slug: 'del-git-index-lock' });
          const lockPath = join(repo, '.git', 'index.lock');
          writeFileSync(lockPath, '');
          const result = delGitIndexPaths({
            dir: join(repo, 'sub'),
            pathspecs: ['absent.json'],
            recursive: false,
            force: true,
            faultMessage: 'probe',
          });
          rmSync(lockPath, { force: true });
          return { repo, result };
        });

        then('it removes naught and never waits on the lock', () => {
          expect(scene.result).toEqual({ removed: [] });
          expect(getAllPathsInGitIndex({ repo: scene.repo })).toEqual([
            'sub/a.json',
            'sub/b.json',
          ]);
        });
      },
    );

    when('[t3] a path is tracked, and the index lock is held', () => {
      const scene = useBeforeAll(async () => {
        const repo = genRepoWithTrackedFiles({
          slug: 'del-git-index-lock-tracked',
        });
        const lockPath = join(repo, '.git', 'index.lock');
        writeFileSync(lockPath, '');
        const error = await getError(async () =>
          delGitIndexPaths({
            dir: join(repo, 'sub'),
            pathspecs: ['a.json'],
            recursive: false,
            force: true,
            faultMessage: 'probe',
          }),
        );
        rmSync(lockPath, { force: true });
        return { error };
      });

      then('the fault is loud, since the path stays tracked', () => {
        expect(scene.error).toBeInstanceOf(MalfunctionError);
      });
    });
  });

  given('[case2] a dir outside any git repo', () => {
    when('[t0] a path is untracked, under a non-english locale', () => {
      const scene = useBeforeAll(async () => {
        const dir = realpathSync(genTempDir({ slug: 'del-git-index-outside' }));

        // the real git, under a german LANG. the C-locale pin itself is clamped by
        //   asGitEnvInCLocale.test.ts; a host that lacks the de_DE catalog prints english here
        //   either way, so this case proves the real-git path, not the pin
        const envBefore = { LANG: process.env.LANG };
        try {
          process.env.LANG = 'de_DE.UTF-8';
          const result = delGitIndexPaths({
            dir,
            pathspecs: ['a.json'],
            recursive: false,
            force: true,
            faultMessage: 'probe',
          });
          return { result };
        } finally {
          if (envBefore.LANG === undefined) delete process.env.LANG;
          if (envBefore.LANG !== undefined) process.env.LANG = envBefore.LANG;
        }
      });

      then('naught is owed: it returns an empty list', () => {
        expect(scene.result).toEqual({ removed: [] });
      });
    });
  });
});
