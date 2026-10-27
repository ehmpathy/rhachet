import {
  genTempDir,
  getError,
  given,
  then,
  useBeforeAll,
  when,
} from 'test-fns';

import { genSampleRepoWithRoles } from '@src/.test/assets/genSampleRepoWithRoles';
import { getOneIsPathIgnoredByGit } from '@src/.test/infra/getOneIsPathIgnoredByGit';
import { BrainDirOutsideRepoError } from '@src/domain.operations/actor/enrolled/BrainDirOutsideRepoError';
import { getActorsRootDir } from '@src/domain.operations/actor/enrolled/getActorsRootDir';

import {
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { setRepoActorBrainDir } from './setRepoActorBrainDir';

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
 *         four settings names
 */
const GITIGNORE_ALLOWLIST = [
  '/*',
  '!/.gitignore',
  '!/AGENTS.md',
  '!/CLAUDE.md',
  '!/settings.json',
  '!/settings.of.repo.json',
  '!/settings.of.grove.json',
  '!/settings.local.json',
  '',
].join('\n');

describe('setRepoActorBrainDir', () => {
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
        "only the doors and the four settings names are tracked; boot.md and claude's runtime state are ignored",
        () => {
          expect(
            readFileSync(
              join(scene.repoPath, REPO_ACTOR_BRAIN_DIR_REL, '.gitignore'),
              'utf8',
            ),
          ).toEqual(GITIGNORE_ALLOWLIST);
          for (const ignored of [
            'boot.md',
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
            'settings.of.grove.json',
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

  given('[case3] a repo whose actors root links outside the repo', () => {
    const scene = useBeforeAll(async () => {
      const repoPath = genRepoWithRoles({
        slug: 'sync-repo-actor-brain-dir-linked-out',
      });
      const outside = genTempDir({ slug: 'sync-repo-actor-brain-dir-outside' });
      const actorsRoot = getActorsRootDir({ repoPath });
      mkdirSync(join(actorsRoot, '..'), { recursive: true });
      symlinkSync(outside, actorsRoot);
      const error = await getError(
        setRepoActorBrainDir({ repoPath, refsLinked: ROLES }),
      );
      return { repoPath, outside, error };
    });

    when('[t0] the repo actor brain dir is synced', () => {
      then('it refuses with BrainDirOutsideRepoError', () => {
        expect(scene.error).toBeInstanceOf(BrainDirOutsideRepoError);
      });

      then('the outside dir stays empty', () => {
        expect(readdirSync(scene.outside)).toEqual([]);
      });

      then('no <repo>/.claude is made', () => {
        expect(() => lstatSync(join(scene.repoPath, '.claude'))).toThrow();
      });
    });
  });
});
