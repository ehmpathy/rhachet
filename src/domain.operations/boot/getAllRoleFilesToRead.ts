import { asPathItself } from '@src/domain.operations/mods/asPathItself';
import { asPathsSorted } from '@src/domain.operations/mods/asPathsSorted';
import { getAllRoleFilesAsPublished } from '@src/domain.operations/mods/getAllRoleFilesAsPublished';
import { getAllFilesFromDir } from '@src/infra/filesystem/getAllFilesFromDir';

/**
 * .what = every file a boot of one role reads, and the path each one is read from
 * .why = a boot reads the role as its mod gate ruled: a skipped mod is skipped whole, so the role
 *        reads as published (F03); else the role dir is read as it lies on disk, each file from
 *        its own path
 *
 * .note = `cwdOfSkippedMod` is the repo root where the gate skipped this role's mod, else null
 * .note = the files come sorted, so a caller that dedupes keeps one path per file on every host
 */
export const getAllRoleFilesToRead = (input: {
  roleDir: string;
  cwdOfSkippedMod: string | null;
  skipDirNames: string[];
}): { files: string[]; asPathToRead: (path: string) => string } => {
  // a skipped mod: the published role, read through the register of its sources
  if (input.cwdOfSkippedMod !== null)
    return getAllRoleFilesAsPublished({
      roleDir: input.roleDir,
      cwd: input.cwdOfSkippedMod,
      skipDirNames: input.skipDirNames,
    });

  // else the role dir as it lies, each file read from its own path
  const files = getAllFilesFromDir(
    { dir: input.roleDir },
    { skipDirNames: input.skipDirNames },
  );
  return { files: asPathsSorted({ paths: files }), asPathToRead: asPathItself };
};
