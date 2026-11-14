import type { ActorsManifest } from '@src/domain.objects/ActorsManifest';

import { asRolesFirstDeclared } from './asRolesFirstDeclared';
import { type GetPublishedActor, getActorExpanded } from './getActorExpanded';

/**
 * .what = the union of every declared actor's expanded roles, each with its declared source
 * .why = `rhachet init` under a manifest links the union, so every declared actor — not only
 *        the repo actor — finds its roles linked (F6, A4)
 *
 * .note = the first actor to declare a role names its source; a later duplicate is dropped
 * .note = every actor expands here, so an invalid base, cycle, or brainless actor fails fast
 *         before any link is written (case=7)
 */
export const getActorsRoleUnion = (
  input: { manifest: ActorsManifest },
  context: { getPublishedActor: GetPublishedActor },
): { roles: { role: string; via: string | null }[]; warnings: string[] } => {
  // expand each declared actor
  const expansions = input.manifest.actor.map((actor) =>
    getActorExpanded(
      { ref: `@${actor.slug}`, scope: null, trail: [] },
      {
        manifest: input.manifest,
        getPublishedActor: context.getPublishedActor,
      },
    ),
  );

  // union the roles, first source wins
  const roles = asRolesFirstDeclared({
    entries: expansions.flatMap((expanded) =>
      expanded.roles.map((role) => ({
        role,
        via: expanded.rolesVia[role] ?? null,
      })),
    ),
  });

  return {
    roles,
    warnings: expansions.flatMap((expanded) => expanded.warnings),
  };
};
