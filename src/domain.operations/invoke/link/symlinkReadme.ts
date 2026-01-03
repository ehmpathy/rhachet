import { lstatSync, rmSync, symlinkSync, unlinkSync } from 'node:fs';
import { relative, resolve } from 'node:path';

/**
 * .what = creates or updates a symlink to a readme file
 * .why = enables idempotent symlink creation for role and repo readme files
 */
export const symlinkReadme = (input: {
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
    } catch {
      return false;
    }
  })();

  // remove prior target if present (handles both files and broken symlinks)
  if (hadTargetBefore) {
    try {
      unlinkSync(targetAbsolute);
    } catch {
      rmSync(targetAbsolute, { force: true });
    }
  }

  // create relative symlink from target directory to source file
  const targetDir = resolve(targetAbsolute, '..');
  const relativeSource = relative(targetDir, sourceAbsolute);
  symlinkSync(relativeSource, targetAbsolute, 'file');

  return { status: hadTargetBefore ? 'updated' : 'created' };
};
