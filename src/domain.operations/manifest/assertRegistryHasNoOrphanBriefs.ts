import type { RoleRegistry } from '@src/domain.objects';
import { assertZeroOrphanMinifiedBriefs } from '@src/domain.operations/role/briefs/assertZeroOrphanMinifiedBriefs';
import { getRoleBriefRefs } from '@src/domain.operations/role/briefs/getRoleBriefRefs';
import { getAllFilesFromDir } from '@src/infra/filesystem/getAllFilesFromDir';

type RoleOfRegistry = RoleRegistry['roles'][number];

/**
 * .what = a role's briefs dirs, as a list whether it declared one dir or many
 * .why = the loop reads one shape rather than decode the single-or-list union inline
 */
const getAllBriefsDirsOfRole = (input: {
  role: RoleOfRegistry;
}): Extract<RoleOfRegistry['briefs']['dirs'], unknown[]> =>
  Array.isArray(input.role.briefs.dirs)
    ? input.role.briefs.dirs
    : [input.role.briefs.dirs];

/**
 * .what = validates that no role in the registry has orphan .md.min briefs
 * .why = fail fast at repo introspect to catch briefs that lack their source file
 *
 * .note = iterates all roles and their briefs.dirs to check for orphans
 */
export const assertRegistryHasNoOrphanBriefs = (input: {
  registry: RoleRegistry;
}): void => {
  const { registry } = input;

  // iterate all roles and their briefs directories
  for (const role of registry.roles) {
    for (const briefsDir of getAllBriefsDirsOfRole({ role })) {
      const briefFiles = getAllFilesFromDir({ dir: briefsDir.uri }).sort();
      const { orphans } = getRoleBriefRefs({
        briefFiles,
        briefsDir: briefsDir.uri,
      });
      assertZeroOrphanMinifiedBriefs({ orphans });
    }
  }
};
