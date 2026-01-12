import { BadRequestError } from 'helpful-errors';

import type { Role, RoleRegistry } from '@src/domain.objects';
import type { RoleSpecifier } from '@src/domain.objects/RoleSpecifier';

import { inferRepoByRole } from './inferRepoByRole';
import { parseRoleSpecifier } from './parseRoleSpecifier';

/**
 * .what = a role resolved from a specifier, with its source registry
 * .why = enables callers to know where the role came from for disambiguation
 */
export interface ResolvedRole {
  specifier: RoleSpecifier;
  registry: RoleRegistry;
  role: Role;
}

/**
 * .what = resolves role specifiers to roles from registries
 * .why = enables init --roles to find roles from installed packages
 *
 * .note = collects all errors before fail, so user sees all issues at once
 */
export const resolveRoleSpecifiers = (input: {
  specifiers: RoleSpecifier[];
  registries: RoleRegistry[];
}): {
  resolved: ResolvedRole[];
  errors: { specifier: RoleSpecifier; error: Error }[];
} => {
  const resolved: ResolvedRole[] = [];
  const errors: { specifier: RoleSpecifier; error: Error }[] = [];

  for (const specifier of input.specifiers) {
    try {
      // parse the specifier
      const parsed = parseRoleSpecifier({ specifier });

      // find the registry
      let registry: RoleRegistry;

      if (parsed.repo) {
        // qualified specifier: find exact registry match
        const found = input.registries.find((r) => r.slug === parsed.repo);
        if (!found)
          throw new BadRequestError(`registry "${parsed.repo}" not found`, {
            specifier,
            availableRegistries: input.registries.map((r) => r.slug),
          });
        registry = found;
      } else {
        // unqualified specifier: infer registry from role
        registry = inferRepoByRole({
          registries: input.registries,
          slugRole: parsed.role,
        });
      }

      // find the role within the registry
      const role = registry.roles.find((r) => r.slug === parsed.role);
      if (!role)
        throw new BadRequestError(
          `role "${parsed.role}" not found in registry "${registry.slug}"`,
          {
            specifier,
            availableRoles: registry.roles.map((r) => r.slug),
          },
        );

      resolved.push({ specifier, registry, role });
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      errors.push({ specifier, error });
    }
  }

  return { resolved, errors };
};
