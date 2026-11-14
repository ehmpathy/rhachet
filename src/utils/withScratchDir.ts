import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * .what = run logic against a fresh dir inside a caller-named dir of the repo, then remove it
 * .why = a render that must land on disk to be read back (e.g. an adapter that only writes a
 *        settings file) stays inside the repo (rule.forbid.reads-outside-the-repo) and leaves
 *        no trace once it returns
 *
 * .note = the dir ignores itself (`.gitignore` = `*`), so git never sees it, with no reach into
 *   any other context's gitignore policy
 * .note = the dir is removed whether the logic returns or throws; a parent this call created is
 *   removed too, so a repo that held no `within` dir before holds none after
 */
export const withScratchDir = async <T>(
  input: { within: string; prefix: string },
  logic: (scratchDir: string) => Promise<T>,
): Promise<T> => {
  // create the parent only if absent, and remember the highest dir this call created
  const createdRoot = getHighestAbsentAncestor({ path: input.within });
  if (createdRoot) mkdirSync(input.within, { recursive: true });

  // a fresh dir that git ignores by its own declaration
  const scratchDir = mkdtempSync(join(input.within, input.prefix));
  writeFileSync(join(scratchDir, '.gitignore'), '*\n');

  try {
    return await logic(scratchDir);
  } finally {
    rmSync(scratchDir, { recursive: true, force: true });
    if (createdRoot) rmSync(createdRoot, { recursive: true, force: true });
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
