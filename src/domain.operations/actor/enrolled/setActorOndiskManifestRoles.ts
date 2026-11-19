import type { ActorOndisk } from '@src/domain.objects/ActorOndisk';
import type { RoleSlug } from '@src/domain.objects/RoleSlug';
import { withRepoMutex } from '@src/infra/lock/withRepoMutex';

import { join } from 'node:path';
import { getActorOndiskDir } from './getActorOndiskDir';
import { getActorOndiskManifest } from './getActorOndiskManifest';
import { isRolesetEqual } from './isRolesetEqual';
import { setActorOndiskManifestWithinLock } from './setActorOndiskManifest';

/**
 * .what = record the roles an actor's settings and boot were just derived for, in its `actor.json`
 * .why = the one read-modify-write of a record's roles, shared by every re-derive sweep
 *   (`setDeltaActorsOndisk`, `setDeclaredActorsOndisk`), so their lock rule cannot drift apart
 *
 * .note = the read and the write hold the `actor.json` mutex, so two concurrent `rhx init`s
 *   cannot each read one record and drop the other's write
 * .note = the brain comes from the actor, and the delta from the record read under the mutex —
 *   never from a read before it; equal roles write naught
 */
export const setActorOndiskManifestRoles = async (input: {
  actor: ActorOndisk;
  roles: RoleSlug[];
}): Promise<void> => {
  const actorDir = getActorOndiskDir({
    repoPath: input.actor.repoPath,
    exid: input.actor.exid,
  });
  const manifestPath = join(actorDir, 'actor.json');
  await withRepoMutex(
    { repoPath: input.actor.repoPath, path: manifestPath },
    async () => {
      // skip where the record already holds these roles
      const manifest = getActorOndiskManifest({
        manifestPath,
        exid: input.actor.exid,
      });
      if (
        isRolesetEqual({
          left: input.roles,
          right: manifest.roles as RoleSlug[],
        })
      )
        return;

      // write the roles; the delta stays as the record holds it
      setActorOndiskManifestWithinLock({
        actorDir,
        brain: input.actor.brain,
        roles: input.roles,
        rolesDelta: manifest.rolesDelta,
      });
    },
  );
};
