import { lstatSync, rmSync, symlinkSync, unlinkSync } from 'node:fs';
import { relative, resolve } from 'node:path';

/**
 * .what = creates or updates a symlink to a single file
 * .why = enables idempotent symlink creation for role files (readme, boot, keyrack)
 */
export const symlinkFile = (input: {
  sourcePath: string;
  targetPath: string;
}): { status: 'created' | 'updated' } => {
  const { sourcePath, targetPath } = input;

  // resolve to absolute paths
  const sourceAbsolute = resolve(process.cwd(), sourcePath);
  const targetAbsolute = resolve(process.cwd(), targetPath);

  // check if target already present (lstatSync detects broken symlinks, existsSync does not)
  const hadTargetBefore = (() => {
    try {
      lstatSync(targetAbsolute);
      return true;
    } catch (error: unknown) {
      // ENOENT = file does not exist, which is expected
      const code = (error as { code?: string })?.code;
      if (code === 'ENOENT') return false;
      throw error; // rethrow unexpected errors
    }
  })();

  // remove prior target if present (handles both files and broken symlinks)
  if (hadTargetBefore) {
    try {
      unlinkSync(targetAbsolute);
    } catch (error: unknown) {
      // unlink may fail on directories; fallback to rmSync
      const code = (error as { code?: string })?.code;
      if (code === 'EISDIR') {
        rmSync(targetAbsolute, { force: true });
      } else {
        throw error; // rethrow unexpected errors
      }
    }
  }

  // create relative symlink from target directory to source file
  const targetDir = resolve(targetAbsolute, '..');
  const relativeSource = relative(targetDir, sourceAbsolute);
  symlinkSync(relativeSource, targetAbsolute, 'file');

  return { status: hadTargetBefore ? 'updated' : 'created' };
};
