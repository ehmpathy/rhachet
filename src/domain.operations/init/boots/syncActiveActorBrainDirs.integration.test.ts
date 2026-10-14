import { ConstraintError } from 'helpful-errors';
import { given, then, useBeforeAll, when } from 'test-fns';
import { getUuid } from 'uuid-fns';

import { genSampleActorWithClone } from '@src/.test/assets/genSampleActorWithClone';
import { genSampleCloneOndisk } from '@src/.test/assets/genSampleCloneOndisk';
import { genSampleRepoWithRoles } from '@src/.test/assets/genSampleRepoWithRoles';
import { getBrainOndiskDir } from '@src/domain.operations/actor/enrolled/getBrainOndiskDir';
import { getOneRepoActorOndiskDir } from '@src/domain.operations/actor/enrolled/getOneRepoActorOndiskDir';

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { syncActiveActorBrainDirs } from './syncActiveActorBrainDirs';

// a git repo with synthetic roles linked under `.agent/`
const genRepoWithRoles = genSampleRepoWithRoles;

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
      const zeta = await genSampleActorWithClone({
        repoPath,
        roles: ['zeta'],
        live: true,
      });
      const anyZeta = await genSampleActorWithClone({
        repoPath,
        roles: ['any', 'zeta'],
        live: true,
      });

      // a dead actor: its brain dir holds a stale boot.md that must stay as is
      const dead = await genSampleActorWithClone({
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
                render.scope.kind === 'actor' ? render.scope.actorExid : null,
              )
              .sort(),
          ).toEqual([scene.zeta.actorExid, scene.anyZeta.actorExid].sort());
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

      then('the repo actor brain dir is untouched', () => {
        expect(
          existsSync(getOneRepoActorOndiskDir({ repoPath: scene.repoPath })),
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
      const gone = await genSampleActorWithClone({
        repoPath,
        roles: ['gone'],
        live: true,
      });
      const zeta = await genSampleActorWithClone({
        repoPath,
        roles: ['zeta'],
        live: true,
      });
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
          actorExid: scene.gone.actorExid,
        });
        expect(scene.result.failures[0]!.cause).toBeInstanceOf(ConstraintError);
        expect(scene.result.failures[0]!.cause.message).toContain('gone');
      });

      then('the rest still render', () => {
        expect(scene.result.renders.map((render) => render.scope)).toEqual([
          { kind: 'actor', actorExid: scene.zeta.actorExid },
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

      then('the repo actor brain dir is untouched', () => {
        expect(
          existsSync(getOneRepoActorOndiskDir({ repoPath: scene.repoPath })),
        ).toBe(false);
      });
    });
  });

  given('[case5] a live clone of the repo actor, beside a hash actor', () => {
    const scene = useBeforeAll(async () => {
      const repoPath = genRepoWithRoles({
        slug: 'sync-active-actors-repo-actor',
        roles: REFS_LINKED,
      });
      const repoActor = await genSampleCloneOndisk({
        repoPath,
        roles: ['zeta'],
        rolesAmbient: ['zeta'],
        serial: getUuid(),
        slug: null,
        socketEligible: false,
      });
      const zeta = await genSampleActorWithClone({
        repoPath,
        roles: ['omega'],
        live: true,
      });
      const result = await syncActiveActorBrainDirs({
        repoPath,
        refsLinked: REFS_LINKED,
      });
      return { repoPath, repoActor, zeta, result };
    });

    when('[t0] the active actors are swept', () => {
      then('the fixture did seed the repo actor', () => {
        expect(scene.repoActor.actorExid).toEqual('repo=ambient');
      });

      then(
        'only the hash actor renders; the repo actor is left to its own sync',
        () => {
          expect(scene.result.failures).toEqual([]);
          expect(scene.result.renders.map((render) => render.scope)).toEqual([
            { kind: 'actor', actorExid: scene.zeta.actorExid },
          ]);
        },
      );

      then('the repo actor brain dir holds no boot.md from this sweep', () => {
        expect(
          existsSync(
            join(
              getBrainOndiskDir({
                actorDir: getOneRepoActorOndiskDir({
                  repoPath: scene.repoPath,
                }),
              }),
              'boot.md',
            ),
          ),
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
