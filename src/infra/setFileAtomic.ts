import { randomBytes } from 'node:crypto';
import { mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

/**
 * .what = write a file whole, via a temp file in the same dir then a rename
 * .why = a reader never sees a partial file, and two racers each land one whole
 *        content — rename is atomic on posix within one filesystem
 */
export const setFileAtomic = (input: {
  path: string;
  content: string;
}): void => {
  // the temp file sits beside the target, so the rename never crosses a filesystem
  const dir = dirname(input.path);
  mkdirSync(dir, { recursive: true });
  const pathTemp = join(
    dir,
    `.${basename(input.path)}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`,
  );

  // write the temp, then swap it in; drop the temp if the swap fails
  writeFileSync(pathTemp, input.content, 'utf8');
  try {
    renameSync(pathTemp, input.path);
  } catch (error) {
    rmSync(pathTemp, { force: true });
    throw error;
  }
};
