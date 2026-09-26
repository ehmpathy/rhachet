import { sep } from 'node:path';

/**
 * .what = all files of a role dir → its brief files, less the work-in-progress and
 *         deprecated brief dirs
 * .why = a `.scratch/` or `.archive/` brief must never reach a boot corpus
 *
 * .note = the prefix ends at a path separator, never mid-name: the caller hands over a
 *   dir that carries no separator at its end, so a bare `startsWith` would take a PEER
 *   dir whose name merely opens the same way (`briefs-archive/`) into the corpus
 */
export const asRoleBriefFiles = (input: {
  allFiles: string[];
  briefsDir: string;
}): string[] => {
  const dirsBlocked = ['.scratch', '.archive'];
  const isBlocked = (file: string) =>
    dirsBlocked.some((dir) => file.includes(`/${dir}/`));
  return input.allFiles.filter(
    (file) => file.startsWith(`${input.briefsDir}${sep}`) && !isBlocked(file),
  );
};
