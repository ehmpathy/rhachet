import { MalfunctionError } from 'helpful-errors';

import type { ActorOndisk } from '@src/domain.objects/ActorOndisk';
import type { RoleSlug } from '@src/domain.objects/RoleSlug';
import { REPO_ACTOR_EXID } from '@src/domain.operations/actor/enrolled/constants';
import { getActorOndiskDir } from '@src/domain.operations/actor/enrolled/getActorOndiskDir';
import { getActorOndiskManifest } from '@src/domain.operations/actor/enrolled/getActorOndiskManifest';
import { getAllActorsOndisk } from '@src/domain.operations/actor/enrolled/getAllActorsOndisk';
import { isRolesetEqual } from '@src/domain.operations/actor/enrolled/isRolesetEqual';
import { setActorOndiskManifestWithinLock } from '@src/domain.operations/actor/enrolled/setActorOndiskManifest';
import type { BrainDirBootFailure } from '@src/domain.operations/boot/BrainDirBootRender';
import { withRepoMutex } from '@src/infra/lock/withRepoMutex';
import { isCodeDefectError } from '@src/utils/isCodeDefectError';

import { join } from 'node:path';
import { asActorRolesRederived } from './asActorRolesRederived';
import {
  asDeltaActorOutcomes,
  type DeltaActorOutcome,
} from './asDeltaActorOutcomes';
import { setActorSettingsDerived } from './setActorSettingsDerived';

/**
 * .what = re-derive every delta actor's roles from the current ambient roles ⊕ its delta,
 *   and rewrite its `actor.json` and its `settings.of.repo.json` where the roles moved
 * .why = a delta actor (`rhx enroll claude --roles -driver`) stands for "the repo's roles,
 *   minus driver". so after `rhx init --roles -xyz`, every such actor drops `xyz` too — not
 *   merely the next enroll (`inventory.of=requirements.case=2`)
 *
 * .note = it runs before the boot sweep, so an active actor's `boot.md` renders from the
 *   fresh roles; an inactive actor renders its `boot.md` at its next spawn, as before
 * .note = every delta actor is re-derived, active or not: its `actor.json` is what the hook
 *   sync and `rhx actor list` read, and a stale record would answer them wrong
 * .note = one actor that fails is collected, and the rest still re-derive
 * .note = a delta can re-derive to exactly the ambient set (a `-omega` actor, once omega
 *   leaves the repo). the actor keeps its delta-hash dir: its identity is its delta, not
 *   its roles, and its clones live there. it mints naught — the next enroll of that delta
 *   ranks the ambient set first and lands on the repo actor. it is kept, never retired
 *   (wisher, 2026-10-05): no enroll reaches it again, and `.agent/.actors/` is per-worktree
 *   and gitignored, so the leftover dir is ephemeral by declaration
 */
export const setDeltaActorsOndisk = async (input: {
  repoPath: string;
  rolesLinked: RoleSlug[];
}): Promise<{
  rederived: { actorExid: string; before: RoleSlug[]; after: RoleSlug[] }[];
  failures: BrainDirBootFailure[];
}> => {
  // enumerate the actors; a failed read is collected, as the boot sweep collects it, so
  //   it never aborts the sync that follows
  const enumeration = getAllActorsOrFailure({ repoPath: input.repoPath });
  if ('failure' in enumeration)
    return { rederived: [], failures: [enumeration.failure] };

  // one outcome per actor: rewritten, failed, or left as it was
  const outcomes = await Promise.all(
    enumeration.actors.map((actor) =>
      getOneDeltaActorOutcome({ actor, rolesLinked: input.rolesLinked }),
    ),
  );

  return asDeltaActorOutcomes({ outcomes });
};

/**
 * .what = re-derive one delta actor and rewrite its settings, as one outcome
 * .why = a failure is collected, never thrown, so one broken actor never stops the rest
 */
const getOneDeltaActorOutcome = async (input: {
  actor: ActorOndisk;
  rolesLinked: RoleSlug[];
}): Promise<DeltaActorOutcome> => {
  const { actor } = input;
  try {
    // only a delta actor re-derives; any other holds the roles it named
    const rederive = getActorRolesRederivedOrNull({
      actor,
      rolesLinked: input.rolesLinked,
    });
    if (rederive === null) return null;
    const { rolesBefore, rolesNext } = rederive;

    // the settings first, then the record. the record is what says "already re-derived":
    //   were it written first, a settings write that faults would leave it ahead, and the
    //   next init would see equal roles and never retry the settings. this order converges
    // .note = the one settings derivation every sweep calls: the layout findsert, then
    //   settings.of.repo.json, for the roles the actor stands for today
    await setActorSettingsDerived({
      actor: { ...actor, roles: rolesNext },
      repoPath: actor.repoPath,
    });
    await setActorManifestRolesRecorded({ actor, roles: rolesNext });
    return {
      rederived: {
        actorExid: actor.exid,
        before: rolesBefore,
        after: rolesNext,
      },
    };
  } catch (error) {
    // an allowlist: a classed or fs fault is this actor's row; a code defect surfaces loud
    if (isCodeDefectError({ error })) throw error;
    return {
      failure: {
        scope: { kind: 'actor' as const, actorExid: actor.exid },
        cause:
          error instanceof Error
            ? error
            : new MalfunctionError(
                'delta actor re-derive threw a non-Error value',
                {
                  actorExid: actor.exid,
                  reason: error,
                  hint: `rerun \`rhx init\`; if it fails again, check .agent/.actors/actor.via.${actor.exid}/actor.json and report this output as a rhachet bug`,
                },
              ),
      },
    };
  }
};

/**
 * .what = the roles one delta actor stands for today, beside the roles its record holds;
 *   null when the actor holds no delta, or its roles already match
 * .note = a read alone: `actor.json` is written by temp + rename, so a read never meets half
 *   a record. the write that follows re-reads under the mutex
 */
const getActorRolesRederivedOrNull = (input: {
  actor: ActorOndisk;
  rolesLinked: RoleSlug[];
}): { rolesBefore: RoleSlug[]; rolesNext: RoleSlug[] } | null => {
  const manifest = getActorOndiskManifest({
    manifestPath: getActorManifestPath({ actor: input.actor }),
    exid: input.actor.exid,
  });
  if (manifest.rolesDelta === null) return null;
  const rolesNext = asActorRolesRederived({
    brain: input.actor.brain,
    rolesDelta: manifest.rolesDelta,
    rolesAmbient: input.rolesLinked,
    rolesLinked: input.rolesLinked,
  });
  const rolesBefore = manifest.roles as RoleSlug[];
  if (isRolesetEqual({ left: rolesNext, right: rolesBefore })) return null;
  return { rolesBefore, rolesNext };
};

/**
 * .what = record the roles a delta actor's settings were just derived for, in its `actor.json`
 * .why = the read and the write hold the `actor.json` mutex, so two concurrent `rhx init`s
 *   cannot each read one record and drop the other's write. the delta comes from the record
 *   read under the mutex, never the one read before it
 */
const setActorManifestRolesRecorded = async (input: {
  actor: ActorOndisk;
  roles: RoleSlug[];
}): Promise<void> => {
  const manifestPath = getActorManifestPath({ actor: input.actor });
  await withRepoMutex(
    { repoPath: input.actor.repoPath, path: manifestPath },
    async () => {
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
      setActorOndiskManifestWithinLock({
        actorDir: getActorOndiskDir({
          repoPath: input.actor.repoPath,
          exid: input.actor.exid,
        }),
        brain: input.actor.brain,
        roles: input.roles,
        rolesDelta: manifest.rolesDelta,
      });
    },
  );
};

/**
 * .what = the path of one actor's `actor.json`
 */
const getActorManifestPath = (input: { actor: ActorOndisk }): string =>
  join(
    getActorOndiskDir({
      repoPath: input.actor.repoPath,
      exid: input.actor.exid,
    }),
    'actor.json',
  );

/**
 * .what = the actors on disk save the repo actor, or the one failure that stopped the read
 * .why = an unreadable actor dir is a sync failure to report, never a throw
 */
const getAllActorsOrFailure = (input: {
  repoPath: string;
}): { actors: ActorOndisk[] } | { failure: BrainDirBootFailure } => {
  try {
    const actors = getAllActorsOndisk({ repoPath: input.repoPath });
    return { actors: actors.filter((actor) => actor.exid !== REPO_ACTOR_EXID) };
  } catch (error) {
    // an allowlist: a classed or fs fault is the sweep's row; a code defect surfaces loud
    if (isCodeDefectError({ error })) throw error;
    return {
      failure: {
        scope: { kind: 'actors' },
        cause:
          error instanceof Error
            ? error
            : new MalfunctionError(
                'delta actor enumeration threw a non-Error value',
                {
                  reason: error,
                  hint: 'rerun `rhx init`; if it fails again, check that .agent/.actors/ is readable and report this output as a rhachet bug',
                },
              ),
      },
    };
  }
};
