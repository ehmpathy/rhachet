import { ConstraintError } from 'helpful-errors';

import { lstatSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * .what = the refusal for a path that vanished mid-walk
 * .why = a skip would hand back a short list, and the walk feeds a budget gate count
 */
const asWalkVanishRefusal = (input: { path: string }): Error =>
  new ConstraintError('a file vanished during the walk', {
    path: input.path,
    why: 'the path was found on the walk, then removed or relinked',
    fix: 're-run — a settled tree walks cleanly',
  });

/**
 * .what = whether a dir is genuinely present: absent on ENOENT, or on ENOTDIR where a parent
 *   component is a regular file
 * .why = extracted so the descent below stays under the complexity cap. `statSync` with
 *   `throwIfNoEntry: false` reports both of those errnos as `undefined`
 *   (define.statsync-and-lstatsync-suppress-different-errnos), so a path through a file lands
 *   on the same absence branch as a path that names naught. a permission wall (EACCES/EPERM)
 *   still throws unclassified rather than undercount the walk, which sits on a budget gate
 *   denominator (rule.forbid.failhide)
 */
const isDirPresent = (input: { dir: string }): boolean =>
  statSync(input.dir, { throwIfNoEntry: false }) !== undefined;

/**
 * .what = recursively collects all files from a directory, follows symlinks
 * .why = shared utility for role directory traversal with symlinked briefs/skills
 *
 * note a BROKEN SYMLINK is skipped; a VANISHED ENTRY is REFUSED. both raise ENOENT from the
 *   same statSync, and lstatSync is what parts them — see the entry loop. a shorter list
 *   is an UNDERCOUNT, and genBootPayload is a budget gate, so a silent skip could pass an
 *   over-budget boot. case5 clamps that a stale link still skips.
 *
 * note a dir that vanishes between the top existence probe and realpathSync/readdirSync is
 *   refused the same way, so every vanish on the walk fails loud with one message.
 *
 * note the walk follows symlinks, so it MUST carry a cycle guard: without one the kernel
 *   throws ELOOP at about 40 hops — an unclassified crash, exit 1, for a caller-fixable
 *   input. this repo reaches it — package.json ships a self-link, so node_modules/rhachet
 *   points back at the root and a root-level manifest walk could loop forever.
 *
 * note the guard keys on realpathSync, never the traversal path — two paths that resolve to
 *   one inode are the SAME dir, and a path-keyed set reads them as two.
 *
 * note the guard tracks the ANCESTOR CHAIN of the current descent, never every dir visited.
 *   a cycle is this dir is already its own ancestor; a dir reachable by two peer routes is
 *   a dag, and an ever-visited set would collapse it to one route.
 */
export const getAllFilesFromDir = (
  input: { dir: string },
  options?: {
    /**
     * .what = entry names the walk never descends into (e.g. `node_modules`, `.git`)
     * .note = matched on the ENTRY name, so a root that itself sits under such a dir still walks
     */
    skipDirNames?: string[];
  },
): string[] =>
  getAllFilesWithinDescent({
    dir: input.dir,
    ancestors: new Set(),
    skipDirNames: new Set(options?.skipDirNames ?? []),
  });

/**
 * .what = the recursive descent behind getAllFilesFromDir, which carries the cycle guard
 * .why = the ancestor chain is recursion state, so it stays off the public contract
 */
const getAllFilesWithinDescent = (input: {
  dir: string;

  /**
   * .what = the realpaths of the dirs this descent passed through to reach dir
   */
  ancestors: Set<string>;

  /**
   * .what = entry names this descent never enters
   */
  skipDirNames: Set<string>;
}): string[] => {
  const { dir, ancestors, skipDirNames } = input;

  // skip if directory is genuinely absent — never on any OTHER fault, which rethrows
  // unclassified rather than undercount this walk (see isDirPresent)
  if (!isDirPresent({ dir })) return [];

  // read the inode this path names
  //
  // note the top probe already filtered genuine absence, so an ENOENT here is a vanish
  //   race — refused, exactly as a vanished ENTRY is, since a skip would undercount the walk
  const dirReal = ((): string => {
    try {
      return realpathSync(dir);
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      throw asWalkVanishRefusal({ path: dir });
    }
  })();

  // the cycle guard. a dir that is already its own ancestor closes a loop, so the descent
  // stops here rather than hops until the kernel refuses
  if (ancestors.has(dirReal)) return [];

  // the chain handed to the children — a fresh set per descent, so a sibling branch that
  // reaches the same dir by another route is untouched by this one
  const ancestorsWithin = new Set(ancestors).add(dirReal);

  // the dir open answers two faults differently, and each is narrowed to one errno
  // (rule.forbid.failhide — a permission or i/o fault escapes unchanged either way):
  //
  //   ENOENT  the dir passed the probes above and vanished before the open —
  //           a removal, a rename, or a relink in that window. refused, as above
  //
  //   ENOTDIR  dir IS A FILE. it exists and it realpaths, so neither guard above catches
  //   it, and node raises a bare Error — which carries no exit classification and lands on
  //   the default exit 1, so a CALLER-fixable path reads as a server malfunction.
  const entries = ((): string[] => {
    try {
      return readdirSync(dir);
    } catch (error: unknown) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') throw asWalkVanishRefusal({ path: dir });
      if (code === 'ENOTDIR')
        throw new ConstraintError('a walk was pointed at a file', {
          path: dir,
          expected: 'a directory to walk',
          found: 'a regular file',
          fix: 'point the walk at a directory, or rename the file that sits at this path',
        });
      throw error;
    }
  })();

  // ⚠️ .note = DELIBERATE MUTATION — files grows across the entry loop and the recursion
  //   1. the accumulation spans a RECURSIVE descent, so there is no fixed sequence to reduce
  //      over: each child contribution is itself computed by this same walk
  //   2. the scope is this invocation body, and the value escapes only as the return, so no
  //      caller observes a partial accumulation
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = resolve(dir, entry);

    // an ENOENT here has TWO causes, and they owe opposite answers:
    //
    //      a BROKEN SYMLINK — the entry is present, its target is not. a stale link is a
    //        normal state of a linked-role tree, so it is skipped
    //
    //      a VANISHED ENTRY — the entry the parent just enumerated is gone, so it is
    //        refused. a silent skip is an UNDERCOUNT, and a payload measured over a
    //        silently-emptied tree can pass the very over-budget boot the gate exists to
    //        refuse
    //
    // lstatSync parts them exactly: it stats the link itself rather than its target, so
    //   a broken symlink lstats cleanly while an entry truly gone raises ENOENT again.
    const stats = ((): ReturnType<typeof statSync> | null => {
      try {
        return statSync(fullPath);
      } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;

        // the entry itself is still here, so its TARGET is what is absent — a broken symlink
        const isEntryPresent = ((): boolean => {
          try {
            lstatSync(fullPath);
            return true;
          } catch (errorLstat: unknown) {
            if ((errorLstat as NodeJS.ErrnoException).code !== 'ENOENT')
              throw errorLstat;
            return false;
          }
        })();
        if (isEntryPresent) return null;

        throw asWalkVanishRefusal({ path: fullPath });
      }
    })();

    // a broken symlink is skipped
    if (!stats) continue;

    // a file is collected as is
    if (stats.isFile()) {
      files.push(fullPath);
      continue;
    }

    // aught else that is not a dir (a socket, a fifo) is not part of the walk
    if (!stats.isDirectory()) continue;

    // a dir on the skip list is never entered — matched on the entry name, per the contract
    if (skipDirNames.has(entry)) continue;

    // a dir is descended into
    files.push(
      ...getAllFilesWithinDescent({
        dir: fullPath,
        ancestors: ancestorsWithin,
        skipDirNames,
      }),
    );
  }

  return files;
};
