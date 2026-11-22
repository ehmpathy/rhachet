import type { RoleContentDefect } from '@src/domain.objects/RoleContentDefect';

/**
 * .what = the defects of several renders, each file and kind once, in first-seen order
 * .why = one sweep renders one role into several brain dirs; its defect is one fact, so a
 *        receipt names it once rather than once per brain dir
 */
export const asRoleContentDefectsUnique = (input: {
  defects: RoleContentDefect[];
}): RoleContentDefect[] => {
  // key each defect by kind and file; a Map keeps the first defect seen per key, in order
  const byKey = new Map<string, RoleContentDefect>();
  input.defects.forEach((defect) => {
    const key = `${defect.kind}:${defect.pathToFile}`;
    if (!byKey.has(key)) byKey.set(key, defect);
  });
  return [...byKey.values()];
};
