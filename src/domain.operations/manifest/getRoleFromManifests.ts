import { BadRequestError } from 'helpful-errors';

import type { RoleManifest } from '@src/domain.objects/RoleManifest';
import type { RoleRegistryManifest } from '@src/domain.objects/RoleRegistryManifest';
import type { RoleSpecifier } from '@src/domain.objects/RoleSpecifier';

import { parseRoleSpecifier } from '../invoke/parseRoleSpecifier';

/**
 * .what = gets a single role from manifests by specifier
 * .why = unified role lookup for link/init/ask operations
 *
 * .note = fail-fast on error (not found, ambiguous)
 * .note = throws BadRequestError, does not return errors
 */
export const getRoleFromManifests = (input: {
  specifier: RoleSpecifier;
  manifests: RoleRegistryManifest[];
}): { repo: RoleRegistryManifest; role: RoleManifest } => {
  // parse the specifier
  const parsed = parseRoleSpecifier({ specifier: input.specifier });

  // find the manifest (qualified or unqualified)
  const manifest = (() => {
    // qualified specifier: find exact manifest match
    if (parsed.repo) {
      const found = input.manifests.find((m) => m.slug === parsed.repo);
      if (!found) {
        throw new BadRequestError(`manifest "${parsed.repo}" not found`, {
          specifier: input.specifier,
          availableManifests: input.manifests.map((m) => m.slug),
        });
      }
      return found;
    }

    // unqualified specifier: find manifest that contains the role
    const candidates = input.manifests.filter((m) =>
      m.roles.some((r) => r.slug === parsed.role),
    );

    // no manifest has this role
    if (candidates.length === 0) {
      throw new BadRequestError(`role "${parsed.role}" not found`, {
        specifier: input.specifier,
        availableRoles: input.manifests.flatMap((m) =>
          m.roles.map((r) => `${m.slug}/${r.slug}`),
        ),
      });
    }

    // multiple manifests have this role — ambiguous
    if (candidates.length > 1) {
      throw new BadRequestError(
        `role "${parsed.role}" is ambiguous — found in multiple manifests`,
        {
          specifier: input.specifier,
          foundIn: candidates.map((m) => m.slug),
          hint: `use qualified specifier: ${candidates.map((m) => `${m.slug}/${parsed.role}`).join(' or ')}`,
        },
      );
    }

    return candidates[0]!;
  })();

  // find the role within the manifest
  const role = manifest.roles.find((r) => r.slug === parsed.role);
  if (!role) {
    throw new BadRequestError(
      `role "${parsed.role}" not found in manifest "${manifest.slug}"`,
      {
        specifier: input.specifier,
        availableRoles: manifest.roles.map((r) => r.slug),
      },
    );
  }

  return { repo: manifest, role };
};
