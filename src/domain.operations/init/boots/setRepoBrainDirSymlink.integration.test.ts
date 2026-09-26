import { ConstraintError } from 'helpful-errors';
import {
  genTempDir,
  getError,
  given,
  then,
  useBeforeAll,
  when,
} from 'test-fns';

import { getBrainOndiskDir } from '@src/domain.operations/actor/enrolled/getBrainOndiskDir';
import { getDefaultActorOndiskDir } from '@src/domain.operations/actor/enrolled/getDefaultActorOndiskDir';

import { execFileSync } from 'node:child_process';
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
import { join, relative } from 'node:path';
import { setRepoBrainDirSymlink } from './setRepoBrainDirSymlink';

/**
 * .what = a fresh git repo and its default brain dir path
 */
const genRepoScene = (input: { slug: string }) => {
  const repoPath = realpathSync(genTempDir({ slug: input.slug, git: true }));
  const defaultBrainDir = getBrainOndiskDir({
    actorDir: getDefaultActorOndiskDir({ repoPath }),
  });
  return { repoPath, defaultBrainDir, linkPath: join(repoPath, '.claude') };
};

/**
 * .what = every path under a dir, with each file's bytes or each link's target
 * .why = a refusal must leave the tree byte-unchanged; a digest compares it whole
 */
const getTreeDigest = (input: { dir: string }): string[] => {
  const walk = (dir: string): string[] =>
    readdirSync(dir)
      .filter((name) => name !== '.git')
      .sort()
      .flatMap((name) => {
        const path = join(dir, name);
        const rel = relative(input.dir, path);
        const stat = lstatSync(path);
        if (stat.isSymbolicLink()) return [`${rel} -> ${readlinkSync(path)}`];
        if (stat.isDirectory()) return [`${rel}/`, ...walk(path)];
        return [`${rel} = ${readFileSync(path, 'utf8')}`];
      });
  return walk(input.dir);
};

/**
 * .what = stage and commit every tracked-eligible path in the repo
 * .why = a boot file is dropped ONLY where git could hand it back, so a case that
 *   asserts a DROP must first put that file where git can reach it. the identity is
 *   passed per-invocation (`-c`), so the test needs no global git config to exist
 */
const commitWholeTree = (input: { repoPath: string }): void => {
  execFileSync('git', ['add', '-A'], { cwd: input.repoPath });
  execFileSync(
    'git',
    [
      '-c',
      'user.email=test@example.com',
      '-c',
      'user.name=test',
      'commit',
      '-q',
      '-m',
      'seed',
    ],
    { cwd: input.repoPath },
  );
};

describe('setRepoBrainDirSymlink', () => {
  given('[case1] <repo>/.claude is absent', () => {
    const scene = useBeforeAll(async () => {
      const repo = genRepoScene({ slug: 'repo-brain-dir-absent' });
      const result = setRepoBrainDirSymlink(repo);
      return { ...repo, result };
    });

    when('[t0] the link is set', () => {
      then('a relative symlink to the default brain dir is created', () => {
        expect(scene.result.effect).toEqual('CREATED');
        expect(readlinkSync(scene.linkPath)).toEqual(
          '.agent/.actors/actor.via.slug=.default/brain/.claude',
        );
        expect(realpathSync(scene.linkPath)).toEqual(
          realpathSync(scene.defaultBrainDir),
        );
      });

      then('the link holds no lead slash', () => {
        expect(readlinkSync(scene.linkPath).startsWith('/')).toBe(false);
      });
    });

    when('[t1] the link is set again', () => {
      const rerun = useBeforeAll(async () =>
        setRepoBrainDirSymlink({
          repoPath: scene.repoPath,
          defaultBrainDir: scene.defaultBrainDir,
        }),
      );

      then('it is unchanged', () => {
        expect(rerun.effect).toEqual('FOUND');
      });
    });
  });

  given(
    '[case2] <repo>/.claude is an absolute symlink to the default brain dir',
    () => {
      const scene = useBeforeAll(async () => {
        const repo = genRepoScene({ slug: 'repo-brain-dir-absolute' });
        mkdirSync(repo.defaultBrainDir, { recursive: true });
        symlinkSync(repo.defaultBrainDir, repo.linkPath);
        const result = setRepoBrainDirSymlink(repo);
        return { ...repo, result };
      });

      when('[t0] the link is set', () => {
        then('it is rewritten relative, to the same dir', () => {
          expect(scene.result.effect).toEqual('REWRITTEN');
          expect(readlinkSync(scene.linkPath).startsWith('/')).toBe(false);
          expect(realpathSync(scene.linkPath)).toEqual(
            realpathSync(scene.defaultBrainDir),
          );
        });
      });
    },
  );

  given(
    '[case3] <repo>/.claude is a relative symlink via another path to the same dir',
    () => {
      const scene = useBeforeAll(async () => {
        const repo = genRepoScene({ slug: 'repo-brain-dir-alt-relative' });
        mkdirSync(repo.defaultBrainDir, { recursive: true });
        const linkTargetAlt =
          './.agent/.actors/../.actors/actor.via.slug=.default/brain/.claude';
        symlinkSync(linkTargetAlt, repo.linkPath);
        const result = setRepoBrainDirSymlink(repo);
        return { ...repo, result, linkTargetAlt };
      });

      when('[t0] the link is set', () => {
        then('it is unchanged, since the realpath matches', () => {
          expect(scene.result.effect).toEqual('FOUND');
          expect(readlinkSync(scene.linkPath)).toEqual(scene.linkTargetAlt);
        });
      });
    },
  );

  given(
    '[case4] <repo>/.claude is a real dir with config and boot files',
    () => {
      const scene = useBeforeAll(async () => {
        const repo = genRepoScene({ slug: 'repo-brain-dir-real' });
        mkdirSync(join(repo.linkPath, 'rules'), { recursive: true });
        writeFileSync(join(repo.linkPath, 'settings.json'), '{"hooks":{}}\n');
        writeFileSync(join(repo.linkPath, 'settings.local.json'), '{"x":1}\n');
        writeFileSync(join(repo.linkPath, 'rules', 'a.md'), 'rule a\n');
        writeFileSync(join(repo.linkPath, 'AGENTS.md'), 'hand agents\n');
        writeFileSync(join(repo.linkPath, 'CLAUDE.md'), 'hand claude\n');
        writeFileSync(join(repo.repoPath, '.gitignore'), '*.local.json\n');
        mkdirSync(repo.defaultBrainDir, { recursive: true });
        writeFileSync(join(repo.defaultBrainDir, 'AGENTS.md'), '@boot.md\n');
        // the boot files are COMMITTED, so their drop is recoverable — which is the
        // one ground S11 rests on, and now the one state a drop proceeds from
        commitWholeTree({ repoPath: repo.repoPath });
        const result = setRepoBrainDirSymlink(repo);
        return { ...repo, result };
      });

      when('[t0] the link is set', () => {
        then('the dir is migrated and replaced by the link', () => {
          expect(scene.result.effect).toEqual('MIGRATED');
          expect(lstatSync(scene.linkPath).isSymbolicLink()).toBe(true);
        });

        then('the boot files are dropped, never moved', () => {
          expect(scene.result.drops).toEqual(['AGENTS.md', 'CLAUDE.md']);
          expect(
            readFileSync(join(scene.defaultBrainDir, 'AGENTS.md'), 'utf8'),
          ).toEqual('@boot.md\n');
          expect(existsSync(join(scene.defaultBrainDir, 'CLAUDE.md'))).toBe(
            false,
          );
        });

        then('every other entry moves into the default brain dir', () => {
          expect(scene.result.moves).toEqual([
            'rules',
            'settings.json',
            'settings.local.json',
          ]);
          expect(
            readFileSync(join(scene.defaultBrainDir, 'settings.json'), 'utf8'),
          ).toEqual('{"hooks":{}}\n');
          expect(
            readFileSync(join(scene.defaultBrainDir, 'rules', 'a.md'), 'utf8'),
          ).toEqual('rule a\n');
        });

        then('settings.local.json stays ignored after the move', () => {
          const relLocal = relative(
            scene.repoPath,
            join(scene.defaultBrainDir, 'settings.local.json'),
          );
          expect(() =>
            execFileSync(
              'git',
              ['check-ignore', '--no-index', '-q', relLocal],
              {
                cwd: scene.repoPath,
              },
            ),
          ).not.toThrow();
        });
      });
    },
  );

  given('[case5] <repo>/.claude is an empty real dir', () => {
    const scene = useBeforeAll(async () => {
      const repo = genRepoScene({ slug: 'repo-brain-dir-empty' });
      mkdirSync(repo.linkPath);
      const result = setRepoBrainDirSymlink(repo);
      return { ...repo, result };
    });

    when('[t0] the link is set', () => {
      then('the dir is replaced by the link', () => {
        expect(scene.result).toEqual({
          effect: 'MIGRATED',
          drops: [],
          moves: [],
          overwrites: [],
        });
        expect(lstatSync(scene.linkPath).isSymbolicLink()).toBe(true);
      });
    });
  });

  /**
   * .what = a name held by BOTH dirs, and a dir entry among them
   * .why = rhachet owns the default brain dir, so a shared name is overwritten rather than
   *   refused: `<repo>/.claude` is the live copy a human and a role's init have just
   *   written, so it is the one that must win. the `rules/` dir is the case a bare
   *   `renameSync` cannot serve — it throws on a non-empty destination dir
   */
  given(
    '[case6] <repo>/.claude and the default brain dir hold the same names',
    () => {
      const scene = useBeforeAll(async () => {
        const repo = genRepoScene({ slug: 'repo-brain-dir-overwrite' });
        mkdirSync(join(repo.linkPath, 'rules'), { recursive: true });
        writeFileSync(join(repo.linkPath, 'settings.json'), '{"src":1}\n');
        writeFileSync(join(repo.linkPath, 'rules', 'a.md'), 'src rule\n');
        writeFileSync(join(repo.linkPath, 'fresh.json'), '{"new":1}\n');
        writeFileSync(join(repo.linkPath, 'AGENTS.md'), 'hand\n');
        mkdirSync(join(repo.defaultBrainDir, 'rules'), { recursive: true });
        writeFileSync(
          join(repo.defaultBrainDir, 'settings.json'),
          '{"dst":1}\n',
        );
        writeFileSync(
          join(repo.defaultBrainDir, 'rules', 'stale.md'),
          'stale rule\n',
        );
        writeFileSync(join(repo.defaultBrainDir, 'AGENTS.md'), '@boot.md\n');
        commitWholeTree({ repoPath: repo.repoPath });
        const result = setRepoBrainDirSymlink(repo);
        return { ...repo, result };
      });

      when('[t0] the link is set', () => {
        then(
          'every entry moves, and the shared ones are named overwrites',
          () => {
            expect(scene.result).toEqual({
              effect: 'MIGRATED',
              drops: ['AGENTS.md'],
              moves: ['fresh.json', 'rules', 'settings.json'],
              overwrites: ['rules', 'settings.json'],
            });
          },
        );

        then('the repo-side copy wins — it is the live one', () => {
          expect(
            readFileSync(join(scene.defaultBrainDir, 'settings.json'), 'utf8'),
          ).toEqual('{"src":1}\n');
        });

        then('an overwritten DIR is replaced whole, never merged', () => {
          // a merge would leave `stale.md` beside `a.md`, so the default dir would hold a
          //   file `<repo>/.claude` never had. the move replaces the dir, so it cannot
          expect(
            readFileSync(join(scene.defaultBrainDir, 'rules', 'a.md'), 'utf8'),
          ).toEqual('src rule\n');
          expect(
            existsSync(join(scene.defaultBrainDir, 'rules', 'stale.md')),
          ).toBe(false);
        });

        then('the link lands, and the real dir is gone', () => {
          expect(lstatSync(scene.linkPath).isSymbolicLink()).toBe(true);
        });
      });
    },
  );

  given('[case7] <repo>/.claude is a symlink elsewhere', () => {
    const scene = useBeforeAll(async () => {
      const repo = genRepoScene({ slug: 'repo-brain-dir-elsewhere' });
      mkdirSync(join(repo.repoPath, 'other'));
      symlinkSync('other', repo.linkPath);
      const error = await getError(async () => setRepoBrainDirSymlink(repo));
      return { ...repo, error };
    });

    when('[t0] the link is set', () => {
      then('it refuses with a ConstraintError, and the link stays', () => {
        expect(scene.error).toBeInstanceOf(ConstraintError);
        expect(scene.error.message).toContain('another place');
        expect(readlinkSync(scene.linkPath)).toEqual('other');
      });
    });
  });

  given('[case8] <repo>/.claude is a file', () => {
    const scene = useBeforeAll(async () => {
      const repo = genRepoScene({ slug: 'repo-brain-dir-file' });
      writeFileSync(repo.linkPath, 'not a dir\n');
      const error = await getError(async () => setRepoBrainDirSymlink(repo));
      return { ...repo, error };
    });

    when('[t0] the link is set', () => {
      then('it refuses with a ConstraintError, and the file stays', () => {
        expect(scene.error).toBeInstanceOf(ConstraintError);
        expect(scene.error.message).toContain('is a file');
        expect(readFileSync(scene.linkPath, 'utf8')).toEqual('not a dir\n');
      });
    });
  });

  given(
    '[case9] a migration cut short: half the moves made, the dir still real',
    () => {
      const scene = useBeforeAll(async () => {
        // the uninterrupted run, for the end state to match
        const whole = genRepoScene({ slug: 'repo-brain-dir-whole' });
        mkdirSync(whole.linkPath);
        writeFileSync(join(whole.linkPath, 'a.json'), 'a\n');
        writeFileSync(join(whole.linkPath, 'b.json'), 'b\n');
        writeFileSync(join(whole.linkPath, 'CLAUDE.md'), 'hand\n');
        commitWholeTree({ repoPath: whole.repoPath });
        setRepoBrainDirSymlink(whole);

        // the interrupted run: CLAUDE.md dropped and a.json moved, b.json left behind
        const cut = genRepoScene({ slug: 'repo-brain-dir-cut' });
        mkdirSync(cut.linkPath);
        writeFileSync(join(cut.linkPath, 'b.json'), 'b\n');
        mkdirSync(cut.defaultBrainDir, { recursive: true });
        writeFileSync(join(cut.defaultBrainDir, 'a.json'), 'a\n');
        const result = setRepoBrainDirSymlink(cut);
        return { whole, cut, result };
      });

      when('[t0] the link is set again', () => {
        then('the re-run converges to the uninterrupted end state', () => {
          expect(scene.result.effect).toEqual('MIGRATED');
          expect(getTreeDigest({ dir: scene.cut.repoPath })).toEqual(
            getTreeDigest({ dir: scene.whole.repoPath }),
          );
        });
      });
    },
  );

  given('[case10] a hand-authored AGENTS.md that git never tracked', () => {
    /**
     * 🚨 the DATA-LOSS case. S11 drops the boot names on the stated ground that "a
     *   tracked drop is recoverable from git" — and that ground was never checked, so an
     *   UNTRACKED hand-authored `AGENTS.md` was deleted outright by a migration a human
     *   ran for an unrelated reason. no prompt, no copy, no way back
     *
     * ⚠️ the tree digest is the sharp assert: a refusal that still deleted the file
     *   would pass a message-only check and lose the human's work all the same
     */
    const scene = useBeforeAll(async () => {
      const repo = genRepoScene({ slug: 'repo-brain-dir-untracked-boot' });
      mkdirSync(repo.linkPath, { recursive: true });
      writeFileSync(join(repo.linkPath, 'settings.json'), '{"hooks":{}}\n');
      writeFileSync(join(repo.linkPath, 'AGENTS.md'), 'hand agents\n');
      // .note = NO commit — the file exists only in the worktree
      // .note = the default brain dir is made up front, as `[case6]` does, so the digest
      //   measures only what the MIGRATION touched — the idempotent mkdir at the top of
      //   the op runs before any check and is no part of the loss this case guards
      mkdirSync(repo.defaultBrainDir, { recursive: true });
      const digestBefore = getTreeDigest({ dir: repo.repoPath });
      const error = await getError(async () => setRepoBrainDirSymlink(repo));
      const digestAfter = getTreeDigest({ dir: repo.repoPath });
      return { ...repo, error, digestBefore, digestAfter };
    });

    when('[t0] the link is set', () => {
      then('it refuses with a ConstraintError that names the file', () => {
        expect(scene.error).toBeInstanceOf(ConstraintError);
        expect(scene.error.message).toContain('AGENTS.md');
      });

      then('the hint names the repair the human must make', () => {
        expect(scene.error.message).toContain('commit or discard');
      });

      then('the tree is byte-unchanged — no drop was made', () => {
        expect(scene.digestAfter).toEqual(scene.digestBefore);
        expect(readFileSync(join(scene.linkPath, 'AGENTS.md'), 'utf8')).toEqual(
          'hand agents\n',
        );
      });
    });
  });

  given('[case11] a committed AGENTS.md that was since edited', () => {
    /**
     * ⚠️ the near-miss of `[case4]`: the file IS tracked, so a naive tracked-or-not check
     *   would drop it — and the EDIT would be gone, since git holds only the committed
     *   bytes. the probe reads dirt as unrestorable, so this refuses too
     */
    const scene = useBeforeAll(async () => {
      const repo = genRepoScene({ slug: 'repo-brain-dir-dirty-boot' });
      mkdirSync(repo.linkPath, { recursive: true });
      writeFileSync(join(repo.linkPath, 'AGENTS.md'), 'committed\n');
      commitWholeTree({ repoPath: repo.repoPath });
      writeFileSync(
        join(repo.linkPath, 'AGENTS.md'),
        'committed, then edited\n',
      );
      const error = await getError(async () => setRepoBrainDirSymlink(repo));
      return { ...repo, error };
    });

    when('[t0] the link is set', () => {
      then('it refuses, and the edit survives', () => {
        expect(scene.error).toBeInstanceOf(ConstraintError);
        expect(scene.error.message).toContain('AGENTS.md');
        expect(readFileSync(join(scene.linkPath, 'AGENTS.md'), 'utf8')).toEqual(
          'committed, then edited\n',
        );
      });
    });
  });

  given('[case12] a <repo>/.claude that .gitignore excludes whole', () => {
    /**
     * 🚨 the likeliest real hit: a repo that gitignores `.claude/` entirely. every file
     *   under it is invisible to `git status` WITHOUT `--ignored`, so a probe that
     *   omitted that flag would read silence as "tracked and clean" and drop the lot
     */
    const scene = useBeforeAll(async () => {
      const repo = genRepoScene({ slug: 'repo-brain-dir-ignored-boot' });
      writeFileSync(join(repo.repoPath, '.gitignore'), '.claude/\n');
      commitWholeTree({ repoPath: repo.repoPath });
      mkdirSync(repo.linkPath, { recursive: true });
      writeFileSync(join(repo.linkPath, 'CLAUDE.md'), 'hand claude\n');
      const error = await getError(async () => setRepoBrainDirSymlink(repo));
      return { ...repo, error };
    });

    when('[t0] the link is set', () => {
      then('it refuses, and the ignored boot file survives', () => {
        expect(scene.error).toBeInstanceOf(ConstraintError);
        expect(scene.error.message).toContain('CLAUDE.md');
        expect(readFileSync(join(scene.linkPath, 'CLAUDE.md'), 'utf8')).toEqual(
          'hand claude\n',
        );
      });
    });
  });
});
