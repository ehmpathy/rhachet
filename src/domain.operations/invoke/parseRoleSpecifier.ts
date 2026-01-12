import { BadRequestError } from 'helpful-errors';

import type { RoleSpecifier } from '@src/domain.objects/RoleSpecifier';

/**
 * .what = parses a role specifier into repo and role components
 * .why = enables disambiguation logic when roles are resolved from registries
 *
 * .note = format: "role" or "repo/role"
 */
export const parseRoleSpecifier = (input: {
  specifier: RoleSpecifier;
}): { repo: string | null; role: string } => {
  // validate specifier is not empty
  const trimmed = input.specifier.trim();
  if (!trimmed)
    throw new BadRequestError('role specifier cannot be empty', {
      specifier: input.specifier,
    });

  // check for repo/role format
  const slashIndex = trimmed.indexOf('/');

  // no slash => unqualified role
  if (slashIndex === -1) return { repo: null, role: trimmed };

  // extract repo and role parts
  const repo = trimmed.slice(0, slashIndex);
  const role = trimmed.slice(slashIndex + 1);

  // validate both parts are non-empty
  if (!repo)
    throw new BadRequestError('repo part of specifier cannot be empty', {
      specifier: input.specifier,
    });

  if (!role)
    throw new BadRequestError('role part of specifier cannot be empty', {
      specifier: input.specifier,
    });

  // validate no additional slashes
  if (role.includes('/'))
    throw new BadRequestError('role specifier cannot have multiple slashes', {
      specifier: input.specifier,
    });

  return { repo, role };
};
