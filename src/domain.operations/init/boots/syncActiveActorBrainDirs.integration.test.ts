import { ConstraintError } from 'helpful-errors';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';
import { getUuid } from 'uuid-fns';

import { genSampleCloneOndisk } from '@src/.test/assets/genSampleCloneOndisk';
import { getActorOndiskDir } from '@src/domain.operations/actor/enrolled/getActorOndiskDir';
import { getBrainOndiskDir } from '@src/domain.operations/actor/enrolled/getBrainOndiskDir';
import { getDefaultActorOndiskDir } from '@src/domain.operations/actor/enrolled/getDefaultActorOndiskDir';

import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { syncActiveActorBrainDirs } from './syncActiveActorBrainDirs';

/**
 * .what = a git repo with synthetic roles linked under `.agent/`
 */
const genRepoWithRoles = (input: {
  slug: string;
  roles: { repo: string; role: string }[];
}): string => {
  const repoPath = realpathSync(genTempDir({ slug: input.slug, git: true }));
  for (const role of input.roles) {
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
  return repoPath;
};

/**
 * .what = seed one actor with one clone; `live` makes the clone DEAF (a live pid), else DEAD
 */
const genActorWithClone = (input: {
  repoPath: string;
  roles: string[];
  live: boolean;
}): { actorHash: string; brainDir: string } => {
  const seeded = genSampleCloneOndisk({
    repoPath: input.repoPath,
    roles: input.roles,
    serial: getUuid(),
    slug: null,
    // socketless + this live test process's pid → DEAF; a socket with no server → DEAD
    socketEligible: !input.live,
  });
  return {
    actorHash: seeded.actorHash,
    brainDir: getBrainOndiskDir({
      actorDir: getActorOndiskDir({
        repoPath: seeded.repoPath,
        hash: seeded.actorHash,
      }),
    }),
  };
};

const REFS_LINKED = [
  { repo: '.this', role: 'any' },
  { repo: 'fixture', role: 'zeta' },
  { repo: 'fixture', role: 'omega' },
];

describe('syncActiveActorBrainDirs', () => {
  given('[case1] a repo with active, dead, and slug actors', () => {
    const scene = useBeforeAll(async () => {
      const repoPath = genRepoWithRoles({
        slug: 'sync-active-actors',
        roles: [...REFS_LINKED, { repo: 'fixture', role: 'wide' }],
      });
      const zeta = genActorWithClone({ repoPath, roles: ['zeta'], live: true });
      const anyZeta = genActorWithClone({
        repoPath,
        roles: ['any', 'zeta'],
        live: true,
      });

      // a dead actor: its brain dir holds a stale boot.md that must stay as is
      const dead = genActorWithClone({
        repoPath,
        roles: ['omega'],
        live: false,
      });
      mkdirSync(dead.brainDir, { recursive: true });
      writeFileSync(join(dead.brainDir, 'boot.md'), 'stale corpus\n');

      // a slug actor dir: not a hash actor, so the sweep must not visit it
      const slugBootMdPath = join(
        repoPath,
        '.agent/.actors/actor.via.slug=foreman/brain/.claude/boot.md',
      );
      mkdirSync(join(slugBootMdPath, '..'), { recursive: true });
      writeFileSync(slugBootMdPath, 'slug corpus\n');

      const result = await syncActiveActorBrainDirs({
        repoPath,
        refsLinked: REFS_LINKED,
      });
      return { repoPath, zeta, anyZeta, dead, slugBootMdPath, result };
    });

    when('[t0] the active actors are swept', () => {
      then(
        'each active actor renders once, and no failure is collected',
        () => {
          expect(scene.result.failures).toEqual([]);
          expect(
            scene.result.renders.every(
              (render) => render.scope.kind === 'actor',
            ),
          ).toBe(true);
          expect(
            scene.result.renders
              .map((render) =>
                render.scope.kind === 'actor' ? render.scope.actorHash : null,
              )
              .sort(),
          ).toEqual([scene.zeta.actorHash, scene.anyZeta.actorHash].sort());
        },
      );

      then('each actor boot.md holds its own roleset alone', () => {
        const bootZeta = readFileSync(
          join(scene.zeta.brainDir, 'boot.md'),
          'utf8',
        );
        expect(bootZeta).toContain('zeta brief body');
        expect(bootZeta).not.toContain('any brief body');
        expect(bootZeta).not.toContain('omega brief body');

        const bootAnyZeta = readFileSync(
          join(scene.anyZeta.brainDir, 'boot.md'),
          'utf8',
        );
        expect(bootAnyZeta).toContain('any brief body');
        expect(bootAnyZeta).toContain('zeta brief body');
        expect(bootAnyZeta).not.toContain('omega brief body');
      });

      then('the dead actor boot.md is byte-untouched', () => {
        expect(
          readFileSync(join(scene.dead.brainDir, 'boot.md'), 'utf8'),
        ).toEqual('stale corpus\n');
        expect(existsSync(join(scene.dead.brainDir, 'AGENTS.md'))).toBe(false);
      });

      then('the slug actor dir is untouched', () => {
        expect(readFileSync(scene.slugBootMdPath, 'utf8')).toEqual(
          'slug corpus\n',
        );
      });

      then('the default brain dir is untouched', () => {
        expect(
          existsSync(getDefaultActorOndiskDir({ repoPath: scene.repoPath })),
        ).toBe(false);
      });
    });

    when('[t1] a role no actor holds is newly linked, then swept again', () => {
      const rerun = useBeforeAll(async () => {
        const bootBefore = readFileSync(
          join(scene.zeta.brainDir, 'boot.md'),
          'utf8',
        );
        const result = await syncActiveActorBrainDirs({
          repoPath: scene.repoPath,
          refsLinked: [...REFS_LINKED, { repo: 'fixture', role: 'wide' }],
        });
        const bootAfter = readFileSync(
          join(scene.zeta.brainDir, 'boot.md'),
          'utf8',
        );
        const bootAnyZetaAfter = readFileSync(
          join(scene.anyZeta.brainDir, 'boot.md'),
          'utf8',
        );
        return { result, bootBefore, bootAfter, bootAnyZetaAfter };
      });

      then(
        'each actor boot.md is byte-unchanged, and the new role is absent',
        () => {
          expect(rerun.result.failures).toEqual([]);
          expect(rerun.bootAfter).toEqual(rerun.bootBefore);
          expect(rerun.bootAfter).not.toContain('wide brief body');
          expect(rerun.bootAnyZetaAfter).not.toContain('wide brief body');
        },
      );
    });
  });

  given('[case2] an active actor enrolled in a role no longer linked', () => {
    const scene = useBeforeAll(async () => {
      const repoPath = genRepoWithRoles({
        slug: 'sync-active-actors-unlinked',
        roles: REFS_LINKED,
      });
      const gone = genActorWithClone({ repoPath, roles: ['gone'], live: true });
      const zeta = genActorWithClone({ repoPath, roles: ['zeta'], live: true });
      const result = await syncActiveActorBrainDirs({
        repoPath,
        refsLinked: REFS_LINKED,
      });
      return { gone, zeta, result };
    });

    when('[t0] the active actors are swept', () => {
      then('the unlinked actor is collected as a constraint failure', () => {
        expect(scene.result.failures).toHaveLength(1);
        expect(scene.result.failures[0]!.scope).toEqual({
          kind: 'actor',
          actorHash: scene.gone.actorHash,
        });
        expect(scene.result.failures[0]!.cause).toBeInstanceOf(ConstraintError);
        expect(scene.result.failures[0]!.cause.message).toContain('gone');
      });

      then('the rest still render', () => {
        expect(scene.result.renders.map((render) => render.scope)).toEqual([
          { kind: 'actor', actorHash: scene.zeta.actorHash },
        ]);
        expect(existsSync(join(scene.gone.brainDir, 'boot.md'))).toBe(false);
      });
    });
  });

  given('[case3] a repo with zero actors', () => {
    const scene = useBeforeAll(async () => {
      const repoPath = genRepoWithRoles({
        slug: 'sync-active-actors-none',
        roles: REFS_LINKED,
      });
      const result = await syncActiveActorBrainDirs({
        repoPath,
        refsLinked: REFS_LINKED,
      });
      return { repoPath, result };
    });

    when('[t0] the active actors are swept', () => {
      then('no render and no failure', () => {
        expect(scene.result).toEqual({ renders: [], failures: [] });
      });

      then('the default brain dir is untouched', () => {
        expect(
          existsSync(getDefaultActorOndiskDir({ repoPath: scene.repoPath })),
        ).toBe(false);
      });
    });
  });

  given('[case4] an actor manifest that cannot be parsed', () => {
    const scene = useBeforeAll(async () => {
      const repoPath = genRepoWithRoles({
        slug: 'sync-active-actors-corrupt',
        roles: REFS_LINKED,
      });
      const actorDir = join(repoPath, '.agent/.actors/actor.via.hash=deadbeef');
      mkdirSync(actorDir, { recursive: true });
      writeFileSync(join(actorDir, 'actor.json'), '{ not json');
      const result = await syncActiveActorBrainDirs({
        repoPath,
        refsLinked: REFS_LINKED,
      });
      return { result };
    });

    when('[t0] the active actors are swept', () => {
      then(
        'the enumeration is collected as one failure under the actors scope',
        () => {
          expect(scene.result.renders).toEqual([]);
          expect(scene.result.failures).toHaveLength(1);
          expect(scene.result.failures[0]!.scope).toEqual({ kind: 'actors' });
        },
      );
    });
  });
});
