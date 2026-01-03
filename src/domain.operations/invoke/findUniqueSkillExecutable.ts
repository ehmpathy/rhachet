import { BadRequestError } from 'helpful-errors';

import type { RoleSkillExecutable } from '@src/domain.objects/RoleSkillExecutable';

import { discoverSkillExecutables } from './discoverSkillExecutables';

/**
 * .what = finds exactly one skill executable by slug, with optional repo/role filters
 * .why = ensures unambiguous skill resolution before execution
 */
export const findUniqueSkillExecutable = (input: {
  slugRepo?: string;
  slugRole?: string;
  slugSkill: string;
}): RoleSkillExecutable => {
  // discover skills with filters
  const matches = discoverSkillExecutables({
    slugRepo: input.slugRepo,
    slugRole: input.slugRole,
    slugSkill: input.slugSkill,
  });

  // handle no matches
  if (matches.length === 0) {
    const filters = [
      input.slugRepo ? `--repo ${input.slugRepo}` : null,
      input.slugRole ? `--role ${input.slugRole}` : null,
    ]
      .filter(Boolean)
      .join(' ');

    const hint = filters
      ? `no skill "${input.slugSkill}" found with ${filters}`
      : `no skill "${input.slugSkill}" found in any linked role`;

    // discover all available skills to show suggestions
    const allSkills = discoverSkillExecutables({
      slugRepo: input.slugRepo,
      slugRole: input.slugRole,
    });
    const suggestions =
      allSkills.length > 0
        ? `\n\navailable skills:\n${allSkills
            .slice(0, 5)
            .map((s) => `  - ${s.slug} (repo=${s.slugRepo} role=${s.slugRole})`)
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
      .map((m) => `  - repo=${m.slugRepo} role=${m.slugRole}`)
      .join('\n');

    BadRequestError.throw(
      `multiple skills found for "${input.slugSkill}":\n${matchList}\n\nuse --repo and/or --role to disambiguate`,
      { input, matches },
    );
  }

  // return unique match
  return matches[0]!;
};
