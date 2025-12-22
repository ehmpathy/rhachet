import { BadRequestError } from 'helpful-errors';

import type { RoleSkillExecutable } from '@src/domain.objects/RoleSkillExecutable';

import { discoverSkillExecutables } from './discoverSkillExecutables';

/**
 * .what = finds exactly one skill executable by slug, with optional repo/role filters
 * .why = ensures unambiguous skill resolution before execution
 */
export const findUniqueSkillExecutable = (input: {
  repoSlug?: string;
  roleSlug?: string;
  skillSlug: string;
}): RoleSkillExecutable => {
  // discover skills with filters
  const matches = discoverSkillExecutables({
    repoSlug: input.repoSlug,
    roleSlug: input.roleSlug,
    skillSlug: input.skillSlug,
  });

  // handle no matches
  if (matches.length === 0) {
    const filters = [
      input.repoSlug ? `--repo ${input.repoSlug}` : null,
      input.roleSlug ? `--role ${input.roleSlug}` : null,
    ]
      .filter(Boolean)
      .join(' ');

    const hint = filters
      ? `no skill "${input.skillSlug}" found with ${filters}`
      : `no skill "${input.skillSlug}" found in any linked role`;

    BadRequestError.throw(hint, { input });
  }

  // handle multiple matches
  if (matches.length > 1) {
    const matchList = matches
      .map((m) => `  - repo=${m.repoSlug} role=${m.roleSlug}`)
      .join('\n');

    BadRequestError.throw(
      `multiple skills found for "${input.skillSlug}":\n${matchList}\n\nuse --repo and/or --role to disambiguate`,
      { input, matches },
    );
  }

  // return unique match
  return matches[0]!;
};
