import { ConstraintError } from 'helpful-errors';

import type { RoleManifest } from '@src/domain.objects/RoleManifest';
import type { RoleRegistryManifest } from '@src/domain.objects/RoleRegistryManifest';
import type { RoleSpecifier } from '@src/domain.objects/RoleSpecifier';
import { parseRoleSpecifier } from '@src/domain.operations/roles/parseRoleSpecifier';

/**
 * .what = the tail of a hint that lists what IS available, or says outright that naught is
 * .why  = an empty list renders `available roles: ` — a label with no payload, which sends
 *   a reader to compare against a list that is not there. the empty case is the one a
 *   newcomer hits first, and it is the one the bare interpolation reports worst
 *   (`rule.require.errors-name-the-fix`)
 */
const asAvailableHint = (input: {
  label: string;
  options: string[];
  whenEmpty: string;
}): string =>
  input.options.length === 0
    ? input.whenEmpty
    : `${input.label}: ${input.options.join(', ')}`;

/**
 * .what = gets a single role from manifests by specifier
 * .why = unified role lookup for link/init/ask operations
 *
 * .note = fail-fast on error (not found, ambiguous). every failure here is a mistyped
 *   specifier, so the class is `ConstraintError` — the caller's to amend, exit 2
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
        const availableManifests = input.manifests.map((m) => m.slug);
        throw new ConstraintError(`manifest "${parsed.repo}" not found`, {
          specifier: input.specifier,
          availableManifests,
          hint: asAvailableHint({
            label: 'available manifests',
            options: availableManifests,
            whenEmpty:
              'no manifests are linked yet — run `rhx init --roles <role>` to link one',
          }),
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
      const availableRoles = input.manifests.flatMap((m) =>
        m.roles.map((r) => `${m.slug}/${r.slug}`),
      );
      throw new ConstraintError(`role "${parsed.role}" not found`, {
        specifier: input.specifier,
        availableRoles,
        hint: asAvailableHint({
          label: 'available roles',
          options: availableRoles,
          whenEmpty:
            'no roles are linked yet — run `rhx init --roles <role>` to link one',
        }),
      });
    }

    // multiple manifests have this role — ambiguous
    if (candidates.length > 1) {
      throw new ConstraintError(
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
    const availableRoles = manifest.roles.map((r) => r.slug);
    throw new ConstraintError(
      `role "${parsed.role}" not found in manifest "${manifest.slug}"`,
      {
        specifier: input.specifier,
        availableRoles,
        hint: asAvailableHint({
          label: `available roles in "${manifest.slug}"`,
          options: availableRoles,
          whenEmpty: `the manifest "${manifest.slug}" declares no roles at all`,
        }),
      },
    );
  }

  return { repo: manifest, role };
};
