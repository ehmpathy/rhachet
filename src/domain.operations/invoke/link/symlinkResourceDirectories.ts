import type { ContextCli } from '@src/domain.objects/ContextCli';

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
import type { LinkResult } from './findsertFile';
import { isPathWithinGitroot } from './isPathWithinGitroot';

/**
 * .what = recursively counts all leaf files in a directory
 * .why = to provide accurate file counts when linking directories
 */
const countFilesInDirectory = (input: { dirPath: string }): number => {
  const { dirPath } = input;
  let count = 0;
  const entries = readdirSync(dirPath);

  for (const entry of entries) {
    const fullPath = resolve(dirPath, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      count += countFilesInDirectory({ dirPath: fullPath });
    } else if (stats.isFile()) {
      count++;
    }
  }

  return count;
};

/**
 * .what = recursively sets all files and directories to readonly and executable
 * .why = prevents agents from accidental or malicious overwrites of linked resources from node_modules, while skills remain executable
 */
const setDirectoryReadonlyExecutable = (input: { dirPath: string }): void => {
  const { dirPath } = input;
  const entries = readdirSync(dirPath);

  for (const entry of entries) {
    const fullPath = resolve(dirPath, entry);
    const lstats = lstatSync(fullPath);

    // skip nested symlinks to avoid infinite loops
    if (lstats.isSymbolicLink()) continue;

    if (lstats.isDirectory()) {
      // recurse first, then set directory permissions
      setDirectoryReadonlyExecutable({ dirPath: fullPath });
      // r-x for directories (need execute to traverse)
      chmodSync(fullPath, 0o555);
    } else if (lstats.isFile()) {
      // r-x for files (readonly + executable for skills)
      chmodSync(fullPath, 0o555);
    }
  }

  // set the root directory itself to readonly after contents processed
  chmodSync(dirPath, 0o555);
};

/**
 * .what = recursively adds executable bit to all files (other permissions preserved)
 * .why = enables skills to be executed for sources within gitroot, without change to write permissions
 */
const addExecutableBit = (input: { dirPath: string }): void => {
  const { dirPath } = input;
  const entries = readdirSync(dirPath);

  for (const entry of entries) {
    const fullPath = resolve(dirPath, entry);
    const lstats = lstatSync(fullPath);

    // skip nested symlinks to avoid infinite loops
    if (lstats.isSymbolicLink()) continue;

    if (lstats.isDirectory()) {
      // recurse into subdirectories
      addExecutableBit({ dirPath: fullPath });
      // add execute bit to directory (need execute to traverse)
      // eslint-disable-next-line no-bitwise
      chmodSync(fullPath, (lstats.mode & 0o777) | 0o111);
    } else if (lstats.isFile()) {
      // add execute bit to file (for skills)
      // eslint-disable-next-line no-bitwise
      chmodSync(fullPath, (lstats.mode & 0o777) | 0o111);
    }
  }

  // add execute bit to root directory after contents processed
  const dirStats = lstatSync(dirPath);
  // eslint-disable-next-line no-bitwise
  chmodSync(dirPath, (dirStats.mode & 0o777) | 0o111);
};

/**
 * .what = remove path if it exists (symlink, file, or directory)
 * .why = upsert semantics - always succeed even if target already exists, including broken symlinks
 */
const clearPath = (input: { targetPath: string }): 'updated' | 'created' => {
  const { targetPath } = input;
  const lstats = (() => {
    try {
      return lstatSync(targetPath);
    } catch (error: any) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  })();

  if (!lstats) return 'created';

  try {
    unlinkSync(targetPath);
  } catch {
    rmSync(targetPath, { recursive: true, force: true });
  }
  return 'updated';
};

/**
 * .what = create a symlink from targetPath to sourcePath, clear existing
 * .why = shared logic for both single-dir and array-dir modes
 */
const linkSourceToTarget = (
  input: {
    sourcePath: string;
    targetPath: string;
  },
  context: ContextCli,
): { fileCount: number; result: LinkResult } => {
  const { sourcePath, targetPath } = input;
  const relativeTargetPath = relative(process.cwd(), targetPath);
  const action = clearPath({ targetPath });

  // create parent directory if needed
  const targetParent = resolve(targetPath, '..');
  mkdirSync(targetParent, { recursive: true });

  // create relative symlink
  const relativeSource = relative(targetParent, sourcePath);
  symlinkSync(relativeSource, targetPath, 'dir');

  // set permissions based on source location
  const sourceIsWithinRepo = isPathWithinGitroot({ path: sourcePath }, context);
  if (!sourceIsWithinRepo) {
    // readonly + executable for external sources (node_modules)
    setDirectoryReadonlyExecutable({ dirPath: sourcePath });
  }
  if (sourceIsWithinRepo) {
    // add executable bit for internal sources (keep skills executable)
    addExecutableBit({ dirPath: sourcePath });
  }

  const fileCount = countFilesInDirectory({ dirPath: sourcePath });

  return {
    fileCount,
    result: {
      path: relativeTargetPath,
      status: action === 'updated' ? 'updated' : 'created',
    },
  };
};

export type SymlinkResourceResult = {
  fileCount: number;
  results: LinkResult[];
};

/**
 * .what = creates symlinks for resource directories to a target directory
 * .why = enables role resources (briefs, skills, etc.) to be linked from node_modules or other sources
 * .how =
 *   - single { uri: string }: symlinks the source dir directly as the target dir
 *   - array { uri: string }[]: removes deprecated symlinks, then symlinks each dir within target
 *   - returns count of leaf files and link results
 */
export const symlinkResourceDirectories = (
  options: {
    sourceDirs: { uri: string } | Array<{ uri: string }>;
    targetDir: string;
    resourceName: string; // e.g., 'briefs', 'skills'
  },
  context: ContextCli,
): SymlinkResourceResult => {
  const { sourceDirs, targetDir } = options;
  const results: LinkResult[] = [];

  // single-dir mode: symlink source dir directly as target dir
  if (!Array.isArray(sourceDirs)) {
    const sourcePath = resolve(process.cwd(), sourceDirs.uri);
    if (!existsSync(sourcePath)) return { fileCount: 0, results: [] };
    const { fileCount, result } = linkSourceToTarget(
      {
        sourcePath,
        targetPath: targetDir,
      },
      context,
    );
    return { fileCount, results: [result] };
  }

  // array-dir mode: symlink each source dir within target dir
  // remove deprecated symlinks (ones that exist but are no longer in the config)
  const expectedNames = new Set(sourceDirs.map((dir) => basename(dir.uri)));
  if (existsSync(targetDir)) {
    for (const entry of readdirSync(targetDir)) {
      if (expectedNames.has(entry)) continue;
      const entryPath = resolve(targetDir, entry);
      clearPath({ targetPath: entryPath });
      results.push({
        path: relative(process.cwd(), entryPath),
        status: 'removed',
      });
    }
  }

  // create symlinks for each source dir
  let totalFileCount = 0;
  for (const sourceDir of sourceDirs) {
    const sourcePath = resolve(process.cwd(), sourceDir.uri);
    if (!existsSync(sourcePath)) continue;
    const targetPath = resolve(targetDir, basename(sourcePath));
    const { fileCount, result } = linkSourceToTarget(
      {
        sourcePath,
        targetPath,
      },
      context,
    );
    totalFileCount += fileCount;
    results.push(result);
  }
  return { fileCount: totalFileCount, results };
};
