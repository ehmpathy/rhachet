import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * .what = the in-process callers that share one `within` dir, and the highest dir the first of
 *         them created
 * .why = the last caller out removes what the first caller in created, whichever returns last
 *
 * .note = deliberate mutation: a process-wide refcount, touched only at entry and exit
 */
const holdersByWithin = new Map<
  string,
  { count: number; createdRoot: string | null }
>();

/**
 * .what = run logic against a fresh dir inside a caller-named dir of the repo, then remove it
 * .why = a render that must land on disk to be read back (e.g. an adapter that only writes a
 *        settings file) stays inside the repo (rule.forbid.reads-outside-the-repo) and leaves
 *        no trace once it returns
 *
 * .note = the dir ignores itself (`.gitignore` = `*`), so git never sees it, with no reach into
 *   any other context's gitignore policy
 * .note = the dir is removed whether the logic returns or throws. the parents a call created
 *   are removed by the last in-process caller out, and only while empty — so a concurrent
 *   caller's scratch dir is never touched, in this process or another
 */
export const withScratchDir = async <T>(
  input: { within: string; prefix: string },
  logic: (scratchDir: string) => Promise<T>,
): Promise<T> => {
  // join the holders of this parent; the first one in creates it and remembers what it created
  const held = holdersByWithin.get(input.within);
  const createdRoot =
    held?.createdRoot ?? getHighestAbsentAncestor({ path: input.within });
  if (!held && createdRoot) mkdirSync(input.within, { recursive: true });
  holdersByWithin.set(input.within, {
    count: (held?.count ?? 0) + 1,
    createdRoot,
  });

  // a fresh dir that git ignores by its own declaration
  const scratchDir = mkdtempSync(join(input.within, input.prefix));
  writeFileSync(join(scratchDir, '.gitignore'), '*\n');

  try {
    return await logic(scratchDir);
  } finally {
    rmSync(scratchDir, { recursive: true, force: true });

    // leave the holders; the last one out removes the created parents, while empty
    const holders = holdersByWithin.get(input.within);
    const countLeft = (holders?.count ?? 1) - 1;
    if (countLeft > 0)
      holdersByWithin.set(input.within, {
        count: countLeft,
        createdRoot: holders?.createdRoot ?? null,
      });
    if (countLeft <= 0) holdersByWithin.delete(input.within);
    if (countLeft <= 0 && createdRoot)
      delDirsWhileEmpty({ from: input.within, until: createdRoot });
  }
};

/**
 * .what = the highest ancestor of a path (the path included) that does not exist, or null
 * .why = a mkdir -p creates every absent ancestor; this names the one to remove so that all of
 *        them go
 */
const getHighestAbsentAncestor = (input: { path: string }): string | null => {
  if (existsSync(input.path)) return null;
  const parent = dirname(input.path);
  if (parent === input.path) return input.path;
  return getHighestAbsentAncestor({ path: parent }) ?? input.path;
};

/**
 * .what = remove `from`, then each parent up to `until` inclusive, while each is empty
 * .why = a dir another caller still writes into is not empty, so it stays; the climb stops there
 *
 * .note = `rmdirSync` refuses a dir that is not empty (ENOTEMPTY / EEXIST) — that is the stop
 *   signal, never a fault. a dir already gone (ENOENT) was removed by a peer; climb on
 */
const delDirsWhileEmpty = (input: { from: string; until: string }): void => {
  try {
    rmdirSync(input.from);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOTEMPTY' || code === 'EEXIST') return;
    if (code !== 'ENOENT') throw error;
  }
  if (input.from === input.until) return;
  delDirsWhileEmpty({ from: dirname(input.from), until: input.until });
};
