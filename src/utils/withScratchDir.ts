import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * .what = run logic against a fresh dir in the os temp root, then remove the dir
 * .why = a render that must land on disk to be read back (e.g. an adapter that only writes a
 *        settings file) leaves no trace — not in the repo, not in the temp root
 *
 * .note = the dir is removed whether the logic returns or throws
 */
export const withScratchDir = async <T>(
  input: { prefix: string },
  logic: (scratchDir: string) => Promise<T>,
): Promise<T> => {
  const scratchDir = mkdtempSync(join(tmpdir(), input.prefix));
  try {
    return await logic(scratchDir);
  } finally {
    rmSync(scratchDir, { recursive: true, force: true });
  }
};
