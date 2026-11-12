import { getError, given, then, useBeforeAll, when } from 'test-fns';

import { genSampleRepoWithRoles } from '@src/.test/assets/genSampleRepoWithRoles';
import { getOneIsPathIgnoredByGit } from '@src/.test/infra/getOneIsPathIgnoredByGit';
import { withTempHome } from '@src/.test/infra/withTempHome';

import { execFileSync } from 'node:child_process';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import {
  BRAIN_DIR_NAMES_UNTRACKED,
  setRepoActorBrainDir,
} from './setRepoActorBrainDir';

/**
 * .what = the paths git's index holds under one pathspec, repo-relative
 * .why = a tracked file is one in the index; `.gitignore` alone never says so
 */
const getAllPathsInGitIndex = (input: {
  repo: string;
  path: string;
}): string[] =>
  execFileSync('git', ['ls-files', '--', input.path], { cwd: input.repo })
    .toString()
    .split('\n')
    .filter((line) => line !== '');

const REPO_ACTOR_BRAIN_DIR_REL =
  '.agent/.actors/actor.via.repo=ambient/brain/.claude';

const ROLES = [
  { repo: '.this', role: 'any' },
  { repo: 'fixture', role: 'zeta' },
];

/**
 * .what = a git repo with two synthetic roles, `.this/any` and `fixture/zeta`
 */
const genRepoWithRoles = (input: { slug: string }): string =>
  genSampleRepoWithRoles({
    slug: input.slug,
    roles: ROLES,
    gitignore: 'node_modules\n.agent/.actors/\n',
  });

/**
 * .what = the repo actor brain dir `.gitignore`: ignore all, re-include the doors and the
 *         three settings names that name no machine
 */
const GITIGNORE_ALLOWLIST = [
  '/*',
  '!/.gitignore',
  '!/AGENTS.md',
  '!/CLAUDE.md',
  '!/settings.json',
  '!/settings.of.repo.json',
  '!/settings.local.json',
  '',
].join('\n');

describe('setRepoActorBrainDir', () => {
  // a temp home with a grove: the layout reads HOME for the grove arrow, so no case hangs on
  //   whether the host has a ~/.claude/settings.json (a groveless box drops the arrow)
  const home = withTempHome({ name: 'setRepoActorBrainDir' });
  beforeAll(() => {
    home.setup();
    mkdirSync(join(home.path, '.claude'), { recursive: true });
    writeFileSync(join(home.path, '.claude', 'settings.json'), '{}\n');
  });
  afterAll(() => home.teardown());

  given('[case1] a repo with two linked roles and no <repo>/.claude', () => {
    const scene = useBeforeAll(async () => {
      const repoPath = genRepoWithRoles({ slug: 'sync-repo-actor-brain-dir' });
      const result = await setRepoActorBrainDir({
        repoPath,
        refsLinked: ROLES,
      });
      return { repoPath, result };
    });

    when('[t0] the repo actor brain dir is synced', () => {
      then('boot.md holds both roles, under the repo scope', () => {
        expect(scene.result.render.scope).toEqual({ kind: 'repo' });
        expect(scene.result.render.bootMdPath).toEqual(
          join(scene.repoPath, REPO_ACTOR_BRAIN_DIR_REL, 'boot.md'),
        );
        const bootMd = readFileSync(scene.result.render.bootMdPath, 'utf8');
        expect(bootMd).toContain('any brief body');
        expect(bootMd).toContain('zeta brief body');
      });

      then(
        '<repo>/.claude is the relative symlink to the repo actor brain dir',
        () => {
          expect(scene.result.symlink.effect).toEqual('CREATED');
          expect(readlinkSync(join(scene.repoPath, '.claude'))).toEqual(
            REPO_ACTOR_BRAIN_DIR_REL,
          );
          expect(
            readFileSync(join(scene.repoPath, '.claude', 'AGENTS.md'), 'utf8'),
          ).toEqual('@boot.md\n');
        },
      );

      then(
        "only the doors and the machine-agnostic settings names are tracked; boot.md, the grove link and claude's runtime state are ignored",
        () => {
          expect(
            readFileSync(
              join(scene.repoPath, REPO_ACTOR_BRAIN_DIR_REL, '.gitignore'),
              'utf8',
            ),
          ).toEqual(GITIGNORE_ALLOWLIST);
          for (const ignored of [
            'boot.md',
            // the grove link targets `<home>/.claude/settings.json`, so it names a machine
            //   (rule.forbid.machine-names-in-committed-config)
            'settings.of.grove.json',
            '.claude.json',
            '.credentials.json',
            'projects/-repo/transcript.jsonl',
          ])
            expect(
              getOneIsPathIgnoredByGit({
                repo: scene.repoPath,
                path: `${REPO_ACTOR_BRAIN_DIR_REL}/${ignored}`,
              }),
            ).toBe(true);
          for (const tracked of [
            '.gitignore',
            'AGENTS.md',
            'CLAUDE.md',
            'settings.json',
            'settings.of.repo.json',
            'settings.local.json',
          ])
            expect(
              getOneIsPathIgnoredByGit({
                repo: scene.repoPath,
                path: `${REPO_ACTOR_BRAIN_DIR_REL}/${tracked}`,
              }),
            ).toBe(false);
        },
      );

      then(
        "a hash actor's settings stay ignored — only the repo actor dir is tracked",
        () => {
          for (const name of [
            'settings.json',
            'settings.of.repo.json',
            'settings.of.grove.json',
            'settings.local.json',
          ])
            expect(
              getOneIsPathIgnoredByGit({
                repo: scene.repoPath,
                path: `.agent/.actors/actor.via.hash=abc12345/brain/.claude/${name}`,
              }),
            ).toBe(true);
        },
      );

      then(
        'the repo .gitignore spares the default dir and still ignores a hash actor',
        () => {
          expect(
            readFileSync(join(scene.repoPath, '.gitignore'), 'utf8'),
          ).toEqual(
            'node_modules\n.agent/.actors/*\n!.agent/.actors/actor.via.repo=ambient/\n',
          );
          expect(
            getOneIsPathIgnoredByGit({
              repo: scene.repoPath,
              path: '.agent/.actors/actor.via.hash=abc12345/actor.json',
            }),
          ).toBe(true);
        },
      );
    });

    when('[t1] the repo actor brain dir is synced again', () => {
      const rerun = useBeforeAll(async () => {
        const gitignoreBefore = readFileSync(
          join(scene.repoPath, '.gitignore'),
          'utf8',
        );
        const result = await setRepoActorBrainDir({
          repoPath: scene.repoPath,
          refsLinked: ROLES,
        });
        const gitignoreAfter = readFileSync(
          join(scene.repoPath, '.gitignore'),
          'utf8',
        );
        return { result, gitignoreBefore, gitignoreAfter };
      });

      then('the link and the .gitignore are unchanged', () => {
        expect(rerun.result.symlink.effect).toEqual('FOUND');
        expect(rerun.gitignoreAfter).toEqual(rerun.gitignoreBefore);
      });
    });

    when(
      "[t2] a prior release's brain dir .gitignore ignored the repo and grove settings",
      () => {
        const prior = useBeforeAll(async () => {
          const brainGitignore = join(
            scene.repoPath,
            REPO_ACTOR_BRAIN_DIR_REL,
            '.gitignore',
          );
          writeFileSync(
            brainGitignore,
            'boot.md\n*.local.json\nsettings.json\nsettings.of.repo.json\nsettings.of.grove.json\n*.forked.*.json\n',
          );
          await setRepoActorBrainDir({
            repoPath: scene.repoPath,
            refsLinked: ROLES,
          });
          return { content: readFileSync(brainGitignore, 'utf8') };
        });

        then('every retired line is dropped and the allowlist remains', () => {
          expect(prior.content).toEqual(GITIGNORE_ALLOWLIST);
        });
      },
    );

    when("[t3] a prior release's allowlist re-included the grove link", () => {
      const prior = useBeforeAll(async () => {
        const brainGitignore = join(
          scene.repoPath,
          REPO_ACTOR_BRAIN_DIR_REL,
          '.gitignore',
        );
        writeFileSync(
          brainGitignore,
          '/*\n!/.gitignore\n!/AGENTS.md\n!/CLAUDE.md\n!/settings.json\n!/settings.of.repo.json\n!/settings.of.grove.json\n!/settings.local.json\n',
        );
        await setRepoActorBrainDir({
          repoPath: scene.repoPath,
          refsLinked: ROLES,
        });
        return { content: readFileSync(brainGitignore, 'utf8') };
      });

      then(
        'the grove re-include is dropped, so git ignores the link again',
        () => {
          expect(prior.content).toEqual(GITIGNORE_ALLOWLIST);
          expect(
            getOneIsPathIgnoredByGit({
              repo: scene.repoPath,
              path: `${REPO_ACTOR_BRAIN_DIR_REL}/settings.of.grove.json`,
            }),
          ).toBe(true);
        },
      );
    });

    when("[t4] a prior release left the grove link in git's index", () => {
      const prior = useBeforeAll(async () => {
        const groveRel = `${REPO_ACTOR_BRAIN_DIR_REL}/settings.of.grove.json`;
        const grovePath = join(scene.repoPath, groveRel);
        rmSync(grovePath, { force: true });
        symlinkSync('/home/fixturehuman/.claude/settings.json', grovePath);
        execFileSync('git', ['add', '--force', '--', groveRel], {
          cwd: scene.repoPath,
        });
        execFileSync(
          'git',
          [
            '-c',
            'user.name=Test Human',
            '-c',
            'user.email=human@example.com',
            'commit',
            '--quiet',
            '--no-verify',
            '-m',
            'seed: a prior release tracked the grove link',
            '--',
            groveRel,
          ],
          { cwd: scene.repoPath },
        );

        // each box relinks the grove to its own home, so the tracked link differs from HEAD
        rmSync(grovePath, { force: true });
        symlinkSync('/home/otherhuman/.claude/settings.json', grovePath);
        execFileSync('git', ['add', '--force', '--', groveRel], {
          cwd: scene.repoPath,
        });
        const indexBefore = getAllPathsInGitIndex({
          repo: scene.repoPath,
          path: groveRel,
        });
        const result = await setRepoActorBrainDir({
          repoPath: scene.repoPath,
          refsLinked: ROLES,
        });
        const indexAfter = getAllPathsInGitIndex({
          repo: scene.repoPath,
          path: groveRel,
        });
        return { groveRel, grovePath, indexBefore, indexAfter, result };
      });

      then('the grove link was tracked at HEAD before the sync', () => {
        expect(prior.indexBefore).toEqual([prior.groveRel]);
      });

      then('the sync drops it from the index', () => {
        expect(prior.indexAfter).toEqual([]);
      });

      then('the sync names what it untracked, for the report', () => {
        expect(prior.result.untracked).toEqual([prior.groveRel]);
      });

      then('the link stays on disk', () => {
        expect(lstatSync(prior.grovePath).isSymbolicLink()).toBe(true);
      });
    });

    when(
      '[t5] naught is tracked, and another git process holds the index lock',
      () => {
        const locked = useBeforeAll(async () => {
          const lockPath = join(scene.repoPath, '.git', 'index.lock');
          writeFileSync(lockPath, '');
          const outcome = await setRepoActorBrainDir({
            repoPath: scene.repoPath,
            refsLinked: ROLES,
          }).then(
            (result) => ({ result, error: null }),
            (error: unknown) => ({ result: null, error }),
          );
          rmSync(lockPath, { force: true });
          return outcome;
        });

        then('the sync neither throws nor writes the index', () => {
          expect(locked.error).toEqual(null);
          expect(locked.result?.untracked).toEqual([]);
        });
      },
    );

    when(
      '[t6] each name the sync untracks is checked against the allowlist',
      () => {
        then('the allowlist ignores every one, so none returns to git', () => {
          for (const name of BRAIN_DIR_NAMES_UNTRACKED)
            expect({
              name,
              ignored: getOneIsPathIgnoredByGit({
                repo: scene.repoPath,
                path: `${REPO_ACTOR_BRAIN_DIR_REL}/${name}`,
              }),
            }).toEqual({ name, ignored: true });
        });
      },
    );
  });

  given('[case2] a render that throws', () => {
    const scene = useBeforeAll(async () => {
      const repoPath = genRepoWithRoles({
        slug: 'sync-repo-actor-brain-dir-throw',
      });
      const error = await getError(
        setRepoActorBrainDir({
          repoPath,
          refsLinked: [{ repo: 'fixture', role: 'absent' }],
        }),
      );
      return { repoPath, error };
    });

    when('[t0] the repo actor brain dir is synced', () => {
      then('the error propagates', () => {
        expect(scene.error).toBeInstanceOf(Error);
      });

      then('no <repo>/.claude is made', () => {
        expect(existsSync(join(scene.repoPath, '.claude'))).toBe(false);
        expect(() => lstatSync(join(scene.repoPath, '.claude'))).toThrow();
      });
    });
  });
});
