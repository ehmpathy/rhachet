import { BadRequestError } from 'helpful-errors';

import type { RoleRegistry } from '@src/domain.objects/RoleRegistry';

/**
 * .what = infers the repo (registry) when only one has the specified role
 * .why = allows omitting --repo when there's no ambiguity
 * .how = searches registries for the one containing the role
 */
export const inferRepoByRole = (input: {
  registries: RoleRegistry[];
  slugRole: string;
}): RoleRegistry => {
  // Find all registries (repos) that have the specified role
  const matchingRepos = input.registries.filter((registry) =>
    registry.roles.some((role) => role.slug === input.slugRole),
  );

  // Handle unique match
  if (matchingRepos.length === 1) return matchingRepos[0]!;

  // Handle ambiguous case
  if (matchingRepos.length > 1) {
    const repoList = matchingRepos.map((r) => `  - ${r.slug}`).join('\n');
    BadRequestError.throw(
      `Multiple repos have role "${input.slugRole}":\n${repoList}\nPlease specify --repo to disambiguate.`,
    );
  }

  // Handle not found case
  BadRequestError.throw(
    `No repo has role "${input.slugRole}".\nCheck that the role exists in your registries.`,
  );
};
