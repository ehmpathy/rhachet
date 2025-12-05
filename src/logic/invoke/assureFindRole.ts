import { BadRequestError } from 'helpful-errors';

import type { Role } from '../../domain/objects/Role';
import type { RoleRegistry } from '../../domain/objects/RoleRegistry';

/**
 * .what = finds the first matching role across registries
 * .why = ensures there is exactly one role match; fails if ambiguous or missing
 */
export const assureFindRole = ({
  registries,
  slug,
}: {
  registries: RoleRegistry[];
  slug: string;
}): Role => {
  const matches = registries
    .flatMap((r) => r.roles)
    .filter((r) => r.slug === slug);
  if (matches.length === 0)
    BadRequestError.throw(`no role named "${slug}" found in any registry`, {
      slug,
    });
  if (matches.length > 1)
    BadRequestError.throw(
      `multiple roles named "${slug}" found across registries`,
      { slug },
    );
  return matches[0]!;
};
