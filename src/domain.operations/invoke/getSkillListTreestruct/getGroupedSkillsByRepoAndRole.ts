import type { RoleSkillExecutable } from '@src/domain.objects/RoleSkillExecutable';

/**
 * .what = groups skills by repo > role hierarchy
 * .why = enables treestruct output where skills nest under roles under repos
 */
export const getGroupedSkillsByRepoAndRole = (input: {
  skills: RoleSkillExecutable[];
}): {
  slugRepo: string;
  roles: {
    slugRole: string;
    skills: RoleSkillExecutable[];
  }[];
}[] => {
  // group skills by repo > role via reduce
  const grouped = input.skills.reduce(
    (acc, skill) => {
      const repoKey = skill.slugRepo;
      const roleKey = skill.slugRole;

      // get or create repo entry
      const repoEntry = acc[repoKey] ?? {};

      // get or create role entry
      const roleSkills = repoEntry[roleKey] ?? [];

      return {
        ...acc,
        [repoKey]: {
          ...repoEntry,
          [roleKey]: [...roleSkills, skill],
        },
      };
    },
    {} as Record<string, Record<string, RoleSkillExecutable[]>>,
  );

  // convert to sorted array format
  // .note = non-null assertions safe because keys come from Object.keys(grouped)
  return Object.keys(grouped)
    .sort()
    .map((slugRepo) => ({
      slugRepo,
      roles: Object.keys(grouped[slugRepo]!)
        .sort()
        .map((slugRole) => ({
          slugRole,
          skills: [...grouped[slugRepo]![slugRole]!].sort((a, b) =>
            a.slug.localeCompare(b.slug),
          ),
        })),
    }));
};
