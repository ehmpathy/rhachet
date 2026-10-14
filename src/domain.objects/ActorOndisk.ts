import { DomainEntity } from 'domain-objects';

import type { BrainSlug } from './BrainSlug';
import type { RoleSlug } from './RoleSlug';

/**
 * .what = the durable, ON-DISK record of an actor
 * .why =
 *   - an actor is identity-by-roleset: the same { brain, roles } always lands on the
 *     same actor, so every clone of that identity shares one config and stays in
 *     sync. that identity needs a persisted referent so a Clone.actor ref has a real
 *     target to point at
 *   - this is the on-disk PEER of the in-memory `Actor` (brain⊕role runtime):
 *     one concept, two grains — the runtime actor acts, this one is the record
 *
 * .note = `exid` is the `via=xyz` token of the actor's dir (`actor.via.<exid>`):
 *   `repo=ambient` for the repo actor (the ambient roles, and only it), `hash=<h>` for a
 *   hash actor (specific roles; <h> = genEnrollmentHash({ brain, roles })). one string
 *   keys every lookup, index and list, so the repo actor is just an actor
 * .note = there is NO `dir` field — the dir is derived fresh from { repoPath, exid }
 *   via getActorOndiskDir, so a moved/renamed repo never carries a stale path
 * .note = `repoPath` joins the key so two repos never collide on one exid; it is
 *   always the getOneRepoPath-canonical realpath
 * .note = content-addressed record with NO surrogate key — its natural key
 *   { repoPath, exid } IS its identity, so only `unique` is declared (no `primary`).
 *   a `Clone.actor` ref points at it via `RefByUnique`
 */
export interface ActorOndisk {
  /**
   * .what = the canonical absolute path of the repo this actor was enrolled in
   */
  repoPath: string;

  /**
   * .what = the actor's identity — the `via=xyz` token of its dir
   * .example = 'repo=ambient', 'hash=810671c1'
   */
  exid: string;

  /**
   * .what = the brain this actor uses (e.g., "claude")
   */
  brain: BrainSlug;

  /**
   * .what = the sorted role slugs this actor is enrolled with
   */
  roles: RoleSlug[];
}

export class ActorOndisk
  extends DomainEntity<ActorOndisk>
  implements ActorOndisk
{
  public static unique = ['repoPath', 'exid'] as const;
}
