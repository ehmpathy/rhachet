import { getError, given, then, useBeforeAll, when } from 'test-fns';

import { genSampleRepoWithRoles } from '@src/.test/assets/genSampleRepoWithRoles';
import { getOneIsPathIgnoredByGit } from '@src/.test/infra/getOneIsPathIgnoredByGit';
import { genTempDirPhysical } from '@src/.test/infra/genTempDirPhysical';
import { setProcessEnvVar } from '@src/.test/infra/setProcessEnvVar';

import {
  existsSync,
  lstatSync,
  mkdirSync,
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
  '!/hooks.dispatch.manifest',
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
        expect(scene.result.render.scope).toEqual({
          kind: 'repo',
          actorExid: 'repo=ambient',
        });
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
            'hooks.dispatch.manifest',
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

  given(
    '[case3] a box with a grove, and a grove arrow a prior release pointed at one home',
    () => {
      // a temp home with a grove, so the layout links the grove on any host
      //   via genTempDirPhysical, so the run that made it reclaims it
      const home = {
        path: genTempDirPhysical({ slug: 'home-setRepoActorBrainDir-case3' }),
      };
      const homeOriginal = process.env.HOME;
      beforeAll(() => {
        process.env.HOME = home.path;
        mkdirSync(join(home.path, '.claude'), { recursive: true });
        writeFileSync(join(home.path, '.claude', 'settings.json'), '{}\n');
      });
      afterAll(() => setProcessEnvVar({ name: 'HOME', value: homeOriginal }));

      const scene = useBeforeAll(async () => {
        const repoPath = genRepoWithRoles({
          slug: 'sync-repo-actor-brain-dir-home',
        });
        const brainDir = join(repoPath, REPO_ACTOR_BRAIN_DIR_REL);
        mkdirSync(brainDir, { recursive: true });
        symlinkSync(
          '/home/fixturehuman/.claude/settings.json',
          join(brainDir, 'settings.of.grove.json'),
        );
        await setRepoActorBrainDir({ repoPath, refsLinked: ROLES });
        return { repoPath, brainDir };
      });

      when('[t0] the repo actor brain dir is synced', () => {
        then(
          'the grove arrow is rewritten to the relative home link, the same bytes on every box',
          () => {
            expect(
              readlinkSync(join(scene.brainDir, 'settings.of.grove.json')),
            ).toEqual('.home/.claude/settings.json');
          },
        );

        then("the home link points at this box's home settings", () => {
          expect(
            readlinkSync(join(scene.brainDir, '.home/.claude/settings.json')),
          ).toEqual(join(home.path, '.claude', 'settings.json'));
        });

        then('git tracks the grove arrow and ignores the home link', () => {
          // the home link is the one name that holds this box's home path
          //   (rule.forbid.machine-names-in-committed-config, #779)
          expect(
            getOneIsPathIgnoredByGit({
              repo: scene.repoPath,
              path: `${REPO_ACTOR_BRAIN_DIR_REL}/settings.of.grove.json`,
            }),
          ).toBe(false);
          expect(
            getOneIsPathIgnoredByGit({
              repo: scene.repoPath,
              path: `${REPO_ACTOR_BRAIN_DIR_REL}/.home/.claude/settings.json`,
            }),
          ).toBe(true);
        });
      });
    },
  );
});
