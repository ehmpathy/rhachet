import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * .what = run logic against a fresh dir inside a caller-named dir of the repo, then remove it
 * .why = a render that must land on disk to be read back (e.g. an adapter that only writes a
 *        settings file) stays inside the repo (rule.forbid.reads-outside-the-repo) and leaves
 *        no file once it returns
 *
 * .note = the dir ignores itself (`.gitignore` = `*`), so git never sees it, with no reach into
 *   any other context's gitignore policy
 * .note = only the scratch dir is removed, whether the logic returns or throws. its parents
 *   stay: an empty dir is invisible to git, and a parent another caller (in this process or
 *   another) still writes into must never be removed under it
 */
export const withScratchDir = async <T>(
  input: { within: string; prefix: string },
  logic: (scratchDir: string) => Promise<T>,
): Promise<T> => {
  // a fresh dir that git ignores by its own declaration
  mkdirSync(input.within, { recursive: true });
  const scratchDir = mkdtempSync(join(input.within, input.prefix));

  try {
    writeFileSync(join(scratchDir, '.gitignore'), '*\n');
    return await logic(scratchDir);
  } finally {
    rmSync(scratchDir, { recursive: true, force: true });
  }
};
