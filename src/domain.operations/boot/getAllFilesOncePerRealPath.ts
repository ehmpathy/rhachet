import { realpathSync } from 'node:fs';

/**
 * .what = the same file list, with each ON-DISK file kept exactly once
 * .why = a dir reachable by two symlink routes yields one file under two paths, and a second
 *        copy of one brief costs its full tokens and counts toward a declared budget's cap.
 *
 * 🔴 .note = the key is `realpathSync`, never the traversal path: two paths that name one
 *   inode are one file.
 *
 * ⚠️ .note = the FIRST path wins, and the caller sorts before it calls, so the survivor is
 *   deterministic (`rule.require.snapshot-verified-on-independent-run`). the survivor keeps
 *   its own path, which stays inside the role's tree where its realpath may not.
 */
export const getAllFilesOncePerRealPath = (input: {
  files: string[];
}): string[] => {
  // 🟡 .note = DELIBERATE MUTATION — `seen` grows inside the filter callback. the dedupe keeps
  //   the FIRST path per identity, so the result depends on the order the list is walked; the
  //   set is scoped to this body and never escapes
  const seen = new Set<string>();

  return input.files.filter((path) => {
    // 🔴 .note = an `ENOENT` keeps the file under its own path, so the downstream read raises
    //   its classified refusal (`readOneSayResource`) and the count never shrinks in silence.
    //   any other errno escapes unchanged.
    const identity = ((): string => {
      try {
        return realpathSync(path);
      } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        return path;
      }
    })();

    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
};
