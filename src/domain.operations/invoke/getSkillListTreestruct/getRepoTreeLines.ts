import type { RoleSkillExecutable } from '@src/domain.objects/RoleSkillExecutable';

const DEFAULT_TRUNCATE_LIMIT = 10;

/**
 * .what = formats repo > role > skill tree lines
 * .why = provides scannable hierarchical view of available skills
 *
 * .note = adds blank connector line before first repo to connect from count line
 *         adds blank connector line between repos for visual separation
 */
export const getRepoTreeLines = (input: {
  grouped: {
    slugRepo: string;
    roles: {
      slugRole: string;
      skills: RoleSkillExecutable[];
    }[];
  }[];
  truncate: boolean;
}): string[] => {
  return input.grouped.flatMap((repo, repoIdx) => {
    const isFirstRepo = repoIdx === 0;
    const isLastRepo = repoIdx === input.grouped.length - 1;
    const repoPrefix = isLastRepo ? '└─' : '├─';
    const repoIndent = isLastRepo ? '   ' : '│  ';

    // add blank connector line before repo for visual separation
    const blankLine = isFirstRepo || isLastRepo ? '   │' : '   │';
    const repoLine = `   ${repoPrefix} repo=${repo.slugRepo}`;

    const roleLines = repo.roles.flatMap((role, roleIdx) => {
      const isLastRole = roleIdx === repo.roles.length - 1;
      const rolePrefix = isLastRole ? '└─' : '├─';
      const roleIndent = isLastRole ? '   ' : '│  ';

      const roleLine = `   ${repoIndent}${rolePrefix} role=${role.slugRole}`;

      // determine how many skills to show
      const skills = role.skills;
      const limit = input.truncate ? DEFAULT_TRUNCATE_LIMIT : skills.length;
      const shown = skills.slice(0, limit);
      const omitted = skills.length - shown.length;

      const skillLines = shown.map((skill, skillIdx) => {
        const isLastSkill = skillIdx === shown.length - 1 && omitted === 0;
        const skillPrefix = isLastSkill ? '└─' : '├─';
        return `   ${repoIndent}${roleIndent}${skillPrefix} ${skill.slug}`;
      });

      // truncation hint
      const truncationLine =
        omitted > 0
          ? [
              `   ${repoIndent}${roleIndent}└─ ... (${omitted} more, use --all to see all)`,
            ]
          : [];

      return [roleLine, ...skillLines, ...truncationLine];
    });

    return [blankLine, repoLine, ...roleLines];
  });
};
