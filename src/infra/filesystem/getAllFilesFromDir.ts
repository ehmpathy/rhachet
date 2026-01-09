import { existsSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * .what = recursively collects all files from a directory, follows symlinks
 * .why = shared utility for role directory traversal with symlinked briefs/skills
 * .note = gracefully skips broken symlinks (ENOENT) to avoid crash on stale links
 */
export const getAllFilesFromDir = (dir: string): string[] => {
  // skip if directory does not exist
  if (!existsSync(dir)) return [];

  const entries = readdirSync(dir);
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = resolve(dir, entry);

    // skip broken symlinks gracefully
    let stats: ReturnType<typeof statSync>;
    try {
      stats = statSync(fullPath);
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
      throw error;
    }

    if (stats.isDirectory()) {
      files.push(...getAllFilesFromDir(fullPath));
    } else if (stats.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
};
