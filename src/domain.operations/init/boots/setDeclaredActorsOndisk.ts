import { MalfunctionError } from 'helpful-errors';

import type { ActorOndisk } from '@src/domain.objects/ActorOndisk';
import { BrainCliEnrollmentSpec } from '@src/domain.objects/BrainCliEnrollmentSpec';
import type { ContextCli } from '@src/domain.objects/ContextCli';
import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';
import type { RoleSlug } from '@src/domain.objects/RoleSlug';
import { asActorsDeclared } from '@src/domain.operations/actor/enrolled/asActorsDeclared';
import { asSlugBaseOfActorExid } from '@src/domain.operations/actor/enrolled/asSlugBaseOfActorExid';
import { getActorOndiskDir } from '@src/domain.operations/actor/enrolled/getActorOndiskDir';
import { getActorOndiskManifest } from '@src/domain.operations/actor/enrolled/getActorOndiskManifest';
import { getAllActorsOndisk } from '@src/domain.operations/actor/enrolled/getAllActorsOndisk';
import { getBrainOndiskDir } from '@src/domain.operations/actor/enrolled/getBrainOndiskDir';
import { getOneRepoActorExid } from '@src/domain.operations/actor/enrolled/getOneRepoActorExid';
import { isRolesetEqual } from '@src/domain.operations/actor/enrolled/isRolesetEqual';
import { setActorOndiskManifestRoles } from '@src/domain.operations/actor/enrolled/setActorOndiskManifestRoles';
import { asSlugsOfActorsDeclared } from '@src/domain.operations/actor/manifest/asSlugsOfActorsDeclared';
import { getActorsManifest } from '@src/domain.operations/actor/manifest/getActorsManifest';
import { getOneActorExpandedOfRepo } from '@src/domain.operations/actor/manifest/getOneActorExpandedOfRepo';
import type { BrainDirBootFailure } from '@src/domain.operations/boot/BrainDirBootRender';
import { setBrainDirBoot } from '@src/domain.operations/boot/setBrainDirBoot';
import { asActorFormEnrollment } from '@src/domain.operations/enroll/asActorFormEnrollment';
import {
  asDeltaActorOutcomes,
  type DeltaActorOutcome,
} from '@src/domain.operations/enroll/asDeltaActorOutcomes';
import { setActorSettingsDerived } from '@src/domain.operations/enroll/setActorSettingsDerived';
import { getRoleDeltas } from '@src/domain.operations/roles/deltas/getRoleDeltas';
import { asRoleSlugsAmbientAtFocus } from '@src/domain.operations/roles/focus/ambient/asRoleSlugsAmbientAtFocus';
import { getRepoAmbientRoleFoci } from '@src/domain.operations/roles/focus/ambient/getRepoAmbientRoleFoci';
import { isCodeDefectError } from '@src/utils/isCodeDefectError';

import { join } from 'node:path';
import { asRoleRefsForEnrolledSlugs } from './asRoleRefsForEnrolledSlugs';

/**
 * .what = re-derive every declared actor on disk (`slug=<x>`, `slug=<x>._.delta=<h>`) from
 *         `.agent/actors.yml` as it reads now, and rewrite its settings, its `boot.md` and its
 *         `actor.json` where its roles moved
 * .why = the sync invariant: a slug actor's roleset is edited in `actors.yml`, and every clone
 *        inherits the edit — new clones at spawn, live clones on their next settings read. a
 *        record left at its first enroll's roles would keep the old hooks and boot until a
 *        clone of it spawned again (catalog.of=actor-clone-design)
 *
 * .note = no manifest → no declared actor → naught to do
 * .note = the repo actor (the `ambient:` actor) takes the ambient roles at their recorded focus,
 *   which init just computed; its `boot.md` is `setRepoActorBrainDir`'s to render
 * .note = a derived actor re-derives from its base's roles today ⊕ the delta its record holds
 * .note = an actor whose base slug is no longer declared is left as it was: no `actors.yml`
 *   entry says what it should hold now, and its clones still live in its dir. the drift report
 *   names it, with both fixes (`asActorExidsUndeclared`, F15)
 * .note = one actor that fails is collected, and the rest still re-derive
 */
export const setDeclaredActorsOndisk = async (
  input: {
    repoPath: string;
    refsLinked: RoleLinkRef[];
    /** the repo actor's roles — the `ambient:` actor's, as linked; the focus is read here */
    rolesAmbient: RoleSlug[];
  },
  context: ContextCli,
): Promise<{
  rederived: { actorExid: string; before: RoleSlug[]; after: RoleSlug[] }[];
  failures: BrainDirBootFailure[];
}> => {
  // no manifest → no declared actor
  const manifest = getActorsManifest({ repoPath: input.repoPath });
  if (!manifest) return { rederived: [], failures: [] };

  // enumerate the declared actors; a failed read is one failure, never a throw
  const enumeration = getAllDeclaredActorsOrFailure({
    repoPath: input.repoPath,
  });
  if ('failure' in enumeration)
    return { rederived: [], failures: [enumeration.failure] };

  // the repo actor's roles at their recorded focus, read once; a corrupt record is one failure
  const ambient = getRolesAmbientAtFocusOrFailure({
    repoPath: input.repoPath,
    rolesAmbient: input.rolesAmbient,
  });
  if ('failure' in ambient)
    return { rederived: [], failures: [ambient.failure] };

  // one outcome per actor: rewritten, failed, or left as it was
  const slugsDeclared = new Set(asSlugsOfActorsDeclared({ manifest }));
  const exidRepoActor = getOneRepoActorExid({ repoPath: input.repoPath });
  const outcomes = await Promise.all(
    enumeration.actors.map((actor) =>
      getOneDeclaredActorOutcome(
        {
          actor,
          slugsDeclared,
          isRepoActor: actor.exid === exidRepoActor,
          refsLinked: input.refsLinked,
          rolesAmbient: ambient.rolesAmbient,
        },
        context,
      ),
    ),
  );
  return asDeltaActorOutcomes({ outcomes });
};

/**
 * .what = the repo actor's roles at their recorded focus, or the one failure that stopped the read
 */
const getRolesAmbientAtFocusOrFailure = (input: {
  repoPath: string;
  rolesAmbient: RoleSlug[];
}): { rolesAmbient: RoleSlug[] } | { failure: BrainDirBootFailure } => {
  try {
    return {
      rolesAmbient: asRoleSlugsAmbientAtFocus({
        rolesLinked: input.rolesAmbient,
        foci: getRepoAmbientRoleFoci({ repoPath: input.repoPath }),
      }),
    };
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
                'ambient role foci read threw a non-Error value',
                {
                  reason: error,
                  hint: 'rerun `rhx init`; if it fails again, report this output as a rhachet bug',
                },
              ),
      },
    };
  }
};

/**
 * .what = re-derive one declared actor and rewrite what its roles feed, as one outcome
 * .why = a failure is collected, never thrown, so one broken actor never stops the rest
 */
const getOneDeclaredActorOutcome = async (
  input: {
    actor: ActorOndisk;
    slugsDeclared: Set<string>;
    isRepoActor: boolean;
    refsLinked: RoleLinkRef[];
    rolesAmbient: RoleSlug[];
  },
  context: ContextCli,
): Promise<DeltaActorOutcome> => {
  const { actor } = input;
  try {
    // the roles the actor stands for today; null where its base is no longer declared
    const manifestPath = getActorManifestPath({ actor });
    const recorded = getActorOndiskManifest({
      manifestPath,
      exid: actor.exid,
    });
    const rolesNext = await getDeclaredActorRolesOrNull(
      {
        actor,
        rolesDelta: recorded.rolesDelta,
        slugsDeclared: input.slugsDeclared,
        isRepoActor: input.isRepoActor,
        refsLinked: input.refsLinked,
        rolesAmbient: input.rolesAmbient,
      },
      context,
    );
    if (rolesNext === null) return null;
    const rolesBefore: RoleSlug[] = recorded.roles;
    if (isRolesetEqual({ left: rolesNext, right: rolesBefore })) return null;

    // the settings and the boot first, then the record. the record is what says "already
    //   re-derived": were it written first, a fault after it would leave it ahead, and the
    //   next init would see equal roles and never retry. this order converges
    await setActorSettingsDerived({
      actor: { ...actor, roles: rolesNext },
      repoPath: actor.repoPath,
    });
    if (!input.isRepoActor)
      await setBrainDirBoot({
        brainDir: getBrainOndiskDir({
          actorDir: getActorOndiskDir({
            repoPath: actor.repoPath,
            exid: actor.exid,
          }),
        }),
        roles: asRoleRefsForEnrolledSlugs({
          actorExid: actor.exid,
          slugs: rolesNext,
          refsLinked: input.refsLinked,
        }),
        repoPath: actor.repoPath,
        scope: { kind: 'actor', actorExid: actor.exid },
      });
    await setActorOndiskManifestRoles({ actor, roles: rolesNext });
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
                'declared actor re-derive threw a non-Error value',
                {
                  actorExid: actor.exid,
                  reason: error,
                  hint: `rerun \`rhx init\`; if it fails again, check .agent/actors.yml and .agent/.actors/actor.via.${actor.exid}/actor.json`,
                },
              ),
      },
    };
  }
};

/**
 * .what = the roles one declared actor stands for today, or null where its base slug is no
 *         longer declared
 * .note = the derived form is the same one enroll runs (`asActorFormEnrollment`), so init and
 *   `rhx clone @<x> +role` agree on what a derived actor holds
 */
const getDeclaredActorRolesOrNull = async (
  input: {
    actor: ActorOndisk;
    rolesDelta: string[] | null;
    slugsDeclared: Set<string>;
    isRepoActor: boolean;
    refsLinked: RoleLinkRef[];
    rolesAmbient: RoleSlug[];
  },
  context: ContextCli,
): Promise<RoleSlug[] | null> => {
  // the repo actor holds the ambient roles, at their recorded focus
  if (input.isRepoActor) return input.rolesAmbient;

  // the base slug, which must still be declared
  const slugBase = asSlugBaseOfActorExid({ exid: input.actor.exid });
  if (!input.slugsDeclared.has(slugBase)) return null;

  // the base expanded today, with the actor's own brain and delta on top
  //   .note = a slug actor holds no delta; `getRoleDeltas` refuses an empty list, so none is parsed
  const expanded = await getOneActorExpandedOfRepo(
    { actor: { slug: slugBase } },
    context,
  );
  if (expanded === null) return null;
  const tokens = input.rolesDelta ?? [];
  return asActorFormEnrollment({
    expanded,
    brainFlag: input.actor.brain,
    spec: new BrainCliEnrollmentSpec({
      mode: 'incremental',
      deltas: tokens.length === 0 ? [] : getRoleDeltas({ tokens }),
    }),
    refsLinked: input.refsLinked,
  }).roles;
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
 * .what = the declared actors on disk, or the one failure that stopped the read
 * .why = an unreadable actor dir is a sync failure to report, never a throw
 */
const getAllDeclaredActorsOrFailure = (input: {
  repoPath: string;
}): { actors: ActorOndisk[] } | { failure: BrainDirBootFailure } => {
  try {
    return {
      actors: asActorsDeclared({
        actors: getAllActorsOndisk({ repoPath: input.repoPath }),
      }),
    };
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
                'declared actor enumeration threw a non-Error value',
                {
                  reason: error,
                  hint: 'rerun `rhx init`; if it fails again, check that .agent/.actors/ is readable',
                },
              ),
      },
    };
  }
};
