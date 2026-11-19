import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { ActorOndisk } from '@src/domain.objects/ActorOndisk';
import type { BrainSlug } from '@src/domain.objects/BrainSlug';
import type { RoleSlug } from '@src/domain.objects/RoleSlug';

import { mkdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { getActorOndiskDir } from './getActorOndiskDir';
import { setActorOndiskManifest } from './setActorOndiskManifest';
import { setActorOndiskManifestRoles } from './setActorOndiskManifestRoles';

const EXID = 'slug=crew._.delta=9c1e0000';

/**
 * .what = a repo with one derived actor recorded at `roles` with `rolesDelta`
 */
const genRepoWithActorRecorded = async (input: {
  slug: string;
  roles: RoleSlug[];
  rolesDelta: string[] | null;
}): Promise<{ repoPath: string; actor: ActorOndisk; manifestPath: string }> => {
  const repoPath = genTempDir({ slug: input.slug });
  const actorDir = getActorOndiskDir({ repoPath, exid: EXID });
  mkdirSync(actorDir, { recursive: true });
  await setActorOndiskManifest({
    repoPath,
    actorDir,
    brain: 'claude' as BrainSlug,
    roles: input.roles,
    rolesDelta: input.rolesDelta,
  });
  return {
    repoPath,
    actor: new ActorOndisk({
      repoPath,
      exid: EXID,
      brain: 'claude' as BrainSlug,
      roles: input.roles,
    }),
    manifestPath: join(actorDir, 'actor.json'),
  };
};

/**
 * .what = read the record back
 */
const getRecord = (input: { manifestPath: string }) =>
  JSON.parse(readFileSync(input.manifestPath, 'utf8')) as {
    roles: string[];
    rolesDelta: string[] | null;
  };

describe('setActorOndiskManifestRoles', () => {
  given('[case1] a derived actor recorded with a delta', () => {
    const scene = useBeforeAll(async () =>
      genRepoWithActorRecorded({
        slug: 'manifest-roles-moved',
        roles: ['mechanic', 'reviewer'] as RoleSlug[],
        rolesDelta: ['+reviewer'],
      }),
    );

    when('[t0] its roles move', () => {
      then(
        'the record holds the new roles, and keeps the delta it held',
        async () => {
          await setActorOndiskManifestRoles({
            actor: scene.actor,
            roles: ['tester', 'reviewer'] as RoleSlug[],
          });
          const record = getRecord({ manifestPath: scene.manifestPath });
          expect(record.roles).toEqual(['tester', 'reviewer']);
          expect(record.rolesDelta).toEqual(['+reviewer']);
        },
      );
    });
  });

  given('[case2] a record that already holds the roles', () => {
    const scene = useBeforeAll(async () =>
      genRepoWithActorRecorded({
        slug: 'manifest-roles-equal',
        roles: ['mechanic', 'reviewer'] as RoleSlug[],
        rolesDelta: ['+reviewer'],
      }),
    );

    when('[t0] the same roles are set, in another order', () => {
      then('naught is written', async () => {
        const mtimeBefore = statSync(scene.manifestPath).mtimeMs;
        await setActorOndiskManifestRoles({
          actor: scene.actor,
          roles: ['reviewer', 'mechanic'] as RoleSlug[],
        });
        expect(statSync(scene.manifestPath).mtimeMs).toEqual(mtimeBefore);
        expect(getRecord({ manifestPath: scene.manifestPath }).roles).toEqual([
          'mechanic',
          'reviewer',
        ]);
      });
    });
  });
});
