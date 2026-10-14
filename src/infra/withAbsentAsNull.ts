/**
 * .what = run a filesystem read, or null when its path is absent
 * .why = one read in place of a probe and a read, so no peer can remove the path between the
 *   two and turn a benign absence into a thrown ENOENT
 *
 * .note = only the absent errnos (ENOENT, ENOTDIR) read as null; every other surfaces
 */
export const withAbsentAsNull = <T>(input: { read: () => T }): T | null => {
  try {
    return input.read();
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code;
    if (code === 'ENOENT' || code === 'ENOTDIR') return null;
    throw error;
  }
};
