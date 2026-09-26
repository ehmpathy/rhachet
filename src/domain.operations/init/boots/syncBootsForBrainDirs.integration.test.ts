import { ConstraintError } from 'helpful-errors';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';
import { getUuid } from 'uuid-fns';

import { genSampleCloneOndisk } from '@src/.test/assets/genSampleCloneOndisk';
import { ContextCli } from '@src/domain.objects/ContextCli';
import { getActorOndiskDir } from '@src/domain.operations/actor/enrolled/getActorOndiskDir';
import { getBrainOndiskDir } from '@src/domain.operations/actor/enrolled/getBrainOndiskDir';

import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { syncBootsForBrainDirs } from './syncBootsForBrainDirs';

const DEFAULT_ACTOR_DIR_REL = '.agent/.actors/actor.via.slug=.default';
const DEFAULT_BRAIN_DIR_REL = `${DEFAULT_ACTOR_DIR_REL}/brain/.claude`;

/**
 * .what = a git repo with synthetic roles linked under `.agent/`, and its cli context
 */
const genRepoWithRoles = (input: {
  slug: string;
}): { repoPath: string; context: ContextCli } => {
  const repoPath = realpathSync(genTempDir({ slug: input.slug, git: true }));
  const roles = [
    { repo: '.this', role: 'any' },
    { repo: 'fixture', role: 'zeta' },
    { repo: 'fixture', role: 'omega' },
  ];
  for (const role of roles) {
    const roleDir = join(
      repoPath,
      '.agent',
      `repo=${role.repo}`,
      `role=${role.role}`,
    );
    mkdirSync(join(roleDir, 'briefs'), { recursive: true });
    writeFileSync(join(roleDir, 'readme.md'), `${role.role} readme`);
    writeFileSync(
      join(roleDir, 'briefs', 'core.md'),
      `${role.role} brief body`,
    );
  }
  writeFileSync(join(repoPath, '.gitignore'), '.agent/.actors/\n');
  return {
    repoPath,
    context: new ContextCli({ cwd: repoPath, gitroot: repoPath }),
  };
};

/**
 * .what = stage and commit every tracked-eligible path in the repo
 * .why = the migration drops a boot file ONLY where git could hand it back, so a case that
 *   asserts a DROP must first put that file where git can reach it. the identity rides on
 *   `-c`, so the test needs no global git config to exist
 */
const commitWholeTree = (input: { repoPath: string }): void => {
  execFileSync('git', ['add', '-A'], { cwd: input.repoPath, stdio: 'pipe' });
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
    { cwd: input.repoPath, stdio: 'pipe' },
  );
};

/**
 * .what = seed one actor with one clone; `live` makes the clone DEAF (a live pid), else DEAD
 */
const genActorWithClone = (input: {
  repoPath: string;
  roles: string[];
  live: boolean;
}): { actorHash: string; actorDir: string; brainDir: string } => {
  const seeded = genSampleCloneOndisk({
    repoPath: input.repoPath,
    roles: input.roles,
    serial: getUuid(),
    slug: null,
    socketEligible: !input.live,
  });
  const actorDir = getActorOndiskDir({
    repoPath: seeded.repoPath,
    hash: seeded.actorHash,
  });
  return {
    actorHash: seeded.actorHash,
    actorDir,
    brainDir: getBrainOndiskDir({ actorDir }),
  };
};

describe('syncBootsForBrainDirs', () => {
  given('[case1] a repo with one DEAF actor and one DEAD actor', () => {
    const scene = useBeforeAll(async () => {
      const { repoPath, context } = genRepoWithRoles({ slug: 'sync-boots' });
      const deaf = genActorWithClone({ repoPath, roles: ['zeta'], live: true });
      const dead = genActorWithClone({
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
          { kind: 'default' },
          { kind: 'actor', actorHash: scene.deaf.actorHash },
        ]);
      });

      then('each render carries its path, role count and chars', () => {
        const [renderDefault, renderActor] = scene.result.renders;
        expect(renderDefault!.bootMdPath).toEqual(
          join(scene.repoPath, DEFAULT_BRAIN_DIR_REL, 'boot.md'),
        );
        expect(renderDefault!.stats.roles).toEqual(3);
        expect(renderDefault!.stats.chars).toBeGreaterThan(0);
        expect(renderActor!.bootMdPath).toEqual(
          join(scene.deaf.brainDir, 'boot.md'),
        );
        expect(renderActor!.stats.roles).toEqual(1);
      });

      then(
        '<repo>/.claude is a relative symlink to the default brain dir',
        () => {
          expect(readlinkSync(join(scene.repoPath, '.claude'))).toEqual(
            DEFAULT_BRAIN_DIR_REL,
          );
        },
      );

      then(
        'the default brain dir ignores boot.md and links CLAUDE.md to AGENTS.md',
        () => {
          const defaultBrainDir = join(scene.repoPath, DEFAULT_BRAIN_DIR_REL);
          const gitignore = readFileSync(
            join(defaultBrainDir, '.gitignore'),
            'utf8',
          );
          expect(gitignore).toContain('boot.md');
          expect(gitignore).toContain('*.local.json');
          expect(readlinkSync(join(defaultBrainDir, 'CLAUDE.md'))).toEqual(
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
    const scene = useBeforeAll(async () => {
      const { repoPath, context } = genRepoWithRoles({
        slug: 'sync-boots-migrate',
      });
      mkdirSync(join(repoPath, '.claude'), { recursive: true });
      writeFileSync(join(repoPath, '.claude', 'AGENTS.md'), 'hand edit\n');
      writeFileSync(join(repoPath, '.claude', 'settings.json'), '{}\n');

      // the boot file is COMMITTED, so its drop is recoverable from git — the one ground
      // S11 rests on, and now the one state a drop proceeds from
      commitWholeTree({ repoPath });

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

      then('the other files move under the default dir', () => {
        expect(
          readFileSync(
            join(scene.repoPath, DEFAULT_BRAIN_DIR_REL, 'settings.json'),
            'utf8',
          ),
        ).toEqual('{}\n');
      });

      then('the symlink names its effect, the drop and the move', () => {
        expect(scene.result.symlink).toEqual({
          effect: 'MIGRATED',
          drops: ['AGENTS.md'],
          moves: ['settings.json'],
          overwrites: [],
        });
      });
    });
  });

  given('[case3] the default brain dir cannot be written', () => {
    const scene = useBeforeAll(async () => {
      const { repoPath, context } = genRepoWithRoles({
        slug: 'sync-boots-default-fails',
      });
      const deaf = genActorWithClone({ repoPath, roles: ['zeta'], live: true });
      // a file where the default actor dir must be → its mkdir fails
      writeFileSync(join(repoPath, DEFAULT_ACTOR_DIR_REL), 'not a dir\n');
      const result = await syncBootsForBrainDirs({ repoPath }, context);
      return { repoPath, deaf, result };
    });

    when('[t0] the brain dirs are synced', () => {
      then('the default failure is collected under the default scope', () => {
        expect(scene.result.failures).toHaveLength(1);
        expect(scene.result.failures[0]!.scope).toEqual({ kind: 'default' });
        expect(scene.result.failures[0]!.cause).not.toBeInstanceOf(
          ConstraintError,
        );
      });

      then('every active actor still renders', () => {
        expect(scene.result.renders.map((render) => render.scope)).toEqual([
          { kind: 'actor', actorHash: scene.deaf.actorHash },
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
        const healthy = genActorWithClone({
          repoPath,
          roles: ['zeta'],
          live: true,
        });
        const unwritable = genActorWithClone({
          repoPath,
          roles: ['omega'],
          live: true,
        });
        rmSync(join(unwritable.actorDir, 'brain'), {
          recursive: true,
          force: true,
        });
        writeFileSync(join(unwritable.actorDir, 'brain'), 'not a dir\n');
        const unlinked = genActorWithClone({
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
                f.scope.actorHash === scene.unwritable.actorHash,
            );
            expect(failure?.cause).toBeInstanceOf(Error);
            expect(failure?.cause).not.toBeInstanceOf(ConstraintError);
          },
        );

        then('the unlinked actor fails with a constraint, named', () => {
          const failure = scene.result.failures.find(
            (f) =>
              f.scope.kind === 'actor' &&
              f.scope.actorHash === scene.unlinked.actorHash,
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
            { kind: 'actor', actorHash: scene.healthy.actorHash },
            { kind: 'default' },
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
          { kind: 'default' },
        ]);
      });
    });
  });
});
