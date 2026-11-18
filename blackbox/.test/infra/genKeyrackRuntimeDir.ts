import { ConstraintError } from 'helpful-errors';

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * .what = the byte cap a unix socket address may hold — `sockaddr_un.sun_path`
 * .note = 108 on linux, 104 on darwin/bsd; the smaller is taken
 */
const SUN_PATH_MAX_BYTES = 104;

/**
 * .what = the longest daemon socket filename the keyrack mints under its runtime dir
 * .note = `keyrack.<sessionid>.<homehash>.<owner>.sock`, at a 10-digit session id and a
 *   generous 24-char owner
 */
const SOCKET_FILENAME_MAX_BYTES = 'keyrack.0000000000.00000000..sock'.length + 24;

/**
 * .what = a short `XDG_RUNTIME_DIR` for a test's keyrack daemon, whose files land in the
 *         test's own temp dir
 * .why = a temp dir path runs past `sun_path`, so a daemon socket under it is refused at
 *        connect (`EINVAL`) on node 24, where node 22 truncated the address in silence.
 *        the returned path is a short symlink in the host's runtime base that points at
 *        `<dir>/.xdg-runtime`, so the socket address fits and the socket file stays with
 *        the test
 *
 * .note = the link name is a hash of the dir, so one dir maps to one link, and a re-call is
 *   a findsert
 * .note = the base is the host's runtime dir where it exists, else the os temp dir; both are
 *   short, and a link left after the temp dir is gone dangles harmlessly in tmpfs
 */
export const genKeyrackRuntimeDir = (input: { dir: string }): string => {
  // the real dir, inside the test's temp dir
  const dirReal = join(input.dir, '.xdg-runtime');
  mkdirSync(dirReal, { recursive: true, mode: 0o700 });

  // the short link, in the host's runtime base
  const uid = process.getuid?.();
  const baseRuntime =
    process.env['XDG_RUNTIME_DIR'] ??
    (uid === undefined ? null : `/run/user/${uid}`);
  const base =
    baseRuntime !== null && existsSync(baseRuntime) ? baseRuntime : tmpdir();
  const slug = createHash('sha256').update(input.dir).digest('hex').slice(0, 8);
  const dirLink = join(base, `rk.${slug}`);
  if (!existsSync(dirLink)) symlinkSync(dirReal, dirLink, 'dir');

  // the address must fit, or the daemon fails with EINVAL rather than a named cause
  const bytesSocketMax =
    Buffer.byteLength(dirLink) + 1 + SOCKET_FILENAME_MAX_BYTES;
  if (bytesSocketMax > SUN_PATH_MAX_BYTES)
    throw new ConstraintError(
      'the keyrack test runtime dir is too long for a unix socket address',
      {
        dirLink,
        bytesSocketMax,
        cap: SUN_PATH_MAX_BYTES,
        hint: `set XDG_RUNTIME_DIR to a dir shorter than ${base}`,
      },
    );

  return dirLink;
};
