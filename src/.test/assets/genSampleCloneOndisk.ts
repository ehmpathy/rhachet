import { mkdirSync } from 'node:fs';

import type { IsoTimeStamp } from 'iso-time';
import { now } from 'iso-time';

import { findsertActorOndisk } from '@src/domain.operations/actor/enrolled/findsertActorOndisk';
import { getActorOndiskDir } from '@src/domain.operations/actor/enrolled/getActorOndiskDir';
import { getCloneDir } from '@src/domain.operations/clone/getCloneDir';
import { setCloneIdentity } from '@src/domain.operations/clone/setCloneIdentity';
import { setCloneSerialIndex } from '@src/domain.operations/clone/setCloneSerialIndex';
import { setCloneSlugIndex } from '@src/domain.operations/clone/setCloneSlugIndex';
import type { BrainSlug } from '@src/domain.objects/BrainSlug';
import type { RoleSlug } from '@src/domain.objects/RoleSlug';
import { getHomeHash } from '@src/infra/host/getHomeHash';

/**
 * .what = provision one enrolled actor + one clone dir (identity.json, optional
 *   `.slugs/` claim) on disk under a real temp repo, via the REAL ops
 * .why = the clone fs-communicator integration tests each need a realistic
 *   on-disk actor+clone tree; built through findsertActorOndisk +
 *   setCloneIdentity + setCloneSlugIndex, the fixture stays faithful to what
 *   enroll actually writes (no hand-rolled dir shape to drift)
 */
export const genSampleCloneOndisk = (input: {
  repoPath: string;
  brain?: BrainSlug;
  roles?: RoleSlug[];
  serial: string;
  slug: string | null;
  socketEligible?: boolean;
  spawnedAt?: IsoTimeStamp;
  claimSlug?: boolean;
  /**
   * the host that "spawned" this clone — defaults to THIS host (getHomeHash).
   * override it to a foreign value to provision a cross-host clone (the reach
   * path that must fail loud from a different machine, criteria usecase.10)
   */
  hostHash?: string;
}): {
  repoPath: string;
  actorsRoot: string;
  actorDir: string;
  actorHash: string;
  cloneDir: string;
  serial: string;
  slug: string | null;
} => {
  const actor = findsertActorOndisk({
    repoPath: input.repoPath,
    brain: input.brain ?? 'claude',
    roles: input.roles ?? ['mechanic'],
    delta: null,
    reason: null,
    logEnrollment: true,
  });

  const actorsRoot = `${actor.repoPath}/.agent/.actors`;
  const actorDir = getActorOndiskDir({
    repoPath: actor.repoPath,
    hash: actor.hash,
  });
  const cloneDir = getCloneDir({ actorDir, serial: input.serial });
  mkdirSync(cloneDir, { recursive: true });

  setCloneIdentity({
    cloneDir,
    serial: input.serial,
    slug: input.slug,
    socketEligible: input.socketEligible ?? true,
    spawnedAt: input.spawnedAt ?? now(),
    hostHash: input.hostHash ?? getHomeHash(),
    hostPid: process.pid,
    hostPidStartedAt: now(),
  });

  // the serial index is always written (every clone has a serial) — the same order
  // the real genClone follows, so the fixture stays faithful to the reach path
  setCloneSerialIndex({
    actorsRoot,
    actorHash: actor.hash,
    serial: input.serial,
  });

  if (input.slug !== null && (input.claimSlug ?? true))
    setCloneSlugIndex({
      actorsRoot,
      slug: input.slug,
      actorHash: actor.hash,
      serial: input.serial,
    });

  return {
    repoPath: actor.repoPath,
    actorsRoot,
    actorDir,
    actorHash: actor.hash,
    cloneDir,
    serial: input.serial,
    slug: input.slug,
  };
};
