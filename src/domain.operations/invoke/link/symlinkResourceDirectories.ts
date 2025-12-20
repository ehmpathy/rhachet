import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  symlinkSync,
  unlinkSync,
} from 'node:fs';
import { basename, relative, resolve } from 'node:path';

/**
 * .what = recursively counts all leaf files in a directory
 * .why = to provide accurate file counts when linking directories
 */
const countFilesInDirectory = (dirPath: string): number => {
  let count = 0;
  const entries = readdirSync(dirPath);

  for (const entry of entries) {
    const fullPath = resolve(dirPath, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      count += countFilesInDirectory(fullPath);
    } else if (stats.isFile()) {
      count++;
    }
  }

  return count;
};

/**
 * .what = recursively sets all files and directories to readonly
 * .why = prevents agents from accidentally or maliciously overwriting linked resources from node_modules
 */
const setDirectoryReadonly = (dirPath: string): void => {
  const entries = readdirSync(dirPath);

  for (const entry of entries) {
    const fullPath = resolve(dirPath, entry);
    const lstats = lstatSync(fullPath);

    // skip nested symlinks to avoid infinite loops
    if (lstats.isSymbolicLink()) continue;

    if (lstats.isDirectory()) {
      // recurse first, then set directory permissions
      setDirectoryReadonly(fullPath);
      // r-x for directories (need execute to traverse)
      chmodSync(fullPath, 0o555);
    } else if (lstats.isFile()) {
      // r-- for files
      chmodSync(fullPath, 0o444);
    }
  }

  // set the root directory itself to readonly after processing contents
  chmodSync(dirPath, 0o555);
};

/**
 * .what = creates symlinks for resource directories to a target directory
 * .why = enables role resources (briefs, skills, etc.) to be linked from node_modules or other sources
 * .how = creates symlinks for entire directories, returns count of leaf files
 */
export const symlinkResourceDirectories = (options: {
  sourceDirs: Array<{ uri: string }>;
  targetDir: string;
  resourceName: string; // e.g., 'briefs', 'skills'
}): number => {
  const { sourceDirs, targetDir, resourceName } = options;

  if (sourceDirs.length === 0) {
    return 0;
  }

  let totalFileCount = 0;

  for (const sourceDir of sourceDirs) {
    const sourcePath = resolve(process.cwd(), sourceDir.uri);

    if (!existsSync(sourcePath)) {
      continue; // Skip if source doesn't exist
    }

    // Create target directory parent if needed
    mkdirSync(targetDir, { recursive: true });

    // Create a unique target path for this source directory
    // Use the basename of the source directory to avoid conflicts
    const targetPath = resolve(targetDir, basename(sourcePath));

    // Remove existing symlink/file if it exists
    const relativeTargetPath = relative(process.cwd(), targetPath);
    if (existsSync(targetPath)) {
      try {
        unlinkSync(targetPath);
        console.log(`  ↻ ${relativeTargetPath} (updated)`);
      } catch {
        rmSync(targetPath, { recursive: true, force: true });
        console.log(`  ↻ ${relativeTargetPath} (updated)`);
      }
    } else {
      console.log(`  + ${relativeTargetPath}`);
    }

    // Create relative symlink from target directory to source directory
    const relativeSource = relative(targetDir, sourcePath);

    try {
      symlinkSync(relativeSource, targetPath, 'dir');

      // set all files and directories to readonly to prevent accidental or malicious overwrites
      setDirectoryReadonly(sourcePath);

      // count the files in the source directory
      const fileCount = countFilesInDirectory(sourcePath);
      totalFileCount += fileCount;
    } catch (error: any) {
      if (error.code === 'EEXIST') {
        console.log(`  ⚠️  ${relativeTargetPath} already exists (skipped)`);
      } else {
        throw error;
      }
    }
  }

  return totalFileCount;
};
