import { ActorOndisk } from '@src/domain.objects/ActorOndisk';
import type { BrainSlug } from '@src/domain.objects/BrainSlug';
import type { ContextOfRepoRoles } from '@src/domain.objects/ContextOfRepoRoles';
import type { RoleSlug } from '@src/domain.objects/RoleSlug';
import { getOneRepoPath } from '@src/infra/host/getOneRepoPath';

import { mkdirSync } from 'node:fs';
import { REPO_ACTOR_EXID } from './constants';
import { getActorOndiskDir } from './getActorOndiskDir';
import { getOneActorOndiskExid } from './getOneActorOndiskExid';
import { setActorOndiskManifest } from './setActorOndiskManifest';
import { setActorOndiskRolesLog } from './setActorOndiskRolesLog';

/**
 * .what = ensure the on-disk record of an enrolled actor exists — its dir, its
 *   identity manifest, and (unless a pure reuse) an appended roles-log event
 * .why =
 *   - an actor is identity-by-roleset: the same { brain, roles } always lands on the
 *     same `actor.via.<exid>` dir — the ambient roles on `repo=ambient`, any other on
 *     `hash=<h>` — so every clone shares one identity. this findsert makes that dir
 *     exist, idempotently
 *   - the actor.json manifest persists { brain, roles } so a later read can
 *     reconstruct the full ActorOndisk record (repoPath + exid come from the dir's
 *     location; brain + roles cannot be recovered from the exid)
 *
 * .note = idempotent: a re-run with the same { brain, roles } converges on the
 *   same dir + manifest; the manifest write is atomic (temp + rename), so a
 *   reader never sees a half-written actor.json
 * .note = `logEnrollment` gates the append: a PURE live-slug reuse passes false
 *   so a cron that re-enrolls does not append the same event forever; a real
 *   enrollment event passes true
 * .note = repoPath is canonicalized here (getOneRepoPath) so a symlink/worktree
 *   hop never forks the one actor into two dirs
 * .note = the manifest write holds the `actor.json` mutex (`setActorOndiskManifest`), but this
 *   findsert reads no prior record: it writes `{ brain, roles, rolesDelta }` whole from its
 *   input. so an enroll that raced an `rhx init` re-derive can land roles derived from the
 *   ambient set as the enroll first read it. the record still holds `rolesDelta`, the delta
 *   actor's identity, so the next init, upgrade or `roles link` re-derives it to the truth
 */
export const findsertActorOndisk = async (
  input: {
    repoPath: string;
    brain: BrainSlug;
    roles: RoleSlug[];
    /** the actor's delta over the ambient roles (`asActorRolesDelta`), or null */
    rolesDelta?: string[] | null;
    /** the raw `--roles` text as typed, for the roles log only — never an identity input */
    delta: string | null;
    reason: string | null;
    logEnrollment: boolean;
  },
  context: ContextOfRepoRoles,
): Promise<ActorOndisk> => {
  const repoPath = getOneRepoPath({ from: input.repoPath });

  // the one derivation: the ambient roles → the repo actor; a delta → a hash of the
  //   delta; else → a hash of the roles
  const exid = getOneActorOndiskExid(
    { brain: input.brain, roles: input.roles, rolesDelta: input.rolesDelta },
    context,
  );
  const actorDir = getActorOndiskDir({ repoPath, exid });

  // ensure the actor dir exists
  mkdirSync(actorDir, { recursive: true });

  // persist the identity manifest atomically (temp write + rename). a delta actor
  //   records its delta, so a later init re-derives its roles from the ambient set
  //   (`setDeltaActorsOndisk`). a delta that collapses into the repo actor (`+mechanic`
  //   when mechanic is already ambient) records none: the repo actor IS the ambient set
  await setActorOndiskManifest({
    repoPath,
    actorDir,
    brain: input.brain,
    roles: input.roles,
    rolesDelta: exid === REPO_ACTOR_EXID ? null : (input.rolesDelta ?? null),
  });

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
    exid,
    brain: input.brain,
    roles: input.roles,
  });
};
