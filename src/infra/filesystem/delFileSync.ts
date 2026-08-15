import { unlinkSync } from 'node:fs';

/**
 * .what = remove a file if present, synchronously
 * .why = "delete, and treat absence as success" is the one shape several lifecycle
 *        paths need — the keyrack daemon unlinks its socket + pid files on SIGTERM,
 *        on self-exit, on kill, and before a bind; the clone unlinks its socket
 *        before a bind and on reap. each site had hand-rolled it, so it lives here
 *        as one shared primitive
 *
 * .note = the ENOENT allowlist is the whole point. a caller that races another
 *         cleanup finds the file already gone, which is the normal path and not a
 *         fault. every OTHER code surfaces — an EACCES leaves a file behind that a
 *         next run would misread, so it must fail loud
 * .note = deliberately NOT guarded by existsSync. a guard would swallow every stat
 *         error, so an EACCES would read as "no file here" and this allowlist would
 *         never see it — the exact failhide the allowlist exists to close, moved one
 *         line earlier. it is also a TOCTOU race the unlink does not have
 */
export const delFileSync = (input: { path: string }): void => {
  try {
    unlinkSync(input.path);
  } catch (error) {
    // allow expected errors: ENOENT = already absent, which is the desired end state
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
};
