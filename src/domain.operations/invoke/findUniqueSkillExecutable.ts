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

    // discover all available skills to show suggestions
    const allSkills = discoverSkillExecutables({
      repoSlug: input.repoSlug,
      roleSlug: input.roleSlug,
    });
    const suggestions =
      allSkills.length > 0
        ? `\n\navailable skills:\n${allSkills
            .slice(0, 5)
            .map((s) => `  - ${s.slug} (repo=${s.repoSlug} role=${s.roleSlug})`)
            .join(
              '\n',
            )}${allSkills.length > 5 ? `\n  ... and ${allSkills.length - 5} more` : ''}`
        : '';

    const tip = `\n\ntip: did you \`npx rhachet roles link\` the --role this skill comes from?`;

    BadRequestError.throw(`${hint}${suggestions}${tip}`, { input });
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
