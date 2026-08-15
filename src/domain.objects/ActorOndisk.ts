import { DomainEntity } from 'domain-objects';

import type { BrainSlug } from './BrainSlug';
import type { RoleSlug } from './RoleSlug';

/**
 * .what = the durable, ON-DISK record of an enrolled actor (the hash namespace)
 * .why =
 *   - `rhx enroll` is identity-by-roleset: the same { brain, roles } always
 *     lands on the same actor, so every clone of that identity shares one
 *     config and stays in sync. that identity needs a persisted referent so a
 *     Clone.actor ref has a real target to point at
 *   - this is the on-disk PEER of the in-memory `Actor` (brain⊕role runtime):
 *     one concept, two grains — the runtime actor acts, this one is the record
 *
 * .note = content-addressed + immutable: `hash` IS genEnrollmentHash({ brain,
 *   roles }). the record is never mutated — a different roleset is a different
 *   hash, hence a different actor
 * .note = there is NO `dir` field — the dir is derived fresh from { repoPath,
 *   hash } via getActorOndiskDir, so a moved/renamed repo never carries a
 *   stale path
 * .note = `repoPath` joins the key so two repos never collide on a bare hash;
 *   it is always the getOneRepoPath-canonical realpath
 * .note = content-addressed record with NO surrogate key — its natural key
 *   { repoPath, hash } IS its identity, so only `unique` is declared (no
 *   `primary`). a `Clone.actor` ref points at it via `RefByUnique`
 */
export interface ActorOndisk {
  /**
   * .what = the canonical absolute path of the repo this actor was enrolled in
   */
  repoPath: string;

  /**
   * .what = the 8-char enrollment hash = genEnrollmentHash({ brain, roles })
   */
  hash: string;

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
  public static unique = ['repoPath', 'hash'] as const;
}
