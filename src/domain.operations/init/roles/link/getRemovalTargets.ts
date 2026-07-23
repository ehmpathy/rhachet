import { BadRequestError } from 'helpful-errors';

import type { RoleSpecifier } from '@src/domain.objects/RoleSpecifier';
import { parseRoleSpecifier } from '@src/domain.operations/roles/parseRoleSpecifier';
import type { RoleLinkRef } from '@src/domain.operations/upgrade/discoverLinkedRoles';

/**
 * .what = maps `-role` remove specifiers to concrete { repo, role } unlink targets
 * .why = removal reads the linked set (not manifests), so it needs its own
 *        lookup + ambiguity guard, modeled on getRoleFromManifests for adds
 *
 * .note = deps injected (linkedRoles, nativeRoles) → pure + unit-testable
 * .note = an unqualified slug present under 2+ linked repos is ambiguous → reject
 * .note = native roles (repo=.this) cannot be removed → reject
 * .note = a slug absent from the linked set is a silent no-op (idempotent);
 *   it is simply omitted from the returned targets
 */
export const getRemovalTargets = (input: {
  removes: RoleSpecifier[];
  linkedRoles: RoleLinkRef[];
  nativeRoles: string[];
}): { repo: string; role: string }[] => {
  // map each specifier to 0-or-1 unlink target — immutable flatMap, no mutation
  return input.removes.flatMap(
    (specifier): { repo: string; role: string }[] => {
      const parsed = parseRoleSpecifier({ specifier });

      // reject explicit native qualification — native roles are not removable
      if (parsed.repo === '.this')
        throw new BadRequestError(
          'native roles (repo=.this) cannot be removed',
          { specifier },
        );

      // qualified specifier: match the exact repo + role in the linked set
      if (parsed.repo) {
        const found = input.linkedRoles.find(
          (linked) =>
            linked.repo === parsed.repo && linked.role === parsed.role,
        );
        // absent qualified target → no-op (idempotent), omit from targets
        return found ? [{ repo: found.repo, role: found.role }] : [];
      }

      // unqualified specifier: match by role slug across linked repos
      const candidates = input.linkedRoles.filter(
        (linked) => linked.role === parsed.role,
      );

      // ambiguous — same slug linked under multiple repos
      if (candidates.length > 1)
        throw new BadRequestError(
          `role "${parsed.role}" is ambiguous — linked under multiple repos`,
          {
            specifier,
            foundIn: candidates.map((c) => c.repo),
            hint: `qualify the removal: ${candidates
              .map((c) => `-${c.repo}/${parsed.role}`)
              .join(' or ')}`,
          },
        );

      // exactly one linked match → unlink target
      if (candidates.length === 1)
        return [{ repo: candidates[0]!.repo, role: candidates[0]!.role }];

      // no linked match — reject if it names a native role, else no-op
      if (input.nativeRoles.includes(parsed.role))
        throw new BadRequestError(
          'native roles (repo=.this) cannot be removed',
          { specifier },
        );

      // slug absent from the linked set → silent no-op (idempotent)
      return [];
    },
  );
};
