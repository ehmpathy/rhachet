import { sep } from 'node:path';

/**
 * .what = all files of a role dir → its skill files
 * .why = the peer of `asRoleBriefFiles`, so the boot renderer splits a role dir by name
 *
 * .note = the prefix ends at a path separator, never mid-name: the caller hands over a
 *   dir with no trailing separator, so a bare `startsWith` would take a PEER dir whose
 *   name merely opens the same way (`skills-archive/`, `skills.bak/`) into the corpus
 */
export const asRoleSkillFiles = (input: {
  allFiles: string[];
  skillsDir: string;
}): string[] =>
  input.allFiles.filter((file) => file.startsWith(`${input.skillsDir}${sep}`));
