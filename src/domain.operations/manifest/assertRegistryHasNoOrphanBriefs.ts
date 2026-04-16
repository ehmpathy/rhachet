import type { RoleRegistry } from '@src/domain.objects';
import { assertZeroOrphanMinifiedBriefs } from '@src/domain.operations/role/briefs/assertZeroOrphanMinifiedBriefs';
import { getRoleBriefRefs } from '@src/domain.operations/role/briefs/getRoleBriefRefs';
import { getAllFilesFromDir } from '@src/infra/filesystem/getAllFilesFromDir';

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
    const briefsDirs = Array.isArray(role.briefs.dirs)
      ? role.briefs.dirs
      : [role.briefs.dirs];

    for (const briefsDir of briefsDirs) {
      const briefFiles = getAllFilesFromDir(briefsDir.uri).sort();
      const { orphans } = getRoleBriefRefs({
        briefFiles,
        briefsDir: briefsDir.uri,
      });
      assertZeroOrphanMinifiedBriefs({ orphans });
    }
  }
};
