import type { BrainSlug } from '@src/domain.objects/BrainSlug';
import type { RoleSlug } from '@src/domain.objects/RoleSlug';
import { withRepoMutex } from '@src/infra/lock/withRepoMutex';
import { setFileAtomic } from '@src/infra/setFileAtomic';

import { join } from 'node:path';
import { ACTOR_MANIFEST_SCHEMA_VERSION } from './constants';

/**
 * .what = write one actor's `actor.json` identity manifest, atomically, under its mutex
 * .why = the one writer of the manifest shape, so the findsert at enroll and the
 *   re-derive at init (`setDeltaActorsOndisk`) can never write two shapes
 *
 * .note = temp write + rename, so a reader never sees a half-written manifest
 * .note = every write holds the `actor.json` mutex, so an enroll's write waits on an init's
 *   read-modify-write rather than land in its middle. the re-derive, which already holds it
 *   around its read, calls `setActorOndiskManifestWithinLock` — the mutex is not reentrant
 */
export const setActorOndiskManifest = async (input: {
  repoPath: string;
  actorDir: string;
  brain: BrainSlug;
  roles: RoleSlug[];
  rolesDelta: string[] | null;
}): Promise<void> =>
  withRepoMutex(
    { repoPath: input.repoPath, path: join(input.actorDir, 'actor.json') },
    async () => setActorOndiskManifestWithinLock(input),
  );

/**
 * .what = the manifest write itself; the caller holds the `actor.json` mutex
 */
export const setActorOndiskManifestWithinLock = (input: {
  actorDir: string;
  brain: BrainSlug;
  roles: RoleSlug[];
  rolesDelta: string[] | null;
}): void =>
  setFileAtomic({
    path: join(input.actorDir, 'actor.json'),
    content:
      JSON.stringify({
        schemaVersion: ACTOR_MANIFEST_SCHEMA_VERSION,
        brain: input.brain,
        roles: input.roles,
        rolesDelta: input.rolesDelta,
      }) + '\n',
  });
