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

import { getOneIsPathIgnoredByGit } from '@src/.test/infra/getOneIsPathIgnoredByGit';

import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import {
  AGENT_ACTORS_GITIGNORE_CONTENT,
  AGENT_EPHEMERAL_GITIGNORE_CONTENT,
  findsertAgentEphemeralGitignore,
} from './findsertAgentEphemeralGitignore';

/**
 * .what = the records a bare enroll writes into the repo actor dir, outside its brain dir
 * .note = claude's own runtime state lands inside `brain/.claude/`, where that dir's own
 *   allowlist `.gitignore` ignores it (`setRepoActorBrainDir`)
 */
const REPO_ACTOR_RUNTIME_FILES = [
  'actor.json',
  'roles/enrollment.jsonl',
  'clones/serial=abc/identity.json',
];

describe('findsertAgentEphemeralGitignore', () => {
  const testDir = resolve(__dirname, './.temp/findsertAgentEphemeralGitignore');
  const ephemeralDir = resolve(testDir, '.agent/.actors');
  const originalCwd = process.cwd();

  beforeAll(() => {
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(testDir, { recursive: true });
    process.chdir(testDir);
  });

  afterAll(() => {
    process.chdir(originalCwd);
    rmSync(testDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    rmSync(ephemeralDir, { recursive: true, force: true });
  });

  given('[case1] dir does not exist yet', () => {
    when('[t0] findsertAgentEphemeralGitignore called for .actors', () => {
      then(
        'creates the anchored self-ignore that spares the default dir',
        () => {
          const result = findsertAgentEphemeralGitignore({
            dir: ephemeralDir,
            kind: 'actors',
          });

          expect(result.status).toEqual('created');

          const content = readFileSync(
            resolve(ephemeralDir, '.gitignore'),
            'utf8',
          );
          expect(content).toEqual(AGENT_ACTORS_GITIGNORE_CONTENT);
          expect(content).toContain('\n/*\n');
          expect(content).toContain('\n!/.gitignore\n');
          expect(content).toContain('\n!/actor.via.repo=ambient/\n');
          expect(content).toContain(
            '\n!/actor.via.repo=ambient/brain/.claude/\n',
          );
        },
      );
    });
  });

  given('[case2] .gitignore exists with correct content', () => {
    beforeEach(() => {
      mkdirSync(ephemeralDir, { recursive: true });
      writeFileSync(
        resolve(ephemeralDir, '.gitignore'),
        AGENT_ACTORS_GITIGNORE_CONTENT,
        'utf8',
      );
    });

    when('[t0] findsertAgentEphemeralGitignore called', () => {
      then('returns unchanged, no modification', () => {
        const result = findsertAgentEphemeralGitignore({
          dir: ephemeralDir,
          kind: 'actors',
        });

        expect(result.status).toEqual('unchanged');
      });
    });
  });

  given(
    '[case3] .gitignore exists with prior content (the pre-release `*`)',
    () => {
      beforeEach(() => {
        mkdirSync(ephemeralDir, { recursive: true });
        writeFileSync(
          resolve(ephemeralDir, '.gitignore'),
          AGENT_EPHEMERAL_GITIGNORE_CONTENT,
          'utf8',
        );
      });

      when('[t0] findsertAgentEphemeralGitignore called for .actors', () => {
        then('overwrites with the .actors content, status=updated', () => {
          const result = findsertAgentEphemeralGitignore({
            dir: ephemeralDir,
            kind: 'actors',
          });

          expect(result.status).toEqual('updated');

          const content = readFileSync(
            resolve(ephemeralDir, '.gitignore'),
            'utf8',
          );
          expect(content).toEqual(AGENT_ACTORS_GITIGNORE_CONTENT);
        });
      });
    },
  );

  given('[case4] the .cache ephemeral dir', () => {
    beforeEach(() => {
      const cacheDir = resolve(testDir, '.agent/.cache');
      rmSync(cacheDir, { recursive: true, force: true });
    });

    when('[t0] called for the .cache ephemeral dir', () => {
      then('creates the dir + its plain self-ignore', () => {
        const cacheDir = resolve(testDir, '.agent/.cache');
        const result = findsertAgentEphemeralGitignore({
          dir: cacheDir,
          kind: 'cache',
        });

        expect(result.status).toEqual('created');
        expect(readFileSync(resolve(cacheDir, '.gitignore'), 'utf8')).toEqual(
          AGENT_EPHEMERAL_GITIGNORE_CONTENT,
        );
      });
    });
  });

  given('[case5] a git repo that tracks files in two actor dirs', () => {
    // the create-time untrack must spare the default dir, and only it
    const scene = useBeforeAll(async () => {
      const repo = genTempDir({ slug: 'ephemeral-gitignore-spare', git: true });
      const actorsDir = join(repo, '.agent', '.actors');
      const defaultFile = join(
        actorsDir,
        'actor.via.repo=ambient',
        'brain',
        '.claude',
        'keep.md',
      );
      const hashFile = join(actorsDir, 'actor.via.hash=abc12345', 'drop.md');
      mkdirSync(join(defaultFile, '..'), { recursive: true });
      mkdirSync(join(hashFile, '..'), { recursive: true });
      writeFileSync(defaultFile, 'keep\n', 'utf8');
      writeFileSync(hashFile, 'drop\n', 'utf8');
      execFileSync('git', ['add', '-A'], { cwd: repo });

      // the repo actor's runtime records, as a bare enroll writes them (never added)
      for (const file of REPO_ACTOR_RUNTIME_FILES) {
        const path = join(actorsDir, 'actor.via.repo=ambient', file);
        mkdirSync(join(path, '..'), { recursive: true });
        writeFileSync(path, '{}\n', 'utf8');
      }
      return { repo, actorsDir };
    });

    when('[t0] the .actors self-ignore is created from the repo root', () => {
      const result = useBeforeAll(async () => {
        const cwdBefore = process.cwd();
        process.chdir(scene.repo);
        try {
          findsertAgentEphemeralGitignore({
            dir: scene.actorsDir,
            kind: 'actors',
          });
        } finally {
          process.chdir(cwdBefore);
        }
        return {
          tracked: execFileSync('git', ['ls-files'], {
            cwd: scene.repo,
          }).toString(),
        };
      });

      then('the repo actor brain dir file stays tracked', () => {
        expect(result.tracked).toContain(
          '.agent/.actors/actor.via.repo=ambient/brain/.claude/keep.md',
        );
      });

      then(
        'the repo actor runtime records are ignored, as in every actor',
        () => {
          for (const file of REPO_ACTOR_RUNTIME_FILES)
            expect({
              file,
              ignored: getOneIsPathIgnoredByGit({
                repo: scene.repo,
                path: `.agent/.actors/actor.via.repo=ambient/${file}`,
              }),
            }).toEqual({ file, ignored: true });
        },
      );

      then('the hash actor file is untracked', () => {
        expect(result.tracked).not.toContain(
          '.agent/.actors/actor.via.hash=abc12345/drop.md',
        );
      });

      then(
        'git check-ignore spares the default dir and ignores the hash dir',
        () => {
          expect(
            getOneIsPathIgnoredByGit({
              repo: scene.repo,
              path: '.agent/.actors/actor.via.repo=ambient/brain/.claude/keep.md',
            }),
          ).toBe(false);
          expect(
            getOneIsPathIgnoredByGit({
              repo: scene.repo,
              path: '.agent/.actors/actor.via.hash=abc12345/drop.md',
            }),
          ).toBe(true);
        },
      );
    });
  });

  given('[case6] a dir outside any git repo', () => {
    // the ceiling stops git's walk at the temp dir, so it finds no repo above
    const scene = useBeforeAll(async () => {
      const root = genTempDir({ slug: 'ephemeral-gitignore-norepo' });
      return { root, dir: join(root, '.agent', '.cache') };
    });

    when('[t0] the self-ignore is created', () => {
      const result = useBeforeAll(async () => {
        const ceilingBefore = process.env.GIT_CEILING_DIRECTORIES;
        process.env.GIT_CEILING_DIRECTORIES = scene.root;
        try {
          return findsertAgentEphemeralGitignore({
            dir: scene.dir,
            kind: 'cache',
          });
        } finally {
          if (ceilingBefore === undefined)
            delete process.env.GIT_CEILING_DIRECTORIES;
          else process.env.GIT_CEILING_DIRECTORIES = ceilingBefore;
        }
      });

      then('it creates the ignore; no index is a no-op, not a fault', () => {
        expect(result.status).toEqual('created');
        expect(readFileSync(join(scene.dir, '.gitignore'), 'utf8')).toEqual(
          AGENT_EPHEMERAL_GITIGNORE_CONTENT,
        );
      });
    });
  });

  given('[case7] a git repo whose index is locked', () => {
    // a real untrack fault must fail loud, never be swallowed
    const scene = useBeforeAll(async () => {
      const repo = genTempDir({
        slug: 'ephemeral-gitignore-locked',
        git: true,
      });
      const cacheDir = join(repo, '.agent', '.cache');
      mkdirSync(cacheDir, { recursive: true });
      writeFileSync(join(cacheDir, 'stale.json'), '{}\n', 'utf8');
      execFileSync('git', ['add', '-A'], { cwd: repo });
      writeFileSync(join(repo, '.git', 'index.lock'), '', 'utf8');
      return { repo, cacheDir };
    });

    when('[t0] the self-ignore is created', () => {
      const created = useThen('the findsert settles', async () => ({
        error: await getError(async () =>
          findsertAgentEphemeralGitignore({
            dir: scene.cacheDir,
            kind: 'cache',
          }),
        ),
      }));

      then('it throws a MalfunctionError that names the dir', () => {
        expect(created.error).toBeInstanceOf(MalfunctionError);
        expect(created.error.message).toContain(
          'could not untrack the dir before its .gitignore',
        );
        expect(created.error.message).toContain(scene.cacheDir);
      });

      then('it writes no .gitignore over a failed untrack', () => {
        expect(existsSync(join(scene.cacheDir, '.gitignore'))).toBe(false);
      });
    });
  });

  given('[case8] an .actors dir that links to a dir outside the repo', () => {
    const scene = useBeforeAll(async () => {
      const repo = genTempDir({ slug: 'agent-gitignore-linked-out' });
      const outside = genTempDir({ slug: 'agent-gitignore-linked-out-target' });
      mkdirSync(join(repo, '.agent'), { recursive: true });
      symlinkSync(outside, join(repo, '.agent', '.actors'));
      const result = findsertAgentEphemeralGitignore({
        dir: join(repo, '.agent', '.actors'),
        kind: 'actors',
      });
      return { outside, result };
    });

    when('[t0] the self-ignore is findserted', () => {
      then('the outside dir stays empty', () => {
        expect(readdirSync(scene.outside)).toEqual([]);
      });

      then('it reports the self-ignore as unchanged', () => {
        expect(scene.result.status).toEqual('unchanged');
      });
    });
  });
});
