import { getUuid } from 'uuid-fns';

import { ActorOndisk } from '@src/domain.objects/ActorOndisk';
import type { BrainSlug } from '@src/domain.objects/BrainSlug';
import type { RoleSlug } from '@src/domain.objects/RoleSlug';
import { getOneRepoPath } from '@src/infra/host/getOneRepoPath';

import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ACTOR_MANIFEST_SCHEMA_VERSION } from './constants';
import { genEnrollmentHash } from './genEnrollmentHash';
import { getActorOndiskDir } from './getActorOndiskDir';
import { setActorOndiskRolesLog } from './setActorOndiskRolesLog';

/**
 * .what = ensure the on-disk record of an enrolled actor exists — its dir, its
 *   identity manifest, and (unless a pure reuse) an appended roles-log event
 * .why =
 *   - `rhx enroll` is identity-by-roleset: the same { brain, roles } always
 *     lands on the same actor.via.hash dir, so every clone shares one identity.
 *     this findsert makes that dir exist, idempotently
 *   - the actor.json manifest persists { brain, roles } so a later read can
 *     reconstruct the full ActorOndisk record (repoPath + hash come from the
 *     dir's location; brain + roles cannot be recovered from the one-way hash)
 *
 * .note = idempotent: a re-run with the same { brain, roles } converges on the
 *   same dir + manifest; the manifest write is atomic (temp + rename), so a
 *   reader never sees a half-written actor.json
 * .note = `logEnrollment` gates the append: a PURE live-slug reuse passes false
 *   so a cron that re-enrolls does not append the same event forever; a real
 *   enrollment event passes true
 * .note = repoPath is canonicalized here (getOneRepoPath) so a symlink/worktree
 *   hop never forks the one actor into two dirs
 */
export const findsertActorOndisk = (input: {
  repoPath: string;
  brain: BrainSlug;
  roles: RoleSlug[];
  delta: string | null;
  reason: string | null;
  logEnrollment: boolean;
}): ActorOndisk => {
  const repoPath = getOneRepoPath({ from: input.repoPath });
  const hash = genEnrollmentHash({ brain: input.brain, roles: input.roles });
  const actorDir = getActorOndiskDir({ repoPath, hash });

  // ensure the actor dir exists
  mkdirSync(actorDir, { recursive: true });

  // persist the identity manifest atomically (temp write + rename)
  const manifestPath = join(actorDir, 'actor.json');
  const manifestTemp = join(actorDir, `.actor.json.${getUuid()}.tmp`);
  const manifest = {
    schemaVersion: ACTOR_MANIFEST_SCHEMA_VERSION,
    brain: input.brain,
    roles: input.roles,
  };
  writeFileSync(manifestTemp, JSON.stringify(manifest) + '\n', 'utf8');
  renameSync(manifestTemp, manifestPath);

  // append a roles-log event, unless this is a pure live-slug reuse
  if (input.logEnrollment)
    setActorOndiskRolesLog({
      actorDir,
      roles: input.roles,
      delta: input.delta,
      reason: input.reason,
    });

  return new ActorOndisk({
    repoPath,
    hash,
    brain: input.brain,
    roles: input.roles,
  });
};
