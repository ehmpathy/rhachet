import { ConstraintError } from 'helpful-errors';

import type { RoleRegistry } from '@src/domain.objects';

/**
 * .what = ensure we fail fast upon duplicate role.slugs across registries
 *
 * 🔴 .note = CONSTRAINT, never malfunction. the caller chose which registries to link, so a
 *   collision between two of them is theirs to settle — unlink one, or rename the role in
 *   the registry they own. a bare `Error` reaches `asCliErrorClassified` unclassified and is
 *   wrapped at exit 1, which tells the caller the SERVER broke on a fault only they can fix
 *   (`rule.require.failloud`, `rule.require.exit-code-semantics`).
 *
 * 🔴 .note = the message carries NO glyph of its own. a thrown error reaches a human through
 *   `asCliErrorFrame`, which prefixes the class glyph itself (`✋ ConstraintError:` /
 *   `💥 MalfunctionError:`) — so a glyph inside the message renders twice, and the inner one
 *   is the copy that can disagree with the class (`rule.forbid.stormcloud-for-errors`)
 */
export const assureUniqueRoles = (registries: RoleRegistry[]): void => {
  // 🟡 .note = DELIBERATE MUTATION — `seen` grows per role. the throw needs the FIRST registry
  //   that claimed a slug at the moment the second one appears, which a fold would reach only
  //   after the whole walk
  const seen = new Map<string, string>(); // slug → registry.slug
  for (const registry of registries) {
    for (const role of registry.roles) {
      const slugRegistrySeen = seen.get(role.slug);
      if (slugRegistrySeen !== undefined)
        ConstraintError.throw('two registries declare the same role.slug', {
          slugRole: role.slug,
          slugRegistryFirst: slugRegistrySeen,
          slugRegistrySecond: registry.slug,
          why: 'a role.slug addresses one role, so two registries that claim it leave every lookup ambiguous',
          hint: `unlink one of the two registries, or rename the role in whichever you own`,
        });
      seen.set(role.slug, registry.slug);
    }
  }
};
