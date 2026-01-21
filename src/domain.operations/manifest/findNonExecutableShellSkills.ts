import type { RoleRegistry } from '@src/domain.objects';
import { getAllFilesFromDir } from '@src/infra/filesystem/getAllFilesFromDir';

import { accessSync, constants } from 'node:fs';

/**
 * .what = extracts uri strings from dirs config
 * .why = normalizes single vs array format to string array
 */
const extractDirUris = (
  dirs: { uri: string } | { uri: string }[],
): string[] => {
  if (Array.isArray(dirs)) return dirs.map((d) => d.uri);
  return [dirs.uri];
};

/**
 * .what = checks if a file has execute permission
 * .why = determines if a .sh file can be executed
 */
const isExecutable = (filePath: string): boolean => {
  try {
    accessSync(filePath, constants.X_OK);
    return true;
  } catch {
    return false;
  }
};

/**
 * .what = finds all .sh files in skills directories that lack execute permission
 * .why = enables validation before manifest generation to prevent broken skill publish
 *
 * .note = returns absolute paths to non-executable .sh files
 */
export const findNonExecutableShellSkills = (input: {
  registry: RoleRegistry;
}): string[] => {
  const { registry } = input;
  const nonExecutablePaths: string[] = [];

  // iterate all roles in the registry
  for (const role of registry.roles) {
    // extract skill directory uris
    const skillDirUris = extractDirUris(role.skills.dirs);

    // enumerate files from each skills directory
    for (const dirUri of skillDirUris) {
      const allFiles = getAllFilesFromDir(dirUri);

      // filter to .sh files and check executability
      for (const filePath of allFiles) {
        if (!filePath.endsWith('.sh')) continue;
        if (!isExecutable(filePath)) {
          nonExecutablePaths.push(filePath);
        }
      }
    }
  }

  return nonExecutablePaths;
};
