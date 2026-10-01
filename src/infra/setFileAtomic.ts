import { randomBytes } from 'node:crypto';
import { mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

/**
 * .what = write a file whole, via a temp file in the same dir then a rename
 * .why = a reader never sees a partial file, and two racers each land one whole
 *        content — rename is atomic on posix within one filesystem
 * .note = options.mode sets the permission bits the file lands with (e.g. 0o600 for a
 *        credential); the temp file is created fresh, so the mode applies from birth
 */
export const setFileAtomic = (
  input: { path: string; content: string },
  options?: { mode?: number },
): void => {
  // the temp file sits beside the target, so the rename never crosses a filesystem
  const dir = dirname(input.path);
  mkdirSync(dir, { recursive: true });
  const pathTemp = join(
    dir,
    `.${basename(input.path)}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`,
  );

  // write the temp, then swap it in; drop the temp if the swap fails
  // an absent mode falls to node's default (0o666, less the umask)
  writeFileSync(pathTemp, input.content, {
    encoding: 'utf8',
    mode: options?.mode,
  });
  try {
    renameSync(pathTemp, input.path);
  } catch (error) {
    rmSync(pathTemp, { force: true });
    throw error;
  }
};
