import { randomBytes } from 'node:crypto';
import { renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

/**
 * .what = write a file atomically — content lands whole or not at all
 * .why = a plain writeFileSync truncates-then-writes: a crash mid-write leaves a
 *        half-written file. for a keyrack manifest or an os.secure blob that is a
 *        brick — a partial ciphertext no identity can open. a write to a temp file
 *        beside it, then a rename over the target, makes the swap atomic (rename is
 *        atomic within a filesystem on posix), so a crash leaves EITHER the prior
 *        whole file OR the new whole file, never a torn one
 *
 * .note = the mode is applied to the temp file BEFORE the rename, so the target is
 *         never briefly world-readable — the 0o600 secret-file permission holds for
 *         the entire visible lifetime of the target path
 * .note = the temp file sits in the SAME directory as the target so the rename stays
 *         within one filesystem (a cross-device rename is not atomic and would throw)
 * .note = the temp name folds in the TARGET basename + random bytes, so two different
 *         targets in one dir written by the same process in the same millisecond cannot
 *         collide onto one temp path — the primitive is safe even if a future caller
 *         re-keys os.secure blobs in parallel (today's sole caller loops sequentially)
 */
export const setFileAtomic = (input: {
  path: string;
  content: string;
  mode: number;
}): void => {
  const dir = dirname(input.path);

  // a temp path beside the target → the rename stays intra-filesystem (atomic). the name
  // carries the target basename + random bytes so concurrent writes of DIFFERENT targets
  // in this dir can never collide onto the same temp path (see .note)
  const pathTemp = join(
    dir,
    `.${basename(input.path)}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`,
  );

  // write the whole content to the temp file, with the target's mode set up-front
  try {
    writeFileSync(pathTemp, input.content, {
      encoding: 'utf8',
      mode: input.mode,
    });
  } catch (error) {
    // a failed write may leave a stray temp file — remove it so it never lingers
    try {
      unlinkSync(pathTemp);
    } catch {
      // the temp file was never created; the original error is the one that matters
    }
    throw error;
  }

  // atomically swap the whole temp file over the target — the crash-safe moment
  renameSync(pathTemp, input.path);
};
