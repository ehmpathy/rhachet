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
 * .what = recursively sets all files and directories to readonly and executable
 * .why = prevents agents from accidentally or maliciously overwriting linked resources from node_modules, while allowing skills to be executed
 */
const setDirectoryReadonlyExecutable = (dirPath: string): void => {
  const entries = readdirSync(dirPath);

  for (const entry of entries) {
    const fullPath = resolve(dirPath, entry);
    const lstats = lstatSync(fullPath);

    // skip nested symlinks to avoid infinite loops
    if (lstats.isSymbolicLink()) continue;

    if (lstats.isDirectory()) {
      // recurse first, then set directory permissions
      setDirectoryReadonlyExecutable(fullPath);
      // r-x for directories (need execute to traverse)
      chmodSync(fullPath, 0o555);
    } else if (lstats.isFile()) {
      // r-x for files (readonly + executable for skills)
      chmodSync(fullPath, 0o555);
    }
  }

  // set the root directory itself to readonly after processing contents
  chmodSync(dirPath, 0o555);
};

/**
 * .what = creates symlinks for resource directories to a target directory
 * .why = enables role resources (briefs, skills, etc.) to be linked from node_modules or other sources
 * .how =
 *   - single { uri: string }: symlinks the source dir directly as the target dir
 *   - array { uri: string }[]: removes deprecated symlinks, then symlinks each dir within target
 *   - returns count of leaf files
 */
export const symlinkResourceDirectories = (options: {
  sourceDirs: { uri: string } | Array<{ uri: string }>;
  targetDir: string;
  resourceName: string; // e.g., 'briefs', 'skills'
}): number => {
  const { sourceDirs, targetDir, resourceName } = options;

  // handle single-dir mode: symlink source dir directly as target dir
  if (!Array.isArray(sourceDirs)) {
    const sourcePath = resolve(process.cwd(), sourceDirs.uri);

    if (!existsSync(sourcePath)) return 0;

    // remove existing target if present (symlink or directory)
    const relativeTargetPath = relative(process.cwd(), targetDir);
    if (existsSync(targetDir)) {
      try {
        unlinkSync(targetDir);
        console.log(`  ↻ ${relativeTargetPath} (updated)`);
      } catch {
        rmSync(targetDir, { recursive: true, force: true });
        console.log(`  ↻ ${relativeTargetPath} (updated)`);
      }
    } else {
      console.log(`  + ${relativeTargetPath}`);
    }

    // create parent directory if needed
    const targetParent = resolve(targetDir, '..');
    mkdirSync(targetParent, { recursive: true });

    // create relative symlink: targetDir -> sourcePath
    const relativeSource = relative(targetParent, sourcePath);

    symlinkSync(relativeSource, targetDir, 'dir');
    setDirectoryReadonlyExecutable(sourcePath);
    return countFilesInDirectory(sourcePath);
  }

  // handle array-dir mode: symlink each dir within target dir
  // calculate expected symlink names based on source directories
  const expectedNames = new Set(sourceDirs.map((dir) => basename(dir.uri)));

  // remove deprecated symlinks (ones that exist but are no longer in the config)
  if (existsSync(targetDir)) {
    const existingEntries = readdirSync(targetDir);
    for (const entry of existingEntries) {
      if (!expectedNames.has(entry)) {
        const entryPath = resolve(targetDir, entry);
        const relativeEntryPath = relative(process.cwd(), entryPath);
        try {
          unlinkSync(entryPath);
        } catch {
          rmSync(entryPath, { recursive: true, force: true });
        }
        console.log(`  - ${relativeEntryPath} (removed, no longer in role)`);
      }
    }
  }

  if (sourceDirs.length === 0) return 0;

  let totalFileCount = 0;

  for (const sourceDir of sourceDirs) {
    const sourcePath = resolve(process.cwd(), sourceDir.uri);

    if (!existsSync(sourcePath)) continue;

    // create target directory parent if needed
    mkdirSync(targetDir, { recursive: true });

    // create a unique target path for this source directory
    const targetPath = resolve(targetDir, basename(sourcePath));

    // remove existing symlink/file if it exists
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

    // create relative symlink from target directory to source directory
    const relativeSource = relative(targetDir, sourcePath);

    symlinkSync(relativeSource, targetPath, 'dir');
    setDirectoryReadonlyExecutable(sourcePath);
    const fileCount = countFilesInDirectory(sourcePath);
    totalFileCount += fileCount;
  }

  return totalFileCount;
};
