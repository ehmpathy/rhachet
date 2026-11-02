import { ConstraintError } from 'helpful-errors';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { genSampleActorWithClone } from '@src/.test/assets/genSampleActorWithClone';
import { genSampleRepoWithRoles } from '@src/.test/assets/genSampleRepoWithRoles';
import { setSampleRepoCommitted } from '@src/.test/assets/setSampleRepoCommitted';
import { ContextCli } from '@src/domain.objects/ContextCli';

import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { syncBootsForBrainDirs } from './syncBootsForBrainDirs';

const REPO_ACTOR_DIR_REL = '.agent/.actors/actor.via.repo=ambient';
const REPO_ACTOR_BRAIN_DIR_REL = `${REPO_ACTOR_DIR_REL}/brain/.claude`;

/**
 * .what = a git repo with synthetic roles linked under `.agent/`, and its cli context
 */
const genRepoWithRoles = (input: {
  slug: string;
}): { repoPath: string; context: ContextCli } => {
  const repoPath = genSampleRepoWithRoles({
    slug: input.slug,
    roles: [
      { repo: '.this', role: 'any' },
      { repo: 'fixture', role: 'zeta' },
      { repo: 'fixture', role: 'omega' },
    ],
    gitignore: '.agent/.actors/\n',
  });
  return {
    repoPath,
    context: new ContextCli({ cwd: repoPath, gitroot: repoPath }),
  };
};

describe('syncBootsForBrainDirs', () => {
  given('[case1] a repo with one DEAF actor and one DEAD actor', () => {
    const scene = useBeforeAll(async () => {
      const { repoPath, context } = genRepoWithRoles({ slug: 'sync-boots' });
      const deaf = await genSampleActorWithClone({
        repoPath,
        roles: ['zeta'],
        live: true,
      });
      const dead = await genSampleActorWithClone({
        repoPath,
        roles: ['omega'],
        live: false,
      });
      const result = await syncBootsForBrainDirs({ repoPath }, context);
      return { repoPath, context, deaf, dead, result };
    });

    when('[t0] the brain dirs are synced', () => {
      then('the default and the DEAF actor render, and none fail', () => {
        expect(scene.result.failures).toEqual([]);
        expect(scene.result.renders.map((render) => render.scope)).toEqual([
          { kind: 'repo' },
          { kind: 'actor', actorExid: scene.deaf.actorExid },
        ]);
      });

      then('each render carries its path, role count and chars', () => {
        const [renderDefault, renderActor] = scene.result.renders;
        expect(renderDefault!.bootMdPath).toEqual(
          join(scene.repoPath, REPO_ACTOR_BRAIN_DIR_REL, 'boot.md'),
        );
        expect(renderDefault!.stats.roles).toEqual(3);
        expect(renderDefault!.stats.chars).toBeGreaterThan(0);
        expect(renderActor!.bootMdPath).toEqual(
          join(scene.deaf.brainDir, 'boot.md'),
        );
        expect(renderActor!.stats.roles).toEqual(1);
      });

      then(
        '<repo>/.claude is a relative symlink to the repo actor brain dir',
        () => {
          expect(readlinkSync(join(scene.repoPath, '.claude'))).toEqual(
            REPO_ACTOR_BRAIN_DIR_REL,
          );
        },
      );

      then(
        'the repo actor brain dir ignores boot.md and links CLAUDE.md to AGENTS.md',
        () => {
          const repoActorBrainDir = join(
            scene.repoPath,
            REPO_ACTOR_BRAIN_DIR_REL,
          );
          const gitignore = readFileSync(
            join(repoActorBrainDir, '.gitignore'),
            'utf8',
          );
          // an allowlist: ignore all, re-include only the doors and the settings names
          const lines = gitignore.split('\n');
          expect(lines[0]).toEqual('/*');
          expect(lines).toContain('!/AGENTS.md');
          expect(lines).not.toContain('!/boot.md');
          expect(readlinkSync(join(repoActorBrainDir, 'CLAUDE.md'))).toEqual(
            'AGENTS.md',
          );
        },
      );

      then('the DEAD actor is untouched', () => {
        expect(existsSync(join(scene.dead.brainDir, 'boot.md'))).toBe(false);
      });
    });

    when('[t1] a brief changes, and the brain dirs are synced again', () => {
      const rerun = useBeforeAll(async () => {
        writeFileSync(
          join(scene.repoPath, '.agent/repo=fixture/role=zeta/briefs/core.md'),
          'zeta brief body, revised',
        );
        const result = await syncBootsForBrainDirs(
          { repoPath: scene.repoPath },
          scene.context,
        );
        return {
          result,
          bootActor: readFileSync(join(scene.deaf.brainDir, 'boot.md'), 'utf8'),
        };
      });

      then('the change lands in the actor boot.md in place', () => {
        expect(rerun.result.failures).toEqual([]);
        expect(rerun.bootActor).toContain('zeta brief body, revised');
      });
    });
  });

  given('[case2] an extant real <repo>/.claude with a hand AGENTS.md', () => {
    // pin HOME to a temp home with a grove: `settings.json` takes the grove arrow only where
    //   `~/.claude/settings.json` is present, so the box must not decide it
    const homeBefore = process.env.HOME;
    afterAll(() => {
      process.env.HOME = homeBefore;
    });

    const scene = useBeforeAll(async () => {
      const { repoPath, context } = genRepoWithRoles({
        slug: 'sync-boots-migrate',
      });
      const home = genTempDir({ slug: 'sync-boots-migrate-home' });
      mkdirSync(join(home, '.claude'), { recursive: true });
      writeFileSync(join(home, '.claude', 'settings.json'), '{}\n');
      process.env.HOME = home;
      mkdirSync(join(repoPath, '.claude'), { recursive: true });
      writeFileSync(join(repoPath, '.claude', 'AGENTS.md'), 'hand edit\n');
      writeFileSync(join(repoPath, '.claude', 'settings.json'), '{}\n');
      writeFileSync(
        join(repoPath, '.claude', 'settings.local.json'),
        '{"permissions":{"allow":["Bash(pwd)"]}}\n',
      );

      // the boot file is COMMITTED, so its drop is recoverable from git — the one ground
      // S11 rests on, and now the one state a drop proceeds from
      setSampleRepoCommitted({ repoPath });

      const result = await syncBootsForBrainDirs({ repoPath }, context);
      return { repoPath, result };
    });

    when('[t0] the brain dirs are synced', () => {
      then(
        'no collision: the extant AGENTS.md is dropped and rendered fresh',
        () => {
          expect(scene.result.failures).toEqual([]);
          expect(
            readFileSync(join(scene.repoPath, '.claude', 'AGENTS.md'), 'utf8'),
          ).toEqual('@boot.md\n');
        },
      );

      then(
        'the moved settings.json becomes the grove arrow, its content never merged into settings.of.repo.json',
        () => {
          // one answer, rhachet's (inventory.of=requirements.case=7): the repo file holds
          //   only what rhachet writes — the claudeMdExcludes upsert — and no moved key
          const settingsOfRepo = JSON.parse(
            readFileSync(
              join(
                scene.repoPath,
                REPO_ACTOR_BRAIN_DIR_REL,
                'settings.of.repo.json',
              ),
              'utf8',
            ),
          );
          expect(settingsOfRepo).toEqual({
            claudeMdExcludes: [
              '**/home/*/.claude/CLAUDE.md',
              '**/Users/*/.claude/CLAUDE.md',
              '/root/.claude/CLAUDE.md',
              '/github/home/.claude/CLAUDE.md',
              '**/CLAUDE.local.md',
            ],
          });
          expect(
            lstatSync(
              join(scene.repoPath, REPO_ACTOR_BRAIN_DIR_REL, 'settings.json'),
              { throwIfNoEntry: false },
            )?.isFile() ?? false,
          ).toBe(false);
        },
      );

      then(
        'a moved real settings.local.json becomes the repo arrow (vision case=1)',
        () => {
          expect(
            readlinkSync(
              join(
                scene.repoPath,
                REPO_ACTOR_BRAIN_DIR_REL,
                'settings.local.json',
              ),
            ),
          ).toEqual('settings.of.repo.json');
        },
      );

      then('the run reports each real settings file it replaced (S2)', () => {
        const byName = [...scene.result.settingsReplaced].sort((a, b) =>
          a.name.localeCompare(b.name),
        );
        expect(byName).toEqual([
          { name: 'settings.json', target: 'settings.of.grove.json' },
          { name: 'settings.local.json', target: 'settings.of.repo.json' },
        ]);
      });

      then('the symlink names its effect, the drop and the move', () => {
        expect(scene.result.symlink).toEqual({
          effect: 'MIGRATED',
          drops: ['AGENTS.md'],
          moves: ['settings.json', 'settings.local.json'],
          overwrites: [],
        });
      });
    });
  });

  given('[case3] the repo actor brain dir cannot be written', () => {
    const scene = useBeforeAll(async () => {
      const { repoPath, context } = genRepoWithRoles({
        slug: 'sync-boots-repo-actor-fails',
      });
      const deaf = await genSampleActorWithClone({
        repoPath,
        roles: ['zeta'],
        live: true,
      });
      // a file where the repo actor dir must be → its mkdir fails
      writeFileSync(join(repoPath, REPO_ACTOR_DIR_REL), 'not a dir\n');
      const result = await syncBootsForBrainDirs({ repoPath }, context);
      return { repoPath, deaf, result };
    });

    when('[t0] the brain dirs are synced', () => {
      then('the repo actor failure is collected under the repo scope', () => {
        expect(scene.result.failures).toHaveLength(1);
        expect(scene.result.failures[0]!.scope).toEqual({ kind: 'repo' });
        expect(scene.result.failures[0]!.cause).not.toBeInstanceOf(
          ConstraintError,
        );
      });

      then('every active actor still renders', () => {
        expect(scene.result.renders.map((render) => render.scope)).toEqual([
          { kind: 'actor', actorExid: scene.deaf.actorExid },
        ]);
      });

      then('no <repo>/.claude is made, and no symlink is named', () => {
        expect(existsSync(join(scene.repoPath, '.claude'))).toBe(false);
        expect(scene.result.symlink).toEqual(null);
      });
    });
  });

  given(
    '[case4] one actor unwritable, one actor unlinked, one actor healthy',
    () => {
      const scene = useBeforeAll(async () => {
        const { repoPath, context } = genRepoWithRoles({
          slug: 'sync-boots-partial',
        });
        const healthy = await genSampleActorWithClone({
          repoPath,
          roles: ['zeta'],
          live: true,
        });
        const unwritable = await genSampleActorWithClone({
          repoPath,
          roles: ['omega'],
          live: true,
        });
        rmSync(join(unwritable.actorDir, 'brain'), {
          recursive: true,
          force: true,
        });
        writeFileSync(join(unwritable.actorDir, 'brain'), 'not a dir\n');
        const unlinked = await genSampleActorWithClone({
          repoPath,
          roles: ['gone'],
          live: true,
        });
        const result = await syncBootsForBrainDirs({ repoPath }, context);
        return { healthy, unwritable, unlinked, result };
      });

      when('[t0] the brain dirs are synced', () => {
        then(
          'the unwritable actor fails with a non-constraint cause, named',
          () => {
            const failure = scene.result.failures.find(
              (f) =>
                f.scope.kind === 'actor' &&
                f.scope.actorExid === scene.unwritable.actorExid,
            );
            expect(failure?.cause).toBeInstanceOf(Error);
            expect(failure?.cause).not.toBeInstanceOf(ConstraintError);
          },
        );

        then('the unlinked actor fails with a constraint, named', () => {
          const failure = scene.result.failures.find(
            (f) =>
              f.scope.kind === 'actor' &&
              f.scope.actorExid === scene.unlinked.actorExid,
          );
          expect(failure?.cause).toBeInstanceOf(ConstraintError);
        });

        then('the default and the healthy actor still render', () => {
          expect(scene.result.failures).toHaveLength(2);
          expect(
            scene.result.renders
              .map((render) => render.scope)
              .sort((a, b) => (a.kind < b.kind ? -1 : 1)),
          ).toEqual([
            { kind: 'actor', actorExid: scene.healthy.actorExid },
            { kind: 'repo' },
          ]);
        });
      });
    },
  );

  given('[case5] an actor manifest that cannot be parsed', () => {
    const scene = useBeforeAll(async () => {
      const { repoPath, context } = genRepoWithRoles({
        slug: 'sync-boots-corrupt',
      });
      const actorDir = join(repoPath, '.agent/.actors/actor.via.hash=deadbeef');
      mkdirSync(actorDir, { recursive: true });
      writeFileSync(join(actorDir, 'actor.json'), '{ not json');
      const result = await syncBootsForBrainDirs({ repoPath }, context);
      return { result };
    });

    when('[t0] the brain dirs are synced', () => {
      then(
        'the enumeration failure is collected under the actors scope',
        () => {
          expect(scene.result.failures.map((f) => f.scope)).toEqual([
            { kind: 'actors' },
          ]);
        },
      );

      then('the default still renders', () => {
        expect(scene.result.renders.map((render) => render.scope)).toEqual([
          { kind: 'repo' },
        ]);
      });
    });
  });
});
