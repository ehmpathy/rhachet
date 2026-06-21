/**
 * .what = formats the skill count summary line
 * .why = provides quick summary before detailed tree
 *
 * .note = when count > 0, use ├─ since repos follow as siblings
 *         when count = 0, use └─ since only hint follows as child
 */
export const getSkillCountLine = (input: { count: number }): string => {
  if (input.count === 0) {
    return '   └─ 0 skills found';
  }
  if (input.count === 1) {
    return '   ├─ 1 skill found';
  }
  return `   ├─ ${input.count} skills found`;
};
