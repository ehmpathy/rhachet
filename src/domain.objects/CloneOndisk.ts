import { DomainEntity, type RefByUnique } from 'domain-objects';
import type { IsoTimeStamp } from 'iso-time';

import type { ActorOndisk } from './ActorOndisk';

/**
 * .what = one live (or dead) RUN of an enrolled actor — the addressable grain
 * .why =
 *   - an `ActorOndisk` is the durable identity (a { brain, roles } recipe);
 *     a `CloneOndisk` is one concrete spawn of it. an actor may have many clones at
 *     once — same brain, same roles, same config — each a distinct process
 *     with its own socket, its own history, its own serial
 *   - the clone is what crons/comms/self-management REACH: `say` writes its
 *     socket, `get` reads its history, `list` finds it by serial or slug
 *
 * .note = `serial` is the primary ref (a fresh uuid per spawn). `slug` is the
 *   optional `--as @:<slug>` handle — a unique ref, null when unnamed. two null
 *   slugs never collide (null is absent, not a value)
 * .note = `actor` + `historyDir` are hydration-derived, never persisted: the
 *   on-disk `identity.json` holds only { serial, slug, socketEligible,
 *   spawnedAt, hostHash, hostPid, hostPidStartedAt }; the actor ref is rebuilt
 *   from the clone's location under `actor.via.hash=<hash>/`, and the history
 *   dir from { cloneDir }
 * .note = the socket PATH is not stored — it is derived fresh from the serial
 *   (host-scoped, under $XDG_RUNTIME_DIR), so a moved repo never carries a
 *   stale path. `socketEligible` records only WHETHER a socket was stood up
 */
export interface CloneOndisk {
  /**
   * .what = the clone's stable primary id — a fresh uuid per spawn
   */
  serial: string;

  /**
   * .what = the optional `--as @:<slug>` handle; null when the clone is unnamed
   */
  slug: string | null;

  /**
   * .what = the enrolled actor this clone is a run of, by its natural key
   *   { repoPath, hash } (ActorOndisk is content-addressed, no surrogate)
   */
  actor: RefByUnique<typeof ActorOndisk>;

  /**
   * .what = whether a dispatch socket was stood up for this clone
   */
  socketEligible: boolean;

  /**
   * .what = when this clone was spawned
   */
  spawnedAt: IsoTimeStamp;

  /**
   * .what = the host this clone was spawned on (a getHomeHash digest)
   * .why = the reach commands compare it to the current host, so a cross-host
   *   reach fails loud rather than trust a foreign, unreachable pid
   */
  hostHash: string;

  /**
   * .what = the os pid of the spawned brain-cli process
   */
  hostPid: number;

  /**
   * .what = a wall-clock stamp of WHEN the spawn recorded the pid — reserved as the
   *   future pid-reuse guard, but NOT yet the true guard
   * .note = today this is `now()` (a wall-clock time), which is NOT comparable to a
   *   kernel `/proc` start-time, so the pid-REUSE guard cannot fire yet. the reuse
   *   guard (a `/proc`-start-time comparison) + the orphan-cost verdict remain deferred
   *   (ledger row 11, wisher-owed). basic pid-liveness (`process.kill(pid,0)`, used by
   *   DEAF→DEAD + prune) does NOT depend on this field, so both work today
   */
  hostPidStartedAt: IsoTimeStamp;

  /**
   * .what = the clone's history dir (symlinks to the brain-cli's transcripts)
   */
  historyDir: string;
}

export class CloneOndisk
  extends DomainEntity<CloneOndisk>
  implements CloneOndisk
{
  public static primary = ['serial'] as const;
  public static unique = ['slug'] as const;
}
