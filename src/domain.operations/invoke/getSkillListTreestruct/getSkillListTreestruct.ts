import type { RoleSkillExecutable } from '@src/domain.objects/RoleSkillExecutable';

import { getCommandHeader } from './getCommandHeader';
import { getGroupedSkillsByRepoAndRole } from './getGroupedSkillsByRepoAndRole';
import { getIsSlugMatch } from './getIsSlugMatch';
import { getNoSkillsHintLine } from './getNoSkillsHintLine';
import { getRepoTreeLines } from './getRepoTreeLines';
import { getSkillCountLine } from './getSkillCountLine';

/**
 * .what = transforms skills list into treestruct output lines
 * .why = provides scannable visual output for rhx list command
 */
export const getSkillListTreestruct = (input: {
  skills: RoleSkillExecutable[];
  pattern: string | null;
  truncate: boolean;
}): string[] => {
  // filter skills by pattern
  const filtered = input.skills.filter((skill) =>
    getIsSlugMatch({ slug: skill.slug, pattern: input.pattern }),
  );

  // group by repo > role
  const grouped = getGroupedSkillsByRepoAndRole({ skills: filtered });

  // compose output lines
  const header = getCommandHeader({ pattern: input.pattern });
  const countLine = getSkillCountLine({ count: filtered.length });
  const treeLines = getRepoTreeLines({ grouped, truncate: input.truncate });
  const hintLine = getNoSkillsHintLine({ count: filtered.length });

  return [header, countLine, ...treeLines, hintLine].filter(
    (line): line is string => line !== null,
  );
};
