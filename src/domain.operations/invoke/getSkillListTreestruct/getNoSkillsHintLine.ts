/**
 * .what = formats hint line when no skills are found
 * .why = guides user to link roles if no skills discovered
 */
export const getNoSkillsHintLine = (input: {
  count: number;
}): string | null => {
  if (input.count > 0) return null;
  return '      └─ hint: run `rhachet roles link` to add skills';
};
