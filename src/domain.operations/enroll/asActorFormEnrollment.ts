import { ConstraintError } from 'helpful-errors';

import type { BrainCliEnrollmentSpec } from '@src/domain.objects/BrainCliEnrollmentSpec';
import type { BrainSlug } from '@src/domain.objects/BrainSlug';
import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';
import type { RoleSlug } from '@src/domain.objects/RoleSlug';
import { asActorRolesDelta } from '@src/domain.operations/actor/enrolled/asActorRolesDelta';
import { genEnrollmentHashOfActorDelta } from '@src/domain.operations/actor/enrolled/genEnrollmentHashOfActorDelta';
import type { ActorExpanded } from '@src/domain.operations/actor/manifest/getActorExpanded';
import { asRoleSlugsOfRefs } from '@src/domain.operations/init/boots/asRoleSlugsOfRefs';
import { isRoleSpecifierMatch } from '@src/domain.operations/roles/isRoleSpecifierMatch';

import { computeBrainCliEnrollment } from './computeBrainCliEnrollment';

/**
 * .what = the actor form's enrollment — a declared actor `@<slug>`, with an optional brain
 *         override and role deltas on top → its brain, its roles, and the exid of its dir
 * .why = the actor supplies brain and roles, so no brain is typed (F10). with no override the
 *        clone lands in the slug actor `actor.via.slug=<slug>`; any override lands it in the
 *        derived actor `actor.via.slug=<slug>._.delta=<h>`, still tethered to its base (S4, S5)
 *
 * .note = a plain role list replaces the actor wholesale — that is the inline form, so it is
 *         refused, and the refusal names the inline form (S6)
 * .note = a brain override equal to the actor's own brain is no override
 */
export const asActorFormEnrollment = (input: {
  expanded: ActorExpanded;
  brainFlag: BrainSlug | null;
  spec: BrainCliEnrollmentSpec;
  refsLinked: RoleLinkRef[];
}): {
  brain: BrainSlug;
  roles: RoleSlug[];
  rolesDelta: string[] | null;
  exid: string;
} => {
  const { expanded } = input;

  // a plain role list is the inline form, never an override of a declared actor
  if (input.spec.mode === 'absolute')
    throw new ConstraintError(
      `a plain role list beside @${expanded.slug} would replace the actor wholesale`,
      {
        actor: `@${expanded.slug}`,
        hint: `pass deltas only (+role, -role) beside @${expanded.slug}, or use the inline form for a one-off composition: rhx enroll <brain> --roles <roles>`,
      },
    );

  // the actor's roles, as the linked role slugs a clone boots
  const rolesBase = expanded.roles.map((specifier) =>
    asRoleSlugLinkedOrThrow({
      specifier,
      actor: expanded.slug,
      refsLinked: input.refsLinked,
    }),
  );

  // the brain and the deltas, over the actor's own roles
  const brain = input.brainFlag ?? expanded.brain;
  const enrollment = computeBrainCliEnrollment({
    brain,
    spec: input.spec,
    rolesAmbient: rolesBase,
    rolesLinked: asRoleSlugsOfRefs({ refs: input.refsLinked }),
  });
  const rolesDelta = asActorRolesDelta({ spec: input.spec });

  // no override → the slug actor; any override → the derived actor over it
  const isBrainOverride = brain !== expanded.brain;
  const exid =
    rolesDelta === null && !isBrainOverride
      ? `slug=${expanded.slug}`
      : `slug=${expanded.slug}._.delta=${genEnrollmentHashOfActorDelta({
          brain,
          base: `@${expanded.slug}`,
          rolesDelta: rolesDelta ?? [],
        })}`;

  return { brain, roles: enrollment.roles, rolesDelta, exid };
};

/**
 * .what = the linked role slug a declared role specifier names, or a refusal that names init
 * .why = a declared role that is not linked cannot boot; `rhx init` links the declared union
 */
const asRoleSlugLinkedOrThrow = (input: {
  specifier: string;
  actor: string;
  refsLinked: RoleLinkRef[];
}): RoleSlug => {
  const ref = input.refsLinked.find((one) =>
    isRoleSpecifierMatch({
      left: input.specifier,
      right: `${one.repo}/${one.role}`,
    }),
  );
  if (ref) return ref.role;
  throw new ConstraintError(
    `@${input.actor} declares role '${input.specifier}', which is not linked`,
    {
      actor: `@${input.actor}`,
      role: input.specifier,
      hint: 'run `rhx init` — it links the roles every declared actor names',
    },
  );
};
